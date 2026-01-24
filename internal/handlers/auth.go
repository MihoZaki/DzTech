package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/services"
	"github.com/MihoZaki/DzTech/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/golang-jwt/jwt/v5"
)

type AuthHandler struct {
	userService *services.UserService
	jwtSecret   []byte
}

func NewAuthHandler(userService *services.UserService, jwtSecret string) *AuthHandler {
	return &AuthHandler{
		userService: userService,
		jwtSecret:   []byte(jwtSecret),
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

	// Call service layer for registration - now returns uuid.UUID
	userID, err := h.userService.Register(r.Context(), req.Email, req.Password, req.FullName)
	if err != nil {
		if err.Error() == "user already exists" {
			utils.SendErrorResponse(w, http.StatusConflict, "User Already Exists", "A user with this email already exists")
			return
		}
		slog.Error("Failed to register user", "error", err, "email", req.Email)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to register user")
		return
	}

	slog.Info("User registered successfully", "user_id", userID, "email", req.Email)

	// Generate JWT token - convert uuid.UUID to string for the token
	token, err := h.generateToken(userID.String(), req.Email, false) // assuming not admin
	if err != nil {
		slog.Error("Failed to generate token", "error", err, "user_id", userID)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to generate token")
		return
	}

	// Create response - use the uuid.UUID directly
	response := models.LoginResponse{
		Token: token,
		User: models.User{
			ID:       userID, // Now uuid.UUID
			Email:    req.Email,
			FullName: req.FullName,
			IsAdmin:  false,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
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

	// Use service layer to authenticate user
	user, err := h.userService.Authenticate(r.Context(), req.Email, req.Password)
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

	slog.Info("User logged in successfully", "user_id", user.ID, "email", user.Email)

	// Generate JWT token - convert uuid.UUID to string for the token
	token, err := h.generateToken(user.ID.String(), user.Email, user.IsAdmin)
	if err != nil {
		slog.Error("Failed to generate token", "error", err, "user_id", user.ID)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to generate token")
		return
	}

	// Create response - user is already of type *models.User with uuid.UUID ID
	response := models.LoginResponse{
		Token: token,
		User:  *user, // user is already of type *models.User with uuid.UUID ID
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
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

func (h *AuthHandler) generateToken(userID, email string, isAdmin bool) (string, error) {
	expiry := time.Now().Add(30 * time.Minute)
	refreshExpiry := time.Now().Add(7 * 24 * time.Hour) // 7 days

	claims := jwt.MapClaims{
		"user_id":     userID, // This should be string for the token
		"email":       email,
		"is_admin":    isAdmin,
		"exp":         expiry.Unix(),
		"refresh_exp": refreshExpiry.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(h.jwtSecret)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	slog.Warn("Refresh endpoint not implemented")
	utils.SendErrorResponse(w, http.StatusNotImplemented, "Not Implemented", "Refresh endpoint not implemented")
}

func (h *AuthHandler) RegisterRoutes(r chi.Router) {
	r.Post("/register", h.Register)
	r.Post("/login", h.Login)
	r.Post("/refresh", h.Refresh)
}
