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
)

type Server struct {
	httpServer *http.Server
	cfg        *config.Config
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

	// Initialize router after database is ready
	routerCfg := &router.Config{
		JWTSecret: cfg.JWTSecret,
	}
	httpRouter := router.New(routerCfg)

	return &Server{
		httpServer: &http.Server{
			Addr:    ":" + cfg.ServerPort,
			Handler: httpRouter,
		},
		cfg: cfg,
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
	return s.httpServer.Shutdown(ctx)
}
