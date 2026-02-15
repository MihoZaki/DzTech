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
	"github.com/redis/go-redis/v9"
)

func New(cfg *config.Config, redisClient *redis.Client) http.Handler {

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
	localStoragePath := "./uploads"
	localPublicPath := "/uploads"
	allowedTypes := []string{"image/jpeg", "image/png", "image/gif", "image/webp"}
	maxFileSize := int64(10 * 1024 * 1024) // 10MB

	storer := storage.NewLocalStorage(localStoragePath, localPublicPath, allowedTypes, maxFileSize)
	r.Handle(localPublicPath+"/*", http.StripPrefix(localPublicPath, http.FileServer(http.Dir(localStoragePath))))

	// Initialize database querier
	querier := db_queries.New(pool)

	// Initialize services
	emailService := services.NewEmailService(cfg, slog.Default())
	userService := services.NewUserService(querier, emailService) // Initialize services (add redisClient if needed in constructor)
	productService := services.NewProductService(querier, storer, redisClient, slog.Default())
	cartService := services.NewCartService(querier, productService, slog.Default())
	orderService := services.NewOrderService(querier, pool, cartService, redisClient, productService, slog.Default())
	authService := services.NewAuthService(querier, userService, cartService, cfg.JWTSecret, slog.Default())
	deliveryService := services.NewDeliveryServiceService(querier, slog.Default())
	adminUserService := services.NewAdminUserService(querier, slog.Default())
	reviewService := services.NewReviewService(querier, pool, slog.Default())
	discountService := services.NewDiscountService(querier, redisClient, slog.Default())
	categoryService := services.NewCategoryService(querier, redisClient, slog.Default())
	analyticsService := services.NewAnalyticsService(querier, redisClient, slog.Default())

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	productHandler := handlers.NewProductHandler(productService)
	adminProductHandler := handlers.NewProductHandler(productService)
	adminOrderHandler := handlers.NewOrderHandler(orderService, slog.Default())
	adminDeliveryHandler := handlers.NewDeliveryServiceHandler(deliveryService, slog.Default())
	cartHandler := handlers.NewCartHandler(cartService, productService, slog.Default())
	orderHandler := handlers.NewOrderHandler(orderService, slog.Default())
	deliveryOptionsHandler := handlers.NewDeliveryOptionsHandler(deliveryService, slog.Default())
	adminUserHandler := handlers.NewAdminUserHandler(adminUserService, slog.Default())
	reviewHandler := handlers.NewReviewHandler(reviewService, slog.Default())
	discountHandler := handlers.NewDiscountHandler(discountService, slog.Default())
	categoryHandler := handlers.NewCategoryHandler(categoryService, slog.Default())
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService, slog.Default())
	profileHandler := handlers.NewProfileHandler(userService, emailService, slog.Default())

	// Create sub-routers
	authRouter := chi.NewRouter()
	authHandler.RegisterRoutes(authRouter)
	// Register password recovery routes on the auth router (public)
	profileHandler.RegisterAuthRoutes(authRouter) // Adds /forgot-password, /reset-password under /api/v1/auth

	analyticsRouter := chi.NewRouter()
	analyticsHandler.RegisterRoutes(analyticsRouter)

	productRouter := chi.NewRouter()
	productRouter.Get("/", productHandler.ListAllProducts)
	productRouter.Get("/{id}", productHandler.GetProduct)
	productRouter.Get("/search", productHandler.SearchProducts)
	productRouter.Get("/categories", productHandler.ListCategories)
	productRouter.Get("/categories/{id}", productHandler.GetCategory)

	adminRouter := chi.NewRouter()
	adminRouter.Use(middleware.JWTMiddleware(cfg))
	adminRouter.Use(middleware.RequireAdmin)
	adminRouter.Route("/products", func(r chi.Router) {
		adminProductHandler.RegisterRoutes(r)
	})
	adminRouter.Route("/orders", func(r chi.Router) {
		adminOrderHandler.RegisterAdminRoutes(r)
	})
	adminRouter.Route("/delivery-services", func(r chi.Router) {
		adminDeliveryHandler.RegisterRoutes(r)
	})
	adminRouter.Route("/users", func(r chi.Router) {
		adminUserHandler.RegisterRoutes(r)
	})
	adminRouter.Route("/discounts", func(r chi.Router) {
		discountHandler.RegisterRoutes(r)
	})
	adminRouter.Route("/categories", func(r chi.Router) {
		categoryHandler.RegisterRoutes(r)
	})
	adminRouter.Route("/analytics", func(r chi.Router) {
		analyticsHandler.RegisterRoutes(r)
	})

	// Create user-specific sub-router (protected)
	userRouter := chi.NewRouter()
	userRouter.Use(middleware.JWTMiddleware(cfg)) // Apply JWT middleware to user routes
	profileHandler.RegisterRoutes(userRouter)

	cartRouter := chi.NewRouter()
	cartRouter.Use(middleware.JWTMiddleware(cfg))
	cartHandler.RegisterRoutes(cartRouter)

	orderRouter := chi.NewRouter()
	orderRouter.Use(middleware.JWTMiddleware(cfg))
	orderHandler.RegisterUserRoutes(orderRouter)

	deliveryOptionsRouter := chi.NewRouter()
	deliveryOptionsRouter.Use(middleware.JWTMiddleware(cfg))
	deliveryOptionsHandler.RegisterRoutes(deliveryOptionsRouter)

	reviewRouter := chi.NewRouter()
	reviewRouter.Use(middleware.JWTMiddleware(cfg))
	reviewHandler.RegisterRoutes(reviewRouter)

	// Mount sub-routers
	r.Mount("/api/v1/auth", authRouter) // Contains /register, /login, /forgot-password, /reset-password
	r.Mount("/api/v1/products", productRouter)
	r.Mount("/api/v1/admin", adminRouter)
	r.Mount("/api/v1/user", userRouter) // Contains /profile, /password/change
	r.Mount("/api/v1/cart", cartRouter)
	r.Mount("/api/v1/orders", orderRouter)
	r.Mount("/api/v1/delivery-options", deliveryOptionsRouter)
	r.Mount("/api/v1/reviews", reviewRouter)

	slog.Info("Router initialized")
	return r
}
