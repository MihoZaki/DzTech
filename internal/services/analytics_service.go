package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/MihoZaki/DzTech/internal/db"
	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/redis/go-redis/v9"
)

// AnalyticsService handles business logic for analytics queries.
type AnalyticsService struct {
	querier db.Querier
	cache   *redis.Client // Optional: for caching results
	logger  *slog.Logger
}

// NewAnalyticsService creates a new instance of AnalyticsService.
func NewAnalyticsService(querier db.Querier, cache *redis.Client, logger *slog.Logger) *AnalyticsService {
	return &AnalyticsService{
		querier: querier,
		cache:   cache,
		logger:  logger,
	}
}

// GetTotalRevenue calculates the total revenue from delivered orders within a time range.
func (s *AnalyticsService) GetTotalRevenue(ctx context.Context, startDate, endDate time.Time) (*models.TotalRevenueResponse, error) {
	params := db.GetTotalRevenueParams{
		StartDate: ToPgTimestamptz(startDate),
		EndDate:   ToPgTimestamptz(endDate),
	}

	// Execute the query
	totalRevenueCents, err := s.querier.GetTotalRevenue(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch total revenue: %w", err)
	}

	// Map the result to the response model
	response := &models.TotalRevenueResponse{
		TotalRevenueCents: totalRevenueCents,
		StartDate:         startDate,
		EndDate:           endDate,
	}

	return response, nil
}

// GetSalesVolume counts the total number of delivered orders within a time range.
func (s *AnalyticsService) GetSalesVolume(ctx context.Context, startDate, endDate time.Time) (*models.SalesVolumeResponse, error) {
	// Prepare query parameters
	params := db.GetSalesVolumeParams{
		StartDate: ToPgTimestamptz(startDate),
		EndDate:   ToPgTimestamptz(endDate),
	}

	// Execute the query
	totalOrders, err := s.querier.GetSalesVolume(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch sales volume: %w", err)
	}

	// Map the result to the response model
	response := &models.SalesVolumeResponse{
		TotalOrders: int(totalOrders), // Assuming totalOrders is int64 from the query
		StartDate:   startDate,
		EndDate:     endDate,
	}

	return response, nil
}

// GetAverageOrderValue calculates the average order value for delivered orders within a time range.
func (s *AnalyticsService) GetAverageOrderValue(ctx context.Context, startDate, endDate time.Time) (*models.AverageOrderValueResponse, error) {
	// Prepare query parameters
	params := db.GetAverageOrderValueParams{
		StartDate: ToPgTimestamptz(startDate),
		EndDate:   ToPgTimestamptz(endDate),
	}

	// Execute the query
	aovCentsFloat, err := s.querier.GetAverageOrderValue(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch average order value: %w", err)
	}

	// Convert float64 (from AVG) to int64 for the response model
	// Consider rounding if necessary
	aovCents := int64(aovCentsFloat)

	// Map the result to the response model
	response := &models.AverageOrderValueResponse{
		AovCents:  aovCents,
		StartDate: startDate,
		EndDate:   endDate,
	}

	return response, nil
}

// GetTopSellingProducts retrieves the top N selling products within a time range.
func (s *AnalyticsService) GetTopSellingProducts(ctx context.Context, startDate, endDate time.Time, limit int) (*models.TopSellingProductsResponse, error) {
	// Prepare query parameters
	params := db.GetTopSellingProductsParams{
		StartDate: ToPgTimestamptz(startDate),
		EndDate:   ToPgTimestamptz(endDate),
		Limits:    int32(limit), // Assuming the SQL query expects int32 for LIMIT
	}

	// Execute the query
	dbResults, err := s.querier.GetTopSellingProducts(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch top selling products: %w", err)
	}

	// Map the database results to the application model
	data := make([]models.TopSellingItem, len(dbResults))
	for i, row := range dbResults {
		data[i] = models.TopSellingItem{
			ID:             row.ProductID,
			Name:           row.ProductName,
			TotalUnitsSold: row.TotalUnitsSold,
		}
	}

	// Map the result to the response model
	response := &models.TopSellingProductsResponse{
		Data:      data,
		StartDate: startDate,
		EndDate:   endDate,
		Limit:     limit,
	}

	return response, nil
}

// GetTopSellingCategories retrieves the top N selling categories within a time range.
func (s *AnalyticsService) GetTopSellingCategories(ctx context.Context, startDate, endDate time.Time, limit int) (*models.TopSellingCategoriesResponse, error) {
	// Prepare query parameters
	params := db.GetTopSellingCategoriesParams{
		StartDate: ToPgTimestamptz(startDate),
		EndDate:   ToPgTimestamptz(endDate),
		Limits:    int32(limit), // Assuming the SQL query expects int32 for LIMIT
	}

	// Execute the query
	dbResults, err := s.querier.GetTopSellingCategories(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch top selling categories: %w", err)
	}

	// Map the database results to the application model
	data := make([]models.TopSellingItem, len(dbResults))
	for i, row := range dbResults {
		data[i] = models.TopSellingItem{
			ID:             row.CategoryID,
			Name:           row.CategoryName,
			TotalUnitsSold: row.TotalUnitsSold,
		}
	}

	// Map the result to the response model
	response := &models.TopSellingCategoriesResponse{
		Data:      data,
		StartDate: startDate,
		EndDate:   endDate,
		Limit:     limit,
	}

	return response, nil
}

// GetLowStockProducts retrieves products with stock below a threshold.
func (s *AnalyticsService) GetLowStockProducts(ctx context.Context, threshold int) (*models.LowStockProductsResponse, error) {
	dbResults, err := s.querier.GetLowStockProducts(ctx, int32(threshold)) // Pass threshold directly
	if err != nil {
		return nil, fmt.Errorf("failed to fetch low stock products: %w", err)
	}

	// Map the database results to the application model
	data := make([]models.LowStockProduct, len(dbResults))
	for i, row := range dbResults {
		data[i] = models.LowStockProduct{
			ID:            row.ProductID,
			Name:          row.ProductName,
			StockQuantity: int(row.StockQuantity),
		}
	}

	// Map the result to the response model
	response := &models.LowStockProductsResponse{
		Data:      data,
		Threshold: threshold,
	}

	return response, nil
}

// GetNewCustomersCount counts new customers registered within a time range.
func (s *AnalyticsService) GetNewCustomersCount(ctx context.Context, startDate, endDate time.Time) (*models.CustomerInsightsResponse, error) {
	// Prepare query parameters
	params := db.GetNewCustomersCountParams{
		StartDate: ToPgTimestamptz(startDate),
		EndDate:   ToPgTimestamptz(endDate),
	}

	// Execute the query
	count, err := s.querier.GetNewCustomersCount(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch new customers count: %w", err)
	}

	// Map the result to the response model
	response := &models.CustomerInsightsResponse{
		NewCustomersCount: int(count), // Assuming count is int64 from the query
		StartDate:         startDate,
		EndDate:           endDate,
	}

	return response, nil
}

// GetOrderStatusCounts counts orders by status within a time range.
func (s *AnalyticsService) GetOrderStatusCounts(ctx context.Context, startDate, endDate time.Time) (*models.OrderStatusCountsResponse, error) {
	// Prepare query parameters
	params := db.GetOrderStatusCountsParams{
		StartDate: ToPgTimestamptz(startDate),
		EndDate:   ToPgTimestamptz(endDate),
	}

	// Execute the query
	dbResults, err := s.querier.GetOrderStatusCounts(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch order status counts: %w", err)
	}

	// Map the database results to the application model
	data := make([]models.OrderStatusCount, len(dbResults))
	for i, row := range dbResults {
		data[i] = models.OrderStatusCount{
			Status: row.Status,
			Count:  row.Count,
		}
	}

	// Map the result to the response model
	response := &models.OrderStatusCountsResponse{
		Data:      data,
		StartDate: startDate,
		EndDate:   endDate,
	}

	return response, nil
}

// GetDiscountUsage retrieves usage count and revenue for discounts within a time range.
func (s *AnalyticsService) GetDiscountUsage(ctx context.Context, startDate, endDate time.Time) (*models.DiscountUsageResponse, error) {
	// Prepare query parameters
	params := db.GetDiscountUsageParams{
		StartDate: ToPgTimestamptz(startDate),
		EndDate:   ToPgTimestamptz(endDate),
	}

	// Execute the query
	dbResults, err := s.querier.GetDiscountUsage(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch discount usage: %w", err)
	}

	// Map the database results to the application model
	data := make([]models.DiscountUsageReport, len(dbResults))
	for i, row := range dbResults {
		data[i] = models.DiscountUsageReport{
			Code:                     row.DiscountCode,
			DiscountType:             row.DiscountType,
			DiscountValue:            row.DiscountValue,
			UsageCount:               row.UsageCount,
			TotalRevenueWithDiscount: row.TotalRevenueWithDiscount,
		}
	}

	// Map the result to the response model
	response := &models.DiscountUsageResponse{
		Data:      data,
		StartDate: startDate,
		EndDate:   endDate,
	}

	return response, nil
}

// --- Helper Functions (Optional, for common logic like date validation) ---

// ValidateDateRange checks if start date is before end date.
func ValidateDateRange(startDate, endDate *time.Time) error {
	if startDate != nil && endDate != nil && !endDate.After(*startDate) {
		return errors.New("end date must be after start date")
	}
	return nil
}
