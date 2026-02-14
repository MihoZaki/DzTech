package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/MihoZaki/DzTech/internal/services"

	"github.com/go-chi/chi/v5"
)

// AnalyticsHandler handles HTTP requests for analytics endpoints.
type AnalyticsHandler struct {
	service *services.AnalyticsService
	logger  *slog.Logger
}

// NewAnalyticsHandler creates a new instance of AnalyticsHandler.
func NewAnalyticsHandler(service *services.AnalyticsService, logger *slog.Logger) *AnalyticsHandler {
	return &AnalyticsHandler{
		service: service,
		logger:  logger,
	}
}

// RegisterRoutes registers the analytics-related routes under the given router.
func (h *AnalyticsHandler) RegisterRoutes(r chi.Router) {
	// Sales Performance
	r.Get("/revenue", h.GetTotalRevenue)                  // GET /api/v1/admin/analytics/revenue?start_date=&end_date=
	r.Get("/sales-volume", h.GetSalesVolume)              // GET /api/v1/admin/analytics/sales-volume?start_date=&end_date=
	r.Get("/average-order-value", h.GetAverageOrderValue) // GET /api/v1/admin/analytics/average-order-value?start_date=&end_date=
	r.Get("/top-products", h.GetTopSellingProducts)       // GET /api/v1/admin/analytics/top-products?start_date=&end_date=&limit=
	r.Get("/top-categories", h.GetTopSellingCategories)   // GET /api/v1/admin/analytics/top-categories?start_date=&end_date=&limit=

	// Product Performance
	r.Get("/low-stock", h.GetLowStockProducts) // GET /api/v1/admin/analytics/low-stock?threshold=
	// Note: GetProductReviewStats might be better under product endpoints, not analytics

	// Customer Insights
	r.Get("/new-customers", h.GetNewCustomersCount) // GET /api/v1/admin/analytics/new-customers?start_date=&end_date=

	// Order Metrics
	r.Get("/order-status-counts", h.GetOrderStatusCounts) // GET /api/v1/admin/analytics/order-status-counts?start_date=&end_date=

	// Discount Effectiveness
	// r.Get("/discount-usage", h.GetDiscountUsage) // GET /api/v1/admin/analytics/discount-usage?start_date=&end_date=
}

func parseTimeParam(r *http.Request, paramName string, defaultTime time.Time) (*time.Time, error) {
	timeStr := r.URL.Query().Get(paramName)
	if timeStr == "" {
		return &defaultTime, nil // Or return nil, nil if optional and default is not acceptable
	}
	t, err := time.Parse(time.RFC3339, timeStr) // Expecting ISO 8601 format
	if err != nil {
		return nil, fmt.Errorf("invalid format for %s: %w", paramName, err)
	}
	return &t, nil
}

func parseLimitParam(r *http.Request, defaultValue int) (int, error) {
	limitStr := r.URL.Query().Get("limit")
	if limitStr == "" {
		return defaultValue, nil
	}
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		return 0, fmt.Errorf("invalid limit parameter: %w", err)
	}
	if limit > 100 { // Example maximum limit
		limit = 100
	}
	return limit, nil
}

func parseThresholdParam(r *http.Request) (int, error) {
	thresholdStr := r.URL.Query().Get("threshold")
	if thresholdStr == "" {
		return 0, fmt.Errorf("missing threshold parameter")
	}
	threshold, err := strconv.Atoi(thresholdStr)
	if err != nil || threshold <= 0 {
		return 0, fmt.Errorf("invalid threshold parameter: %w", err)
	}
	return threshold, nil
}

// --- Handler Methods ---

// GetTotalRevenue handles the request to get total revenue.
func (h *AnalyticsHandler) GetTotalRevenue(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	startDate, err := parseTimeParam(r, "start_date", time.Now().AddDate(0, -1, 0)) // Default to 1 month ago
	if err != nil {
		h.logger.Error("Invalid start_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}
	endDate, err := parseTimeParam(r, "end_date", time.Now()) // Default to now
	if err != nil {
		h.logger.Error("Invalid end_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}

	// Validate date range
	if !endDate.After(*startDate) {
		h.logger.Error("End date must be after start date", "start_date", startDate, "end_date", endDate)
		http.Error(w, `{"error": "Invalid Parameter", "message": "End date must be after start date"}`, http.StatusBadRequest)
		return
	}

	// Call the service
	response, err := h.service.GetTotalRevenue(r.Context(), *startDate, *endDate)
	if err != nil {
		h.logger.Error("Failed to get total revenue", "error", err, "start_date", startDate, "end_date", endDate)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve total revenue"}`, http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode GetTotalRevenue response", "error", err)
		// Error already written to client, just log
	}
}

// GetSalesVolume handles the request to get sales volume.
func (h *AnalyticsHandler) GetSalesVolume(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	startDate, err := parseTimeParam(r, "start_date", time.Now().AddDate(0, -1, 0)) // Default to 1 month ago
	if err != nil {
		h.logger.Error("Invalid start_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}
	endDate, err := parseTimeParam(r, "end_date", time.Now()) // Default to now
	if err != nil {
		h.logger.Error("Invalid end_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}

	// Validate date range
	if !endDate.After(*startDate) {
		h.logger.Error("End date must be after start date", "start_date", startDate, "end_date", endDate)
		http.Error(w, `{"error": "Invalid Parameter", "message": "End date must be after start date"}`, http.StatusBadRequest)
		return
	}

	// Call the service
	response, err := h.service.GetSalesVolume(r.Context(), *startDate, *endDate)
	if err != nil {
		h.logger.Error("Failed to get sales volume", "error", err, "start_date", startDate, "end_date", endDate)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve sales volume"}`, http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode GetSalesVolume response", "error", err)
	}
}

// GetAverageOrderValue handles the request to get average order value.
func (h *AnalyticsHandler) GetAverageOrderValue(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	startDate, err := parseTimeParam(r, "start_date", time.Now().AddDate(0, -1, 0)) // Default to 1 month ago
	if err != nil {
		h.logger.Error("Invalid start_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}
	endDate, err := parseTimeParam(r, "end_date", time.Now()) // Default to now
	if err != nil {
		h.logger.Error("Invalid end_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}

	// Validate date range
	if !endDate.After(*startDate) {
		h.logger.Error("End date must be after start date", "start_date", startDate, "end_date", endDate)
		http.Error(w, `{"error": "Invalid Parameter", "message": "End date must be after start date"}`, http.StatusBadRequest)
		return
	}

	// Call the service
	response, err := h.service.GetAverageOrderValue(r.Context(), *startDate, *endDate)
	if err != nil {
		h.logger.Error("Failed to get average order value", "error", err, "start_date", startDate, "end_date", endDate)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve average order value"}`, http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode GetAverageOrderValue response", "error", err)
	}
}

// GetTopSellingProducts handles the request to get top selling products.
func (h *AnalyticsHandler) GetTopSellingProducts(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	startDate, err := parseTimeParam(r, "start_date", time.Now().AddDate(0, -1, 0)) // Default to 1 month ago
	if err != nil {
		h.logger.Error("Invalid start_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}
	endDate, err := parseTimeParam(r, "end_date", time.Now()) // Default to now
	if err != nil {
		h.logger.Error("Invalid end_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}
	limit, err := parseLimitParam(r, 10) // Default to top 10
	if err != nil {
		h.logger.Error("Invalid limit parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}

	// Validate date range
	if !endDate.After(*startDate) {
		h.logger.Error("End date must be after start date", "start_date", startDate, "end_date", endDate)
		http.Error(w, `{"error": "Invalid Parameter", "message": "End date must be after start date"}`, http.StatusBadRequest)
		return
	}

	// Call the service
	response, err := h.service.GetTopSellingProducts(r.Context(), *startDate, *endDate, limit)
	if err != nil {
		h.logger.Error("Failed to get top selling products", "error", err, "start_date", startDate, "end_date", endDate, "limit", limit)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve top selling products"}`, http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode GetTopSellingProducts response", "error", err)
	}
}

// GetTopSellingCategories handles the request to get top selling categories.
func (h *AnalyticsHandler) GetTopSellingCategories(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	startDate, err := parseTimeParam(r, "start_date", time.Now().AddDate(0, -1, 0)) // Default to 1 month ago
	if err != nil {
		h.logger.Error("Invalid start_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}
	endDate, err := parseTimeParam(r, "end_date", time.Now()) // Default to now
	if err != nil {
		h.logger.Error("Invalid end_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}
	limit, err := parseLimitParam(r, 10) // Default to top 10
	if err != nil {
		h.logger.Error("Invalid limit parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}

	// Validate date range
	if !endDate.After(*startDate) {
		h.logger.Error("End date must be after start date", "start_date", startDate, "end_date", endDate)
		http.Error(w, `{"error": "Invalid Parameter", "message": "End date must be after start date"}`, http.StatusBadRequest)
		return
	}

	// Call the service
	response, err := h.service.GetTopSellingCategories(r.Context(), *startDate, *endDate, limit)
	if err != nil {
		h.logger.Error("Failed to get top selling categories", "error", err, "start_date", startDate, "end_date", endDate, "limit", limit)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve top selling categories"}`, http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode GetTopSellingCategories response", "error", err)
	}
}

// GetLowStockProducts handles the request to get low stock products.
func (h *AnalyticsHandler) GetLowStockProducts(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	threshold, err := parseThresholdParam(r)
	if err != nil {
		h.logger.Error("Invalid threshold parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}

	// Call the service
	response, err := h.service.GetLowStockProducts(r.Context(), threshold)
	if err != nil {
		h.logger.Error("Failed to get low stock products", "error", err, "threshold", threshold)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve low stock products"}`, http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode GetLowStockProducts response", "error", err)
	}
}

// GetNewCustomersCount handles the request to get new customer count.
func (h *AnalyticsHandler) GetNewCustomersCount(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	startDate, err := parseTimeParam(r, "start_date", time.Now().AddDate(0, -1, 0)) // Default to 1 month ago
	if err != nil {
		h.logger.Error("Invalid start_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}
	endDate, err := parseTimeParam(r, "end_date", time.Now()) // Default to now
	if err != nil {
		h.logger.Error("Invalid end_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}

	// Validate date range
	if !endDate.After(*startDate) {
		h.logger.Error("End date must be after start date", "start_date", startDate, "end_date", endDate)
		http.Error(w, `{"error": "Invalid Parameter", "message": "End date must be after start date"}`, http.StatusBadRequest)
		return
	}

	// Call the service
	response, err := h.service.GetNewCustomersCount(r.Context(), *startDate, *endDate)
	if err != nil {
		h.logger.Error("Failed to get new customers count", "error", err, "start_date", startDate, "end_date", endDate)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve new customers count"}`, http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode GetNewCustomersCount response", "error", err)
	}
}

// GetOrderStatusCounts handles the request to get order status counts.
func (h *AnalyticsHandler) GetOrderStatusCounts(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	startDate, err := parseTimeParam(r, "start_date", time.Now().AddDate(0, -1, 0)) // Default to 1 month ago
	if err != nil {
		h.logger.Error("Invalid start_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}
	endDate, err := parseTimeParam(r, "end_date", time.Now()) // Default to now
	if err != nil {
		h.logger.Error("Invalid end_date parameter", "error", err)
		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
		return
	}

	// Validate date range
	if !endDate.After(*startDate) {
		h.logger.Error("End date must be after start date", "start_date", startDate, "end_date", endDate)
		http.Error(w, `{"error": "Invalid Parameter", "message": "End date must be after start date"}`, http.StatusBadRequest)
		return
	}

	// Call the service
	response, err := h.service.GetOrderStatusCounts(r.Context(), *startDate, *endDate)
	if err != nil {
		h.logger.Error("Failed to get order status counts", "error", err, "start_date", startDate, "end_date", endDate)
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve order status counts"}`, http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode GetOrderStatusCounts response", "error", err)
	}
}

// GetDiscountUsage handles the request to get discount usage.
// func (h *AnalyticsHandler) GetDiscountUsage(w http.ResponseWriter, r *http.Request) {
// 	// Parse query parameters
// 	startDate, err := parseTimeParam(r, "start_date", time.Now().AddDate(0, -1, 0)) // Default to 1 month ago
// 	if err != nil {
// 		h.logger.Error("Invalid start_date parameter", "error", err)
// 		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
// 		return
// 	}
// 	endDate, err := parseTimeParam(r, "end_date", time.Now()) // Default to now
// 	if err != nil {
// 		h.logger.Error("Invalid end_date parameter", "error", err)
// 		http.Error(w, fmt.Sprintf(`{"error": "Invalid Parameter", "message": "%v"}`, err.Error()), http.StatusBadRequest)
// 		return
// 	}

// 	// Validate date range
// 	if !endDate.After(*startDate) {
// 		h.logger.Error("End date must be after start date", "start_date", startDate, "end_date", endDate)
// 		http.Error(w, `{"error": "Invalid Parameter", "message": "End date must be after start date"}`, http.StatusBadRequest)
// 		return
// 	}

// 	// Call the service
// 	response, err := h.service.GetDiscountUsage(r.Context(), *startDate, *endDate)
// 	if err != nil {
// 		h.logger.Error("Failed to get discount usage", "error", err, "start_date", startDate, "end_date", endDate)
// 		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to retrieve discount usage"}`, http.StatusInternalServerError)
// 		return
// 	}

// 	// Send success response
// 	w.Header().Set("Content-Type", "application/json")
// 	w.WriteHeader(http.StatusOK)
// 	if err := json.NewEncoder(w).Encode(response); err != nil {
// 		h.logger.Error("Failed to encode GetDiscountUsage response", "error", err)
// 	}
// }
