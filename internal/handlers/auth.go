package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/MihoZaki/DzTech/db"
	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/golang-jwt/jwt/v5"
)

type AuthHandler struct {
	JWTSecret []byte
}

func NewAuthHandler(jwtSecret string) *AuthHandler {
	return &AuthHandler{
		JWTSecret: []byte(jwtSecret),
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

	// Check if user already exists
	existingUser, _ := models.GetUserByEmail(r.Context(), db.Conn, req.Email)
	if existingUser != nil {
		utils.SendErrorResponse(w, http.StatusConflict, "User Already Exists", "A user with this email already exists")
		return
	}

	user := &models.User{
		Email:    req.Email,
		FullName: req.FullName,
		IsAdmin:  false,
	}

	if err := user.HashPassword(req.Password); err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to hash password")
		return
	}

	if err := user.Create(r.Context(), db.Conn); err != nil {
		log.Printf("Failed to create user: %v", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to create user")
		return
	}

	token, err := h.generateToken(user)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to generate token")
		return
	}

	response := models.LoginResponse{
		Token: token,
		User:  *user,
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

	user, err := models.GetUserByEmail(r.Context(), db.Conn, req.Email)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid Credentials", "Invalid email or password")
		return
	}

	if err := user.CheckPassword(req.Password); err != nil {
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Invalid Credentials", "Invalid email or password")
		return
	}

	token, err := h.generateToken(user)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to generate token")
		return
	}

	response := models.LoginResponse{
		Token: token,
		User:  *user,
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
		return fmt.Sprintf("Must be at least %s characters", err.Param())
	case "max":
		return fmt.Sprintf("Must be no more than %s characters", err.Param())
	default:
		return "Invalid value"
	}
}

func (h *AuthHandler) generateToken(user *models.User) (string, error) {
	expiry := time.Now().Add(15 * time.Minute)
	refreshExpiry := time.Now().Add(7 * 24 * time.Hour) // 7 days

	claims := jwt.MapClaims{
		"user_id":     user.ID,
		"email":       user.Email,
		"is_admin":    user.IsAdmin,
		"exp":         expiry.Unix(),
		"refresh_exp": refreshExpiry.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(h.JWTSecret)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	// Implementation for refresh token (cookie-based or header-based)
	utils.SendErrorResponse(w, http.StatusNotImplemented, "Not Implemented", "Refresh endpoint not implemented")
}

func (h *AuthHandler) RegisterRoutes(r chi.Router) {
	r.Post("/register", h.Register)
	r.Post("/login", h.Login)
	r.Post("/refresh", h.Refresh)
}
