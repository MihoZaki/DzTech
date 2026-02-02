package models

import (
	"time"

	"github.com/google/uuid"
)

// AdminUserListItem represents a user entry in the admin user list/detail view.
type AdminUserListItem struct {
	ID               uuid.UUID  `json:"id"`
	Name             string     `json:"name"` // Derived from FullName
	Email            string     `json:"email"`
	RegistrationDate time.Time  `json:"registration_date"`         // From users.created_at
	LastOrderDate    *time.Time `json:"last_order_date,omitempty"` // From latest order's created_at
	OrderCount       int64      `json:"order_count"`               // Aggregated from orders
	ActivityStatus   string     `json:"activity_status"`           // "Active" or "Inactive"
}

// AdminUpdateUserRequest represents data to update a user's details/status.
type AdminUpdateUserRequest struct {
	IsActive *bool   `json:"is_active,omitempty"` // Admin can set active/inactive (via soft delete)
	IsAdmin  *bool   `json:"is_admin,omitempty"`  // Admin can promote/demote admin status
	FullName *string `json:"full_name,omitempty"` // Admin can potentially update name (be careful)
}

// AdminActivateUserRequest represents data for activating a user (currently empty, could add audit reason later).
type AdminActivateUserRequest struct {
	// Potentially add fields like 'reason' for activation if needed
}

// AdminDeactivateUserRequest represents data for deactivating a user (currently empty, could add audit reason later).
type AdminDeactivateUserRequest struct {
	// Potentially add fields like 'reason' for deactivation if needed
}
