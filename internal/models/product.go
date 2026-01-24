package models

import (
	"time"

	"github.com/google/uuid"
)

type Product struct {
	ID               uuid.UUID      `json:"id"`
	CategoryID       uuid.UUID      `json:"category_id"`
	Name             string         `json:"name"`
	Slug             string         `json:"slug"`
	Description      *string        `json:"description,omitempty"`
	ShortDescription *string        `json:"short_description,omitempty"`
	PriceCents       int64          `json:"price_cents"`
	StockQuantity    int            `json:"stock_quantity"`
	Status           string         `json:"status"`
	Brand            string         `json:"brand"`
	ImageUrls        []string       `json:"image_urls"`
	SpecHighlights   map[string]any `json:"spec_highlights"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        *time.Time     `json:"deleted_at,omitempty"`
}

type Category struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	Slug      string     `json:"slug"`
	Type      string     `json:"type"`
	ParentID  *uuid.UUID `json:"parent_id,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

type CreateProductRequest struct {
	CategoryID       uuid.UUID      `json:"category_id" validate:"required,uuid"`
	Name             string         `json:"name" validate:"required,max=255"`
	Slug             string         `json:"slug" validate:"required,max=255"`
	Description      *string        `json:"description,omitempty"`
	ShortDescription *string        `json:"short_description,omitempty"`
	PriceCents       int64          `json:"price_cents" validate:"required,min=0"`
	StockQuantity    int            `json:"stock_quantity" validate:"min=0"`
	Status           string         `json:"status" validate:"required,oneof=draft active discontinued"`
	Brand            string         `json:"brand" validate:"required,max=100"`
	ImageUrls        []string       `json:"image_urls" validate:"max=10"`
	SpecHighlights   map[string]any `json:"spec_highlights"`
}

type ProductFilter struct {
	Query       string    `json:"query,omitempty"`
	CategoryID  uuid.UUID `json:"category_id,omitempty"`
	Brand       string    `json:"brand,omitempty"`
	MinPrice    *int64    `json:"min_price,omitempty"`
	MaxPrice    *int64    `json:"max_price,omitempty"`
	InStockOnly *bool     `json:"in_stock_only,omitempty"`
	Page        int       `json:"page"`
	Limit       int       `json:"limit"`
}

type PaginatedResponse struct {
	Data       any   `json:"data"`
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

type UpdateProductRequest struct {
	CategoryID       *uuid.UUID      `json:"category_id,omitempty" validate:"omitempty,uuid"`
	Name             *string         `json:"name,omitempty" validate:"omitempty,max=255"`
	Slug             *string         `json:"slug,omitempty" validate:"omitempty,max=255"`
	Description      *string         `json:"description,omitempty"`
	ShortDescription *string         `json:"short_description,omitempty"`
	PriceCents       *int64          `json:"price_cents,omitempty" validate:"omitempty,min=0"`
	StockQuantity    *int            `json:"stock_quantity,omitempty" validate:"omitempty,min=0"`
	Status           *string         `json:"status,omitempty" validate:"omitempty,oneof=draft active discontinued"`
	Brand            *string         `json:"brand,omitempty" validate:"omitempty,max=100"`
	ImageUrls        *[]string       `json:"image_urls,omitempty" validate:"omitempty,max=10"`
	SpecHighlights   *map[string]any `json:"spec_highlights,omitempty"`
}

func (r *CreateProductRequest) Validate() error {
	return Validate.Struct(r)
}

func (upr *UpdateProductRequest) Validate() error {
	return Validate.Struct(upr)
}
