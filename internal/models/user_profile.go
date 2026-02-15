package models

import (
	"time"

	"github.com/google/uuid"
)

// UpdateProfileRequest holds the data for updating a user's profile information.
type UpdateProfileRequest struct {
	FullName *string `json:"full_name,omitempty" validate:"omitempty,max=255"` // Optional: New full name (up to 255 chars)
	Email    *string `json:"email,omitempty" validate:"omitempty,email"`       // Optional: New email address
}

// Validate implements custom validation logic if needed beyond struct tags.
// This is a placeholder, assuming you use a library like github.com/go-playground/validator/v10
// which primarily uses struct tags. You might add checks here if needed.
func (u *UpdateProfileRequest) Validate() error {
	return Validate.Struct(u)
}

// ChangePasswordRequest holds the data for changing a user's password.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`                     // Required: Current password for verification
	NewPassword     string `json:"new_password" validate:"required,min=8"`                   // Required: New password (minimum 8 chars)
	ConfirmPassword string `json:"confirm_password" validate:"required,eqfield=NewPassword"` // Required: Confirmation of new password
}

// Validate implements custom validation logic if needed beyond struct tags.
func (c *ChangePasswordRequest) Validate() error {
	return Validate.Struct(c)
}

// ForgotPasswordRequest holds the data for initiating a password reset.
type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"` // Required: Email address of the user requesting reset
}

// Validate implements custom validation logic if needed beyond struct tags.
func (f *ForgotPasswordRequest) Validate() error {
	return Validate.Struct(f)
}

// ResetPasswordRequest holds the data for completing a password reset.
type ResetPasswordRequest struct {
	Token           string `json:"token" validate:"required"`                                // Required: The reset token received via email
	NewPassword     string `json:"new_password" validate:"required,min=8"`                   // Required: New password (minimum 8 chars)
	ConfirmPassword string `json:"confirm_password" validate:"required,eqfield=NewPassword"` // Required: Confirmation of new password
}

// Validate implements custom validation logic if needed beyond struct tags.
func (r *ResetPasswordRequest) Validate() error {
	return Validate.Struct(r)
}

// UserProfileResponse represents the user's profile information returned after an update.
type UserProfileResponse struct {
	ID        uuid.UUID `json:"id"`         // Unique identifier for the user
	Email     string    `json:"email"`      // User's email address
	FullName  *string   `json:"full_name"`  // User's full name (can be null)
	CreatedAt time.Time `json:"created_at"` // Timestamp when the user account was created
	UpdatedAt time.Time `json:"updated_at"` // Timestamp when the user account was last updated
}

// PasswordChangeResponse represents the outcome of a password change request.
// Often, a simple success message is sufficient.
type PasswordChangeResponse struct {
	Message string `json:"message"` // Success message (e.g., "Password updated successfully")
}

// ForgotPasswordResponse represents the outcome of a forgot password request.
// Usually, a generic message is returned to avoid revealing user existence.
type ForgotPasswordResponse struct {
	Message string `json:"message"` // Message (e.g., "If your email exists in our system, a password reset link has been sent.")
}

// ResetPasswordResponse represents the outcome of a password reset request.
// Often, a success message is sufficient, potentially redirecting the user.
type ResetPasswordResponse struct {
	Message string `json:"message"` // Success message (e.g., "Password reset successfully. Please log in.")
}
