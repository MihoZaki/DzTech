package models

import (
	"time"

	"github.com/google/uuid"
)

type DeliveryService struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	Description   *string   `json:"description,omitempty"`
	BaseCostCents int64     `json:"base_cost_cents"`          // Base cost for this service
	EstimatedDays *int32    `json:"estimated_days,omitempty"` // Estimated delivery time
	IsActive      bool      `json:"is_active"`                // Whether the service is currently offered
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// CreateDeliveryServiceRequest represents data to create a new delivery service.
type CreateDeliveryServiceRequest struct {
	Name          string  `json:"name" validate:"required,max=255"`
	Description   *string `json:"description,omitempty"`
	BaseCostCents int64   `json:"base_cost_cents" validate:"min=0"` // Cost in cents
	EstimatedDays *int32  `json:"estimated_days,omitempty" validate:"omitempty,min=1"`
	IsActive      bool    `json:"is_active"`
}

// UpdateDeliveryServiceRequest represents data to update an existing delivery service.
type UpdateDeliveryServiceRequest struct {
	Name          *string `json:"name,omitempty" validate:"omitempty,max=255"`
	Description   *string `json:"description,omitempty"`
	BaseCostCents *int64  `json:"base_cost_cents,omitempty" validate:"omitempty,min=0"`
	EstimatedDays *int32  `json:"estimated_days,omitempty" validate:"omitempty,min=1"`
	IsActive      *bool   `json:"is_active,omitempty"`
}

// Validate methods for request structs
func (r *CreateDeliveryServiceRequest) Validate() error {
	return Validate.Struct(r)
}

func (r *UpdateDeliveryServiceRequest) Validate() error {
	return Validate.Struct(r)
}
