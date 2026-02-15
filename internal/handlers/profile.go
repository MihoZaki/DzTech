package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings" // Add strings import for checking error messages

	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// ProfileHandler handles HTTP requests for user profile updates and password recovery.
type ProfileHandler struct {
	service      *services.UserService
	emailService *services.ConcreteEmailService // Pass the concrete type or interface if defined
	logger       *slog.Logger
}

// NewProfileHandler creates a new instance of ProfileHandler.
func NewProfileHandler(service *services.UserService, emailService *services.ConcreteEmailService, logger *slog.Logger) *ProfileHandler {
	return &ProfileHandler{
		service:      service,
		emailService: emailService,
		logger:       logger,
	}
}

// RegisterRoutes registers the profile and password-related routes under the given router.
// This should be mounted under the authenticated user routes (e.g., /api/v1/user).
func (h *ProfileHandler) RegisterRoutes(r chi.Router) {
	// Authenticated Profile Routes
	r.Put("/profile", h.UpdateProfile)          // PUT /api/v1/user/profile (authenticated)
	r.Put("/password/change", h.ChangePassword) // PUT /api/v1/user/password/change (authenticated)
}

// RegisterAuthRoutes registers the public password recovery routes under the given router.
// This should be mounted under the public auth routes (e.g., /api/v1/auth).
func (h *ProfileHandler) RegisterAuthRoutes(r chi.Router) {
	r.Post("/forgot-password", h.ForgotPassword) // POST /api/v1/auth/forgot-password
	r.Post("/reset-password", h.ResetPassword)   // POST /api/v1/auth/reset-password
}

// UpdateProfile handles the request to update user profile information.
func (h *ProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	// 1. Extract UserID from JWT context (existing logic)
	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user accessing profile", "user_id", user.ID)
		userIDVal = &user.ID
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}
	userID := *userIDVal

	// 2. Decode Request Body into UpdateProfileRequest
	var req models.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in UpdateProfile request", "error", err)
		http.Error(w, `{"error": "Invalid JSON", "message": "Request body contains invalid JSON"}`, http.StatusBadRequest)
		return
	}

	// 3. Validate the request struct
	if err := req.Validate(); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 4. Call the Service Method
	profileResponse, err := h.service.UpdateProfile(r.Context(), userID, req)
	if err != nil {
		h.logger.Error("Failed to update profile", "error", err, "user_id", userID)
		// Consider more specific error messages based on the error type if needed
		// For now, use a generic internal error
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to update profile"}`, http.StatusInternalServerError)
		return
	}

	// 5. Send Success Response (200 OK)
	h.logger.Info("Profile updated successfully", "user_id", userID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	if err := json.NewEncoder(w).Encode(profileResponse); err != nil {
		// Log encoding error, but response headers might already be sent
		h.logger.Error("Failed to encode UpdateProfile response", "error", err)
	}
}

// ChangePassword handles the request to change the user's password.
func (h *ProfileHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	// 1. Extract UserID from JWT context (existing logic)
	var userIDVal *uuid.UUID
	if user, ok := models.GetUserFromContext(r.Context()); ok {
		h.logger.Debug("Authenticated user changing password", "user_id", user.ID)
		userIDVal = &user.ID
	}
	if userIDVal == nil {
		http.Error(w, "Unauthorized: missing user context", http.StatusUnauthorized)
		return
	}
	userID := *userIDVal

	// 2. Decode Request Body into ChangePasswordRequest
	var req models.ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in ChangePassword request", "error", err)
		http.Error(w, `{"error": "Invalid JSON", "message": "Request body contains invalid JSON"}`, http.StatusBadRequest)
		return
	}

	// 3. Validate the request struct
	if err := req.Validate(); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 4. Call the Service Method
	err := h.service.ChangePassword(r.Context(), userID, req)
	if err != nil {
		h.logger.Error("Failed to change password", "error", err, "user_id", userID)
		// Provide more specific error messages based on the error *string* returned by the service
		var errorMsg string
		var statusCode int
		errStr := err.Error()
		if strings.Contains(errStr, "current password is incorrect") {
			errorMsg = "Current password is incorrect"
			statusCode = http.StatusUnauthorized
		} else if strings.Contains(errStr, "must be at least 8 characters long") {
			errorMsg = "New password must be at least 8 characters long"
			statusCode = http.StatusBadRequest
		} else if strings.Contains(errStr, "do not match") {
			errorMsg = "New password and confirmation do not match"
			statusCode = http.StatusBadRequest
		} else if strings.Contains(errStr, "user not found") {
			errorMsg = "User not found"
			statusCode = http.StatusNotFound
		} else {
			// Generic error for unexpected issues
			errorMsg = "Failed to change password"
			statusCode = http.StatusInternalServerError
		}
		http.Error(w, fmt.Sprintf(`{"error": "Bad Request", "message": "%s"}`, errorMsg), statusCode)
		return
	}

	// 5. Send Success Response (200 OK or 204 No Content)
	h.logger.Info("Password changed successfully", "user_id", userID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK or 204 No Content

	json.NewEncoder(w).Encode(models.PasswordChangeResponse{Message: "Password updated successfully"})
}

// ForgotPassword handles the request to initiate password recovery.
func (h *ProfileHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	// 1. Decode Request Body into ForgotPasswordRequest
	var req models.ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in ForgotPassword request", "error", err)
		http.Error(w, `{"error": "Invalid JSON", "message": "Request body contains invalid JSON"}`, http.StatusBadRequest)
		return
	}

	// 2. Validate the request struct
	if err := req.Validate(); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 3. Call the Service Method
	err := h.service.ForgotPassword(r.Context(), req)
	if err != nil {
		h.logger.Error("Failed to initiate password recovery", "error", err, "email", req.Email)
	}

	// 4. Send Generic Success Response (200 OK)
	// Regardless of whether the email exists or the email sending succeeded/failed,
	// return a generic message to the client to prevent enumeration attacks.
	h.logger.Info("Forgot password request processed", "email", req.Email)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	json.NewEncoder(w).Encode(models.ForgotPasswordResponse{Message: "If your email exists in our system, a password reset link has been sent."})
}

// ResetPassword handles the request to complete password recovery using a token.
func (h *ProfileHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	// 1. Decode Request Body into ResetPasswordRequest
	var req models.ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Invalid JSON in ResetPassword request", "error", err)
		http.Error(w, `{"error": "Invalid JSON", "message": "Request body contains invalid JSON"}`, http.StatusBadRequest)
		return
	}

	// 2. Validate the request struct
	if err := req.Validate(); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 3. Call the Service Method
	err := h.service.ResetPassword(r.Context(), req)
	if err != nil {
		h.logger.Error("Failed to reset password", "error", err, "token", req.Token)
		// Provide a specific error message for known errors returned by the service
		errStr := err.Error()
		if strings.Contains(errStr, "invalid or expired password reset token") {
			http.Error(w, `{"error": "Invalid or Expired Token", "message": "The password reset token is invalid or has expired."}`, http.StatusBadRequest)
			return
		}
		// For other errors (e.g., DB issues, hashing issues), return a generic error
		http.Error(w, `{"error": "Internal Server Error", "message": "Failed to reset password"}`, http.StatusInternalServerError)
		return
	}

	// 4. Send Success Response (200 OK)
	h.logger.Info("Password reset successfully", "token_used", req.Token)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	json.NewEncoder(w).Encode(models.ResetPasswordResponse{Message: "Password reset successfully. Please log in."})
}
