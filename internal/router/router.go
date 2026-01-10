package router

import (
	"log/slog"
	"net/http"

	"github.com/MihoZaki/DzTech/db"
	db_queries "github.com/MihoZaki/DzTech/internal/db" // SQLC generated code
	"github.com/MihoZaki/DzTech/internal/handlers"
	"github.com/MihoZaki/DzTech/internal/middleware"
	"github.com/MihoZaki/DzTech/internal/services"
	"github.com/go-chi/chi/v5"
)

func New(cfg *Config) http.Handler {
	r := chi.NewRouter()

	// Apply middleware
	middleware.ApplyMiddleware(r)

	// Health check endpoint
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Get the database pool from the db package
	pool := db.GetPool()
	if pool == nil {
		slog.Error("Database pool is not initialized")
		panic("database pool is not initialized")
	}

	// Initialize database querier (using SQLC generated code)
	querier := db_queries.New(pool)

	// Initialize services
	userService := services.NewUserService(querier)
	productService := services.NewProductService(querier)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService, cfg.JWTSecret)
	r.Route("/auth", func(r chi.Router) {
		authHandler.RegisterRoutes(r)
	})
	// Product routes
	productHandler := handlers.NewProductHandler(productService)
	r.Route("/products", func(r chi.Router) {
		productHandler.RegisterRoutes(r)
	})
	slog.Info("Router initialized")
	return r
}

type Config struct {
	JWTSecret string
}
