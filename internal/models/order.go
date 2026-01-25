package models

import (
	"time"

	"github.com/google/uuid"
)

type Order struct {
	ID                uuid.UUID    `json:"id"`
	UserID            uuid.UUID    `json:"user_id"`
	Status            string       `json:"status"` // e.g., pending, confirmed, shipped, delivered, cancelled
	TotalAmountCents  int64        `json:"total_amount_cents"`
	PaymentMethod     string       `json:"payment_method"`      // e.g., "Cash on Delivery"
	ShippingAddress   LocalAddress `json:"shipping_address"`    // Using LocalAddress
	BillingAddress    LocalAddress `json:"billing_address"`     // Using LocalAddress
	Notes             *string      `json:"notes,omitempty"`     // Optional notes from customer or admin
	DeliveryServiceID uuid.UUID    `json:"delivery_service_id"` // Added
	CreatedAt         time.Time    `json:"created_at"`
	UpdatedAt         time.Time    `json:"updated_at"`
	CompletedAt       *time.Time   `json:"completed_at,omitempty"` // When status becomes 'delivered' or 'cancelled'
	CancelledAt       *time.Time   `json:"cancelled_at,omitempty"` // When status is explicitly set to 'cancelled'
}

// OrderItem represents an item within an order.
type OrderItem struct {
	ID            uuid.UUID `json:"id"`
	OrderID       uuid.UUID `json:"order_id"`
	ProductID     uuid.UUID `json:"product_id"`
	ProductName   string    `json:"product_name"` // Denormalized for easier retrieval
	PriceCents    int64     `json:"price_cents"`  // Price at time of order
	Quantity      int       `json:"quantity"`
	SubtotalCents int64     `json:"subtotal_cents"` // PriceCents * Quantity
}

// OrderWithItems represents an order along with its associated items.
// This is useful for responses like GET /api/v1/orders/{id}.
type OrderWithItems struct {
	Order Order       `json:"order"`
	Items []OrderItem `json:"items"`
}

// LocalAddress represents a shipping/billing address for local delivery only.
type LocalAddress struct {
	Street1     string `json:"street1"`
	Street2     string `json:"street2,omitempty"` // Optional second line
	City        string `json:"city"`              // City is required for local context
	State       string `json:"state"`             // State/Province/Region for local context
	PostalCode  string `json:"postal_code"`       // Postal Code is important for local delivery
	PhoneNumber string `json:"phone_number"`      // Required phone number for contact
}

type CreateOrderRequest struct {
	UserID            uuid.UUID    `json:"user_id" validate:"required,uuid"` // Might come from context
	CartID            uuid.UUID    `json:"cart_id" validate:"required,uuid"`
	ShippingAddress   LocalAddress `json:"shipping_address" validate:"required,dive"` // dive validates nested struct fields
	BillingAddress    LocalAddress `json:"billing_address" validate:"required,dive"`
	DeliveryServiceID uuid.UUID    `json:"delivery_service_id" validate:"required,uuid"` // Add delivery service ID
	Notes             *string      `json:"notes,omitempty"`
	// Items are usually derived from the user's cart at checkout time,
	// not sent explicitly in the request body for CreateOrder.
	// However, you might send cart_id or similar.
	// For now, let's assume the service fetches items from the cart.
}

type UpdateOrderStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=pending confirmed shipped delivered cancelled"`
}

type UpdateOrderRequest struct {
	Status *string `json:"status,omitempty" validate:"omitempty,oneof=pending confirmed shipped delivered cancelled"`
	Notes  *string `json:"notes,omitempty"`
}

func (r *CreateOrderRequest) Validate() error {
	return Validate.Struct(r)
}

func (r *UpdateOrderStatusRequest) Validate() error {
	return Validate.Struct(r)
}

func (r *UpdateOrderRequest) Validate() error {
	return Validate.Struct(r)
}
