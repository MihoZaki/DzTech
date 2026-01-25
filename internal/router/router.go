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
	"github.com/MihoZaki/DzTech/internal/storage"
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

	// --- Initialize Storage Client ---
	// Example for LocalStorage
	localStoragePath := "./uploads"                                                // Define this in config or elsewhere
	localPublicPath := "/uploads"                                                  // Define this in config or elsewhere
	allowedTypes := []string{"image/jpeg", "image/png", "image/gif", "image/webp"} // Define in config
	maxFileSize := int64(10 * 1024 * 1024)                                         // 10MB, define in config

	storer := storage.NewLocalStorage(localStoragePath, localPublicPath, allowedTypes, maxFileSize)

	// Initialize database querier (using SQLC generated code)
	querier := db_queries.New(pool)
	// Initialize services
	userService := services.NewUserService(querier)
	productService := services.NewProductService(querier, storer)
	cartService := services.NewCartService(querier, productService, slog.Default()) // Inject dependencies
	orderService := services.NewOrderService(querier, pool, cartService, productService, slog.Default())

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService, cfg.JWTSecret)
	r.Route("/api/v1/auth", func(r chi.Router) {
		authHandler.RegisterRoutes(r)
	})

	// Customer-facing Product routes (Public or Authenticated, depending on requirements)
	// These routes do NOT require admin privileges.
	productHandler := handlers.NewProductHandler(productService)
	r.Route("/api/v1/products", func(r chi.Router) {
		// These endpoints are for general use
		r.Get("/", productHandler.ListAllProducts)            // List products (public)
		r.Get("/{id}", productHandler.GetProduct)             // Get specific product (public)
		r.Get("/search", productHandler.SearchProducts)       // Search products (public)
		r.Get("/categories", productHandler.ListCategories)   // List categories (public)
		r.Get("/categories/{id}", productHandler.GetCategory) // Get category (public)
	})

	// Admin-specific Product routes (require admin privileges)
	// These routes use the SAME handlers but apply admin middleware.
	r.Group(func(r chi.Router) {
		r.Use(middleware.JWTMiddleware(cfg))
		r.Use(middleware.RequireAdmin)
		adminProductHandler := handlers.NewProductHandler(productService) // Reuse handler
		r.Route("/api/v1/admin/products", func(r chi.Router) {
			adminProductHandler.RegisterRoutes(r) // Register ALL routes under /admin/products
		})
		adminOrderHandler := handlers.NewOrderHandler(orderService, slog.Default())
		r.Route("/api/v1/admin/orders", func(r chi.Router) {
			adminOrderHandler.RegisterAdminRoutes(r)
		})
	})

	// Cart routes - PROTECTED route group to enable user context and allow guest fallback
	r.Group(func(r chi.Router) {
		r.Use(middleware.JWTMiddleware(cfg))

		r.Route("/api/v1/cart", func(r chi.Router) {
			cartHandler := handlers.NewCartHandler(cartService, productService, slog.Default())
			cartHandler.RegisterRoutes(r) // Register routes within the protected group
		})

		r.Route("/api/v1/orders", func(r chi.Router) {
			orderHandler := handlers.NewOrderHandler(orderService, slog.Default())
			orderHandler.RegisterUserRoutes(r)
		})
	})

	slog.Info("Router initialized")
	return r
}
