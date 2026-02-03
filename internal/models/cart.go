package models

import (
	"time"

	"github.com/google/uuid"
)

// Cart represents the main cart entity.
type Cart struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id,omitempty"`
	SessionID *string   `json:"session_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CartItem represents an individual item within a cart.
type CartItem struct {
	ID        uuid.UUID `json:"id"`
	CartID    uuid.UUID `json:"cart_id"`
	ProductID uuid.UUID `json:"product_id"`
	Quantity  int       `json:"quantity"`
}

// CartItemSummary includes the cart item details plus the associated product information.
type CartItemSummary struct {
	ID       uuid.UUID    `json:"id"`
	CartID   uuid.UUID    `json:"cart_id"`
	Product  *ProductLite `json:"product"`
	Quantity int          `json:"quantity"`
}

// ProductLite holds essential product info for display in cart/order summaries.
// This mirrors the structure needed from the database join results.
type ProductLite struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	PriceCents    int64     `json:"price_cents"`
	StockQuantity int       `json:"stock_quantity"`
	ImageUrls     []string  `json:"image_urls"` // Assumes proper decoding from DB JSONB
	Brand         string    `json:"brand"`
}

// CartSummary represents the complete state of a cart for display purposes.
type CartSummary struct {
	ID         uuid.UUID         `json:"id"`
	UserID     uuid.UUID         `json:"user_id,omitempty"`
	SessionID  *string           `json:"session_id,omitempty"`
	CreatedAt  time.Time         `json:"created_at"`
	UpdatedAt  time.Time         `json:"updated_at"`
	Items      []CartItemSummary `json:"items"`
	TotalItems int               `json:"total_items"`       // Number of distinct items in the cart
	TotalQty   int               `json:"total_quantity"`    // Total quantity of all items
	TotalValue int64             `json:"total_value_cents"` // Total monetary value in cents
}

type AddItemRequest struct {
	ProductID string `json:"product_id" validate:"required,uuid"` // Expecting UUID string
	Quantity  int    `json:"quantity" validate:"required,min=1"`  // Minimum quantity is 1
}
type BulkAddItemRequest_Item struct {
	ProductID uuid.UUID `json:"product_id"`
	Quantity  int       `json:"quantity"`
}
type BulkAddItemRequest struct {
	Items []BulkAddItemRequest_Item `json:"items"`
}

func (ir *AddItemRequest) Validate() error {
	return Validate.Struct(ir)
}

type UpdateItemQuantityRequest struct {
	Quantity int `json:"quantity" validate:"required,min=1"` // Minimum quantity is 1
}

func (uir *UpdateItemQuantityRequest) Validate() error {
	return Validate.Struct(uir)
}
