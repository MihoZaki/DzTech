package models

import (
	"errors"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// DiscountType defines the type of discount.
type DiscountType string

const (
	DiscountTypePercentage DiscountType = "percentage"
	DiscountTypeFixed      DiscountType = "fixed" // Matches the schema
)

// Discount represents a discount rule.
// This model maps directly to the 'discounts' table in the database.
type Discount struct {
	ID                 uuid.UUID    `json:"id"`
	Code               string       `json:"code"`                  // Unique code for the discount
	Description        *string      `json:"description,omitempty"` // Nullable description
	DiscountType       DiscountType `json:"discount_type"`         // Either 'percentage' or 'fixed'
	DiscountValue      int64        `json:"discount_value"`        // e.g., 10 for 10%, 500 for $5
	MinOrderValueCents *int64       `json:"min_order_value_cents"` // Minimum order value (default 0)
	MaxUses            *int         `json:"max_uses,omitempty"`    // Nullable maximum uses (NULL means unlimited)
	CurrentUses        int          `json:"current_uses"`          // Counter for current usage (default 0)
	ValidFrom          time.Time    `json:"valid_from"`            // Start date for the discount
	ValidUntil         time.Time    `json:"valid_until"`           // End date for the discount
	IsActive           bool         `json:"is_active"`             // Whether the discount is currently active
	CreatedAt          time.Time    `json:"created_at"`            // Timestamp of creation
	UpdatedAt          time.Time    `json:"updated_at"`            // Timestamp of last update
}

// --- Request Models ---

// CreateDiscountRequest holds data for creating a new discount.
type CreateDiscountRequest struct {
	Code               string       `json:"code" validate:"required,max=50"`                            // Required, alphanumeric, max 50 chars
	Description        *string      `json:"description,omitempty"`                                      // Optional description
	DiscountType       DiscountType `json:"discount_type" validate:"required,oneof=percentage fixed"`   // Required, must be percentage or fixed
	DiscountValue      int64        `json:"discount_value" validate:"required,min=0"`                   // Required, non-negative
	MinOrderValueCents *int64       `json:"min_order_value_cents,omitempty" validate:"omitempty,min=0"` // Optional, non-negative
	MaxUses            *int         `json:"max_uses,omitempty" validate:"omitempty,min=1"`              // Optional, minimum 1 if provided
	ValidFrom          time.Time    `json:"valid_from" validate:"required"`                             // Required
	ValidUntil         time.Time    `json:"valid_until" validate:"required,gtfield=ValidFrom"`          // Required, must be after ValidFrom
	IsActive           bool         `json:"is_active"`                                                  // Required (true/false)
}

// UpdateDiscountRequest holds data for updating an existing discount.
// All fields are pointers, allowing partial updates.
type UpdateDiscountRequest struct {
	Code               *string       `json:"code,omitempty" validate:"omitempty,max=50"`                          // Optional, alphanumeric, max 50 chars
	Description        *string       `json:"description,omitempty"`                                               // Optional description
	DiscountType       *DiscountType `json:"discount_type,omitempty" validate:"omitempty,oneof=percentage fixed"` // Optional, must be percentage or fixed
	DiscountValue      *int64        `json:"discount_value,omitempty" validate:"omitempty,min=0"`                 // Optional, non-negative
	MinOrderValueCents *int64        `json:"min_order_value_cents,omitempty" validate:"omitempty,min=0"`          // Optional, non-negative
	MaxUses            *int          `json:"max_uses,omitempty" validate:"omitempty,min=1"`                       // Optional, minimum 1 if provided
	ValidFrom          *time.Time    `json:"valid_from,omitempty" validate:"omitempty"`                           // Optional datetime
	ValidUntil         *time.Time    `json:"valid_until,omitempty" validate:"omitempty,gtfield=ValidFrom"`        // Optional datetime, must be after ValidFrom if both are provided
	IsActive           *bool         `json:"is_active,omitempty"`                                                 // Optional (true/false)
}

// LinkDiscountRequest holds data for linking a discount to a product.
type LinkDiscountRequest struct {
	ProductID uuid.UUID `json:"product_id" validate:"required,uuid"` // Required product ID
}

// UnlinkDiscountRequest holds data for unlinking a discount from a product.
// This is identical to LinkDiscountRequest for this use case.
type UnlinkDiscountRequest struct {
	ProductID uuid.UUID `json:"product_id" validate:"required,uuid"` // Required product ID
}

// ListDiscountsRequest holds parameters for filtering and paginating discount lists.
type ListDiscountsRequest struct {
	IsActive   *bool      `json:"is_active,omitempty"`                      // Filter by active status (true/false)
	ValidFrom  *time.Time `json:"valid_from,omitempty"`                     // Filter by valid from date (discount starts on or after this date)
	ValidUntil *time.Time `json:"valid_until,omitempty"`                    // Filter by valid until date (discount ends on or before this date)
	Page       int        `json:"page" validate:"omitempty,min=1"`          // Page number (default 1)
	Limit      int        `json:"limit" validate:"omitempty,min=1,max=100"` // Number of items per page (default 20, max 100)
}

// --- Response Models ---

// DiscountListResponse wraps a list of discounts with pagination info.
type DiscountListResponse struct {
	Data       []Discount `json:"data"`
	Page       int        `json:"page"`
	Limit      int        `json:"limit"`
	Total      int64      `json:"total"`       // Total number of discounts matching the filter
	TotalPages int        `json:"total_pages"` // Total number of pages
}

// --- Validation Methods ---

// Validator instance (shared for efficiency)
var ValidateDiscount = validator.New()

// Validate runs validations defined by the 'validate' tags on the struct.
func (r *CreateDiscountRequest) Validate() error {
	return ValidateDiscount.Struct(r)
}

func (r *UpdateDiscountRequest) Validate() error {
	return ValidateDiscount.Struct(r)
}

func (r *LinkDiscountRequest) Validate() error {
	return ValidateDiscount.Struct(r)
}

func (r *UnlinkDiscountRequest) Validate() error {
	return ValidateDiscount.Struct(r)
}

// Validate runs validations defined by the 'validate' tags on the struct.
func (r *ListDiscountsRequest) Validate() error {
	// Basic struct tag validation
	if err := ValidateDiscount.Struct(r); err != nil {
		return err
	}

	// Custom validation: if both dates are provided, ensure ValidUntil is not before ValidFrom
	if r.ValidFrom != nil && r.ValidUntil != nil && r.ValidUntil.Before(*r.ValidFrom) {
		return errors.New("valid_until cannot be before valid_from")
	}

	return nil
}

// --- Helper Methods (if needed) ---

// IsValid checks if the discount is currently valid based on its dates and usage limits.
// This is a business logic method on the model.
func (d *Discount) IsValid() bool {
	now := time.Now()
	return d.IsActive &&
		d.ValidFrom.Before(now) &&
		d.ValidUntil.After(now) &&
		(d.MaxUses == nil || d.CurrentUses < *d.MaxUses)
}
