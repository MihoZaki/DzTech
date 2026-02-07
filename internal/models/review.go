package models

import (
	"time"

	"github.com/google/uuid"
)

// Review represents a user's rating for a product (core model, potentially used internally).
type Review struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"` // Core ID
	ProductID uuid.UUID `json:"product_id"`
	Rating    int       `json:"rating" validate:"required,min=1,max=5"` // Star rating (1 to 5)
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ReviewListItem represents a review for display purposes, including the reviewer's name.
type ReviewListItem struct {
	ID           uuid.UUID `json:"id"`
	UserID       uuid.UUID `json:"user_id,omitempty"` // Potentially omit if name is shown
	ReviewerName string    `json:"reviewer_name"`     // Added field for display
	ProductID    uuid.UUID `json:"product_id"`        // Might be omitted if fetched for a specific product
	Rating       int       `json:"rating"`            // The star rating (1-5)
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ReviewByUserListItem represents a review submitted by the user, including the product name.
type ReviewByUserListItem struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id,omitempty"` // Potentially omit if context is clear
	ProductID   uuid.UUID `json:"product_id"`
	ProductName string    `json:"product_name"` // Added field for display
	Rating      int       `json:"rating"`       // The star rating (1-5)
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateReviewRequest represents the request body for creating a review.
type CreateReviewRequest struct {
	ProductID uuid.UUID `json:"product_id" validate:"required,uuid"`
	Rating    int       `json:"rating" validate:"required,min=1,max=5"`
}

// UpdateReviewRequest represents the request body for updating a review's rating.
type UpdateReviewRequest struct {
	Rating int `json:"rating" validate:"required,min=1,max=5"`
}

type GetReviewsByProductResponse struct {
	Reviews []ReviewListItem `json:"reviews"`
	Page    int              `json:"page,omitempty"`
	Limit   int              `json:"limit,omitempty"`
	Total   int64            `json:"total,omitempty"`
}

type GetReviewsByUserResponse struct {
	Reviews []ReviewByUserListItem `json:"reviews"`
	Page    int                    `json:"page,omitempty"`
	Limit   int                    `json:"limit,omitempty"`
	Total   int64                  `json:"total,omitempty"`
}

func (cr *CreateReviewRequest) Validate() error {
	return Validate.Struct(cr)
}

func (ur *UpdateReviewRequest) Validate() error {
	return Validate.Struct(ur)
}
