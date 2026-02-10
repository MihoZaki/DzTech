package models

import (
	"time"

	"github.com/MihoZaki/DzTech/internal/db"
	"github.com/google/uuid"
)

// DiscountType defines the type of discount.
type DiscountType string

const (
	DiscountTypePercentage   DiscountType = "percentage"
	DiscountTypeFixedAmount  DiscountType = "fixed_amount"
	DiscountTypeFreeShipping DiscountType = "free_shipping"
)

// TargetType defines what the discount applies to.
type TargetType string

const (
	TargetTypeProduct    TargetType = "product"
	TargetTypeCategory   TargetType = "category"
	TargetTypeOrderTotal TargetType = "order_total"
)

// Discount represents a discount rule.
// This is the service-level model, potentially adapted from the DB model (db.Discount).
type Discount struct {
	ID                     uuid.UUID    `json:"id"`
	Name                   string       `json:"name"`
	Description            *string      `json:"description,omitempty"`
	DiscountType           DiscountType `json:"discount_type"`
	DiscountValue          int64        `json:"discount_value"`
	TargetType             TargetType   `json:"target_type"`
	TargetID               *uuid.UUID   `json:"target_id,omitempty"` // Nullable depending on TargetType
	StartDate              time.Time    `json:"start_date"`
	EndDate                time.Time    `json:"end_date"`
	MinOrderAmountCents    *int64       `json:"min_order_amount_cents,omitempty"`
	MaxDiscountAmountCents *int64       `json:"max_discount_amount_cents,omitempty"`
	UsageLimit             *int32       `json:"usage_limit,omitempty"`
	UsageCount             int32        `json:"usage_count"`
	IsActive               bool         `json:"is_active"`
	CreatedAt              time.Time    `json:"created_at"`
	UpdatedAt              time.Time    `json:"updated_at"`
}

// FromDB converts the generated db.Discount to the service-level models.Discount.
func (d *Discount) FromDB(dbDisc *db.Discount) {}
