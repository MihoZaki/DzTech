package router

import (
	"log/slog"
	"net/http"

	"github.com/MihoZaki/DzTech/internal/handlers"
	"github.com/MihoZaki/DzTech/internal/middleware"
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

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(cfg.JWTSecret)
	r.Route("/auth", func(r chi.Router) {
		authHandler.RegisterRoutes(r)
	})

	// Add other routes here as they're implemented
	// r.Group(func(r chi.Router) {
	//     // Protected routes
	//     r.Use(authMiddleware)
	//     // Add protected routes
	// })

	slog.Info("Router initialized")
	return r
}

type Config struct {
	JWTSecret string
}
