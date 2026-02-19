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
)

const RefreshTokenCookieName = "refresh_token" // Define a constant for the cookie name

type AuthHandler struct {
	authService *services.AuthService // Use AuthService instead of UserService directly for auth logic
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler { // Take AuthService
	return &AuthHandler{
		authService: authService,
	}
}

// deleteGuestSessionCookie sets the 'session_id' cookie to be deleted by the browser.
func deleteGuestSessionCookie(w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:  "session_id", // Name of the cookie to delete
		Value: "",           // Empty value
		Path:  "/",          // Same path it was set with (usually '/')
		// Domain:  "",                      // Same domain it was set with (or inferred)
		MaxAge:   -1,              // Delete cookie immediately
		Expires:  time.Unix(0, 0), // Expire immediately (Unix epoch)
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	}
	http.SetCookie(w, cookie) // Add the deletion instruction to the response headers
}

// Helper function to set the refresh token cookie
func setRefreshTokenCookie(w http.ResponseWriter, token string) {
	cookie := &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    token,
		Path:     "/",                                 // Accessible from all paths under /
		HttpOnly: true,                                // Prevents JavaScript access (crucial for security)
		Secure:   true,                                // Requires HTTPS (set to false for local testing with http)
		SameSite: http.SameSiteStrictMode,             // CSRF protection
		MaxAge:   int((7 * 24 * time.Hour).Seconds()), // 7 days expiry (should match RT expiry in service)
		// Expires: time.Now().Add(7 * 24 * time.Hour), // Alternative to MaxAge
	}
	http.SetCookie(w, cookie)
}

// Helper function to clear the refresh token cookie
func clearRefreshTokenCookie(w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    "", // Empty value
		Path:     "/",
		HttpOnly: true,
		Secure:   true, // Should match how it was set
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,              // Delete cookie
		Expires:  time.Unix(0, 0), // Expire immediately
	}
	http.SetCookie(w, cookie)
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
	var guestSessionID string
	sessionCookie, err := r.Cookie("session_id") // Read the session_id cookie
	if err == nil {                              // Cookie found
		guestSessionID = sessionCookie.Value
		slog.Debug("Found guest session ID in cookie for registration", "session_id", guestSessionID)
	} else {
		slog.Debug("No guest session ID cookie found during registration", "error", err) // Usually means no guest cart
	}
	loginResp, refreshTokenStr, err := h.authService.Register(r.Context(), req.Email, req.Password, req.FullName, guestSessionID)
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

	// Set the refresh token as a secure HTTP-only cookie
	setRefreshTokenCookie(w, refreshTokenStr)

	// --- DELETE THE GUEST SESSION COOKIE AFTER SUCCESSFUL REGISTRATION ---
	if guestSessionID != "" {
		deleteGuestSessionCookie(w)
		slog.Debug("Guest session ID cookie marked for deletion after registration", "session_id", guestSessionID)
	}

	// Send the response containing only the access token and user details (refresh token is in cookie)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)    // 201 Created for registration
	json.NewEncoder(w).Encode(loginResp) // Encode LoginResponse (without refresh token)
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
	var guestSessionID string
	sessionCookie, err := r.Cookie("session_id") // Read the session_id cookie
	if err == nil {                              // Cookie found
		guestSessionID = sessionCookie.Value
		slog.Debug("Found guest session ID in cookie for login", "session_id", guestSessionID)
	} else {
		slog.Debug("No guest session ID cookie found during login", "error", err) // Usually means no guest cart
	}

	// Use AuthService to handle login - now expects (LoginResponse, refreshTokenString, error)
	loginResp, refreshTokenStr, err := h.authService.Login(r.Context(), req.Email, req.Password, guestSessionID)
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

	// Set the refresh token as a secure HTTP-only cookie
	setRefreshTokenCookie(w, refreshTokenStr)

	// --- DELETE THE GUEST SESSION COOKIE AFTER SUCCESSFUL LOGIN ---
	if guestSessionID != "" {
		deleteGuestSessionCookie(w)
		slog.Debug("Guest session ID cookie marked for deletion after login", "session_id", guestSessionID)
	}

	// Send the response containing only the access token and user details (refresh token is in cookie)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(loginResp) // Encode LoginResponse (without refresh token)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	// Read the refresh token from the cookie
	refreshTokenCookie, err := r.Cookie(RefreshTokenCookieName)
	if err != nil {
		// Cookie not found or invalid
		slog.Warn("Refresh token cookie not found or invalid", "error", err)
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Unauthorized", "Refresh token not found or invalid")
		return
	}
	refreshTokenStr := refreshTokenCookie.Value

	// Call AuthService to perform the refresh logic (returns new access token and new refresh token string)
	newAccessToken, newRefreshTokenStr, err := h.authService.Refresh(r.Context(), refreshTokenStr)
	if err != nil {
		slog.Error("Failed to refresh token", "error", err)
		// Clear the invalid cookie if the token was rejected
		clearRefreshTokenCookie(w)
		// Return 401 for invalid/expired/revoked token
		utils.SendErrorResponse(w, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}

	// If rotation is enabled, set the *new* refresh token as the cookie
	if newRefreshTokenStr != "" {
		setRefreshTokenCookie(w, newRefreshTokenStr)
	}
	slog.Debug("user asked for a refresh token", "refresh_token", newRefreshTokenStr)

	// Send the response containing only the new access token
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)                                                   // 200 OK
	json.NewEncoder(w).Encode(models.RefreshResponse{AccessToken: newAccessToken}) // Encode RefreshResponse (without refresh token)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Read the refresh token from the cookie
	refreshTokenCookie, err := r.Cookie(RefreshTokenCookieName)
	if err != nil {
		// Cookie not found. Log as warning, but treat as successful logout attempt.
		slog.Warn("Logout attempt without refresh token cookie", "error", err)
		// Still clear the cookie if it exists (might be stale)
		clearRefreshTokenCookie(w)
		w.WriteHeader(http.StatusNoContent) // 204 No Content
		return
	}
	refreshTokenStr := refreshTokenCookie.Value

	// Call AuthService to perform the logout/revocation logic
	err = h.authService.Logout(r.Context(), refreshTokenStr)
	if err != nil {
		slog.Error("Failed to logout", "error", err)
		utils.SendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", "Failed to logout")
		return
	}

	// Clear the refresh token cookie after successful revocation
	clearRefreshTokenCookie(w)

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
