// internal/handlers/auth_handler.go

package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/services"
	"github.com/MihoZaki/DzTech/internal/utils"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	// Import the models package containing RefreshRequest, RefreshResponse, LogoutRequest, LoginResponse
	// Assuming they are in the same package or correctly imported path
)

type AuthHandler struct {
	authService *services.AuthService // Use AuthService instead of UserService directly for auth logic
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler { // Take AuthService
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.UserRegister
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid JSON", "Request body contains invalid JSON")
		return
	}

	if err := req.Validate(); err != nil {
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		utils.SendValidationError(w, fieldErrors)
		return
	}

	// Call AuthService for registration - now expects LoginResponse
	loginResp, err := h.authService.Register(r.Context(), req.Email, req.Password, req.FullName)
	if err != nil {
		if err.Error() == "user already exists" {
			utils.SendErrorResponse(w, http.StatusConflict, "User Already Exists", "A user with this email already exists")
			return
		}
		slog.Error("Failed to register user", "error", err, "email", req.Email)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to register user")
		return
	}

	slog.Info("User registered successfully", "user_id", loginResp.User.ID, "email", req.Email)

	// Send the response containing the access/refresh tokens and user details
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)    // 201 Created for registration
	json.NewEncoder(w).Encode(loginResp) // Encode LoginResponse
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.UserLogin
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid JSON", "Request body contains invalid JSON")
		return
	}

	if err := req.Validate(); err != nil {
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		utils.SendValidationError(w, fieldErrors)
		return
	}

	// Use AuthService to handle login - now expects LoginResponse
	loginResp, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if err.Error() == "invalid credentials" {
			slog.Info("Login failed: invalid credentials", "email", req.Email)
			utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid Credentials", "Invalid email or password")
			return
		}
		slog.Error("Failed to authenticate user", "error", err, "email", req.Email)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to authenticate user")
		return
	}

	slog.Info("User logged in successfully", "user_id", loginResp.User.ID, "email", loginResp.User.Email)

	// Send the response containing the access/refresh tokens and user details
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(loginResp) // Encode LoginResponse
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req models.RefreshRequest // Use the new model
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid JSON", "Request body contains invalid JSON")
		return
	}

	// Validate the request struct (optional, if using validator tags)
	if err := req.Validate(); err != nil {
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		utils.SendValidationError(w, fieldErrors)
		return
	}

	// Call AuthService to perform the refresh logic
	newTokens, err := h.authService.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		slog.Error("Failed to refresh token", "error", err)
		// Return 401 for invalid/expired/revoked token
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}

	// Send the response containing the new access/refresh tokens
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)         // 200 OK
	json.NewEncoder(w).Encode(newTokens) // Encode RefreshResponse
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req models.LogoutRequest // Use the new model
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Invalid JSON", "Request body contains invalid JSON")
		return
	}

	// Validate the request struct (optional, if using validator tags)
	if err := req.Validate(); err != nil {
		fieldErrors := make(map[string]string)
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, err := range validationErrors {
				fieldErrors[err.Field()] = formatValidationError(err)
			}
		}
		utils.SendValidationError(w, fieldErrors)
		return
	}

	// Call AuthService to perform the logout/revocation logic
	err := h.authService.Logout(r.Context(), req.RefreshToken)
	if err != nil {
		slog.Error("Failed to logout", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to logout")
		return
	}

	// Send 204 No Content on successful logout
	w.WriteHeader(http.StatusNoContent) // 204 No Content
}

func formatValidationError(err validator.FieldError) string {
	switch err.Tag() {
	case "required":
		return "This field is required"
	case "email":
		return "Must be a valid email address"
	case "min":
		return "Must be at least " + err.Param() + " characters"
	case "max":
		return "Must be no more than " + err.Param() + " characters"
	default:
		return "Invalid value"
	}
}

func (h *AuthHandler) RegisterRoutes(r chi.Router) {
	r.Post("/register", h.Register)
	r.Post("/login", h.Login)
	r.Post("/refresh", h.Refresh)
	r.Post("/logout", h.Logout) // Add logout route
}
