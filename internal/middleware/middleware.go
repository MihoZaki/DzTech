package middleware

import (
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func ApplyMiddleware(r *chi.Mux) {
	// Essential middleware for production
	r.Use(middleware.RequestID) // Important for rate limiting
	r.Use(middleware.RealIP)    // Important for rate limiting, analytics and tracing
	r.Use(middleware.Timeout(60 * time.Second))

	// Logging middleware with structured logging
	r.Use(middleware.Logger)

	r.Use(middleware.Recoverer)
}
