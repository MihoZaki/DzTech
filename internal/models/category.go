package models

import (
	"time"

	"github.com/google/uuid"
)

type Category struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	Slug      string     `json:"slug"`
	Type      string     `json:"type"`
	ParentID  *uuid.UUID `json:"parent_id,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// CreateCategoryRequest holds data for creating a new category.
type CreateCategoryRequest struct {
	Name     string    `json:"name" validate:"required,max=255"`
	Type     string    `json:"type" validate:"required,max=100"`
	ParentID uuid.UUID `json:"parent_id,omitempty" validate:"omitempty,uuid"` // Must be a valid UUID if provided
}

// UpdateCategoryRequest holds data for updating an existing category.
type UpdateCategoryRequest struct {
	Name     *string   `json:"name,omitempty" validate:"omitempty,max=255"` // Pointers allow optional updates
	Type     *string   `json:"type,omitempty" validate:"omitempty,max=100"`
	ParentID uuid.UUID `json:"parent_id,omitempty" validate:"omitempty,uuid"`
}

func (r *CreateCategoryRequest) Validate() error {
	return Validate.Struct(r)
}

func (upr *UpdateCategoryRequest) Validate() error {
	return Validate.Struct(upr)
}
