package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/MihoZaki/DzTech/db"
	"github.com/MihoZaki/DzTech/internal/config"
	"github.com/MihoZaki/DzTech/internal/router"
	"github.com/redis/go-redis/v9"
)

type Server struct {
	httpServer  *http.Server
	cfg         *config.Config
	redisClient *redis.Client
}

func New(cfg *config.Config) *Server {
	// Initialize database first
	if err := db.Init(); err != nil {
		slog.Error("Failed to initialize database", "error", err)
		panic(fmt.Sprintf("failed to initialize database: %v", err))
	}

	// Run migrations
	if err := db.RunMigrations(); err != nil {
		slog.Error("Failed to run migrations", "error", err)
		panic(fmt.Sprintf("failed to run migrations: %v", err))
	}

	// Double-check that the pool is initialized
	pool := db.GetPool()
	if pool == nil {
		panic("database pool is nil after initialization")
	}
	// --- Initialize Redis Client ---
	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisHost + ":" + cfg.RedisPort,
		Password: cfg.RedisPassword, // no password set
		DB:       cfg.RedisDB,       // use default DB
	})

	// Test the Redis connection
	ctx := context.Background()
	pong, err := redisClient.Ping(ctx).Result()
	if err != nil {
		slog.Error("Failed to connect to Redis", "error", err)
		panic(fmt.Sprintf("failed to connect to Redis: %v", err)) // Panic if Redis connection fails
	}
	slog.Info("Connected to Redis", "pong", pong)

	httpRouter := router.New(cfg, redisClient)

	return &Server{
		httpServer: &http.Server{
			Addr:    ":" + cfg.ServerPort,
			Handler: httpRouter,
		},
		cfg:         cfg,
		redisClient: redisClient,
	}
}

func (s *Server) Start() error {
	// Start server in a goroutine
	go func() {
		slog.Info("Server starting", "port", s.cfg.ServerPort)
		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server failed to start", "error", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := s.httpServer.Shutdown(ctx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
		return err
	}

	slog.Info("Server exited")
	return nil
}

func (s *Server) Stop() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Shutdown HTTP server first
	httpErr := s.httpServer.Shutdown(ctx)

	// Close Redis client
	redisErr := s.redisClient.Close()

	// Return the first error encountered (preferably the HTTP shutdown error)
	if httpErr != nil {
		return httpErr
	}
	return redisErr // Return Redis close error if HTTP shutdown was successful
}
