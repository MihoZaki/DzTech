package models

import (
	"time"

	"github.com/google/uuid"
)

// Address represents the structure for shipping and billing addresses stored as JSONB.
type Address struct {
	FullName     string  `json:"full_name" validate:"required"`      // Required
	PhoneNumber1 string  `json:"phone_number_1" validate:"required"` // Required
	PhoneNumber2 *string `json:"phone_number_2,omitempty"`           // Optional
	Province     string  `json:"province" validate:"required"`       // Required (formerly 'Provenance')
	City         string  `json:"city" validate:"required"`           // Required
	// Add other potential address fields if needed later
}

func (a *Address) Validate() error {
	return Validate.Struct(a)
}

func (i *BulkAddItemRequest_Item) Validate() error {
	return Validate.Struct(i)
}

// CreateOrderFromCartRequest represents the request body for creating an order from the current cart state.
type CreateOrderFromCartRequest struct {
	ShippingAddress   Address   `json:"shipping_address"`
	Notes             *string   `json:"notes,omitempty"`     // Optional notes for the order
	DeliveryServiceID uuid.UUID `json:"delivery_service_id"` // Required delivery service ID
}

func (r *CreateOrderFromCartRequest) Validate() error {
	return Validate.Struct(r)
}

// UpdateOrderStatusRequest represents the request body for updating an order's status.
type UpdateOrderStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=pending confirmed shipped delivered cancelled"`
}

func (r *UpdateOrderStatusRequest) Validate() error {
	return Validate.Struct(r)
}

// UpdateOrderRequest represents the request body for updating other order details (e.g., notes).
type UpdateOrderRequest struct {
	Notes *string `json:"notes,omitempty" validate:"omitempty,max=500"` // Optional notes, max length 500 chars
}

func (r *UpdateOrderRequest) Validate() error {
	return Validate.Struct(r)
}

// Order represents the main order entity returned by the service.
type Order struct {
	ID                uuid.UUID  `json:"id"`
	UserID            uuid.UUID  `json:"user_id"`
	UserFullName      string     `json:"user_full_name"`
	Status            string     `json:"status"`
	TotalAmountCents  int64      `json:"total_amount_cents"`
	PaymentMethod     string     `json:"payment_method"`
	Province          string     `json:"province"`
	City              string     `json:"city"`
	PhoneNumber1      string     `json:"phone_number_1"`
	PhoneNumber2      *string    `json:"phone_number_2"`
	DeliveryServiceID uuid.UUID  `json:"delivery_service_id"`
	Notes             *string    `json:"notes,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	CompletedAt       *time.Time `json:"completed_at,omitempty"`
	CancelledAt       *time.Time `json:"cancelled_at,omitempty"`
}

// OrderItem represents an individual item within an order.
type OrderItem struct {
	ID            uuid.UUID `json:"id"`
	OrderID       uuid.UUID `json:"order_id"`
	ProductID     uuid.UUID `json:"product_id"`
	ProductName   string    `json:"product_name"`
	PriceCents    int64     `json:"price_cents"`
	Quantity      int32     `json:"quantity"`
	SubtotalCents int64     `json:"subtotal_cents"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// OrderWithItems represents the complete state of an order for display purposes.
type OrderWithItems struct {
	Order Order       `json:"order"`
	Items []OrderItem `json:"items"`
}

// ListOrdersResponse wraps the result of a list orders query.
type ListOrdersResponse struct {
	Orders []Order `json:"orders"`
}
