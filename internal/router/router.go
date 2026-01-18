package router

import (
	"log/slog"
	"net/http"

	"github.com/MihoZaki/DzTech/db"
	"github.com/MihoZaki/DzTech/internal/config"
	db_queries "github.com/MihoZaki/DzTech/internal/db" // SQLC generated code
	"github.com/MihoZaki/DzTech/internal/handlers"
	"github.com/MihoZaki/DzTech/internal/middleware"
	"github.com/MihoZaki/DzTech/internal/services"
	"github.com/go-chi/chi/v5"
)

func New(cfg *config.Config) http.Handler {
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
	cartService := services.NewCartService(querier, productService, slog.Default()) // Inject dependencies

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

	cartHandler := handlers.NewCartHandler(cartService, productService, slog.Default())
	// Apply JWT middleware to the /cart route group
	r.Group(func(r chi.Router) {
		// Apply JWT middleware here. It will add user to context if token is valid.
		// If token is missing or invalid, context will lack user info, allowing guest flow.
		// Pass the cfg containing JWTSecret to the middleware.
		r.Use(middleware.JWTMiddleware(cfg))

		r.Route("/cart", func(r chi.Router) {
			cartHandler.RegisterRoutes(r) // Register routes within the protected group
		})
	})
	slog.Info("Router initialized")
	return r
}
