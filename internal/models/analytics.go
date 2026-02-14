package models

import (
	"time"

	"github.com/google/uuid"
)

// BaseAnalyticsRequest holds common parameters for analytics requests.
type BaseAnalyticsRequest struct {
	StartDate *time.Time `json:"start_date,omitempty" validate:"omitempty,datetime"`                 // ISO 8601 format: "2024-01-01T00:00:00Z"
	EndDate   *time.Time `json:"end_date,omitempty" validate:"omitempty,datetime,gtfield=StartDate"` // End date must be after start date
}

// GetTopNRequest extends BaseAnalyticsRequest with a limit parameter.
type GetTopNRequest struct {
	BaseAnalyticsRequest
	Limit int `json:"limit,omitempty" validate:"omitempty,min=1,max=100"` // Number of top items to return
}

// GetLowStockRequest holds parameters for low stock queries.
type GetLowStockRequest struct {
	Threshold int `json:"threshold" validate:"required,min=1"` // Minimum stock quantity threshold
}

// TotalRevenueResponse holds the total revenue calculation result.
type TotalRevenueResponse struct {
	TotalRevenueCents int64     `json:"total_revenue_cents"` // Total revenue in cents
	StartDate         time.Time `json:"start_date"`
	EndDate           time.Time `json:"end_date"`
}

// SalesVolumeResponse holds the sales volume calculation result.
type SalesVolumeResponse struct {
	TotalOrders int       `json:"total_orders"` // Total number of delivered orders
	StartDate   time.Time `json:"start_date"`
	EndDate     time.Time `json:"end_date"`
}

// AverageOrderValueResponse holds the average order value calculation result.
type AverageOrderValueResponse struct {
	AovCents  int64     `json:"aov_cents"`  // Average Order Value in cents
	StartDate time.Time `json:"start_date"` // Period start
	EndDate   time.Time `json:"end_date"`   // Period end
}

// TopSellingItem represents a product or category in top-selling lists.
type TopSellingItem struct {
	ID             uuid.UUID `json:"id"`               // Product or Category ID
	Name           string    `json:"name"`             // Product or Category Name
	TotalUnitsSold int64     `json:"total_units_sold"` // Quantity sold
}

// TopSellingProductsResponse holds the top-selling products list.
type TopSellingProductsResponse struct {
	Data      []TopSellingItem `json:"data"`       // List of top-selling products
	StartDate time.Time        `json:"start_date"` // Period start
	EndDate   time.Time        `json:"end_date"`   // Period end
	Limit     int              `json:"limit"`      // Number of items requested
}

// TopSellingCategoriesResponse holds the top-selling categories list.
type TopSellingCategoriesResponse struct {
	Data      []TopSellingItem `json:"data"`       // List of top-selling categories
	StartDate time.Time        `json:"start_date"` // Period start
	EndDate   time.Time        `json:"end_date"`   // Period end
	Limit     int              `json:"limit"`      // Number of items requested
}

// LowStockProduct represents a product with low stock.
type LowStockProduct struct {
	ID            uuid.UUID `json:"id"`             // Product ID
	Name          string    `json:"name"`           // Product Name
	StockQuantity int       `json:"stock_quantity"` // Current stock level
}

// LowStockProductsResponse holds the list of low-stock products.
type LowStockProductsResponse struct {
	Data      []LowStockProduct `json:"data"`      // List of low-stock products
	Threshold int               `json:"threshold"` // Threshold used for the query
}

// CustomerInsightsResponse holds new customer count.
type CustomerInsightsResponse struct {
	NewCustomersCount int       `json:"new_customers_count"` // Number of new registrations
	StartDate         time.Time `json:"start_date"`          // Period start
	EndDate           time.Time `json:"end_date"`            // Period end
}

// OrderStatusCount represents the count for a specific order status.
type OrderStatusCount struct {
	Status string `json:"status"` // Order status (e.g., pending, confirmed, shipped, delivered, cancelled)
	Count  int64  `json:"count"`  // Number of orders with this status
}

// OrderStatusCountsResponse holds the counts for all order statuses.
type OrderStatusCountsResponse struct {
	Data      []OrderStatusCount `json:"data"`       // List of status counts
	StartDate time.Time          `json:"start_date"` // Period start (if applicable)
	EndDate   time.Time          `json:"end_date"`   // Period end (if applicable)
}

// DiscountUsageReport represents usage data for a specific discount code.
type DiscountUsageReport struct {
	Code                     string `json:"code"`                              // Discount code used
	DiscountType             string `json:"discount_type"`                     // Type of discount (e.g., percentage, fixed_amount)
	DiscountValue            int64  `json:"discount_value"`                    // Value of the discount
	UsageCount               int64  `json:"usage_count"`                       // Number of times the discount was used
	TotalRevenueWithDiscount int64  `json:"total_revenue_with_discount_cents"` // Total revenue generated using this discount (in cents)
}

// DiscountUsageResponse holds the list of discount usage reports.
type DiscountUsageResponse struct {
	Data      []DiscountUsageReport `json:"data"`       // List of discount usage reports
	StartDate time.Time             `json:"start_date"` // Period start
	EndDate   time.Time             `json:"end_date"`   // Period end
}

// GenericAnalyticsResponse is a wrapper for different analytics data types.
type GenericAnalyticsResponse struct {
	Metric string      `json:"metric"` // e.g., "total_revenue", "top_products"
	Value  interface{} `json:"value"`  // The actual data payload
}
