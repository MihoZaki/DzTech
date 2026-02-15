package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// DecodeAndValidateJSON reads the request body, decodes it into the target struct,
// and validates it using the validator library.
// It sends a 400 Bad Request response if decoding or validation fails.
func DecodeAndValidateJSON(w http.ResponseWriter, r *http.Request, target models.Validator) error {
	err := json.NewDecoder(r.Body).Decode(target)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "Invalid JSON body.")
		return fmt.Errorf("invalid JSON: %w", err)
	}

	// Directly call Validate on target
	if err := target.Validate(); err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", fmt.Sprintf("Validation failed: %v", err))
		return fmt.Errorf("validation failed: %w", err)
	}
	return nil
}

// ParseUUIDPathParam extracts a UUID from a named path parameter using chi.
// It sends a 400 Bad Request response if the parameter is missing or invalid.
func ParseUUIDPathParam(w http.ResponseWriter, r *http.Request, paramName string) (uuid.UUID, error) {
	paramStr := chi.URLParam(r, paramName)
	if paramStr == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", fmt.Sprintf("%s path parameter is required.", paramName))
		return uuid.Nil, fmt.Errorf("missing %s path parameter", paramName)
	}

	parsedUUID, err := uuid.Parse(paramStr)
	if err != nil {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", fmt.Sprintf("Invalid %s format.", paramName))
		return uuid.Nil, fmt.Errorf("invalid %s format: %w", paramName, err)
	}

	return parsedUUID, nil
}

// GetSessionIDFromHeader extracts the session ID from the X-Session-ID header.
// It sends a 400 Bad Request response if the header is missing.
func GetSessionIDFromHeader(w http.ResponseWriter, r *http.Request, logger *slog.Logger) (string, bool) {
	sessionID := r.Header.Get("X-Session-ID")
	if sessionID == "" {
		utils.SendErrorResponse(w, http.StatusBadRequest, "Bad Request", "A session ID header (X-Session-ID) is required.")
		logger.Debug("Missing X-Session-ID header")
		return "", false
	}
	return sessionID, true
}

// MapServiceErrToHTTPStatus attempts to map a service-layer error to an appropriate HTTP status code and message.
// It returns the status code and the detail message.
func MapServiceErrToHTTPStatus(err error) (int, string) {
	errMsg := strings.ToLower(err.Error())

	// Add more mappings as needed based on service error messages or types.
	if strings.Contains(errMsg, "not found") {
		return http.StatusNotFound, "Resource not found."
	}
	if strings.Contains(errMsg, "access denied") || strings.Contains(errMsg, "does not belong") {
		return http.StatusForbidden, "Access denied."
	}
	if strings.Contains(errMsg, "stock") || strings.Contains(errMsg, "check") || strings.Contains(errMsg, "constraint") {
		return http.StatusConflict, "Request conflicts with current state (e.g., insufficient stock)."
	}
	return http.StatusInternalServerError, "An internal server error occurred."
}

// SendServiceError sends an appropriate HTTP error response based on the service error.
func SendServiceError(w http.ResponseWriter, logger *slog.Logger, operation string, err error) {
	status, detail := MapServiceErrToHTTPStatus(err)
	logger.Error(fmt.Sprintf("Failed to %s", operation), "error", err)
	utils.SendErrorResponse(w, status, http.StatusText(status), detail)
}

// getSessionIDFromCookie extracts the session ID from the "session_id" cookie.
func GetSessionIDFromCookie(r *http.Request) (string, bool) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		slog.Debug("Session cookie not found in request", "error", err)
		return "", false
	}
	return cookie.Value, true
}

// setSessionIDCookie sets the "session_id" cookie in the response.
// It generates a new UUID if no session ID exists yet.
// It configures the cookie with HttpOnly and SameSite flags for security.
func SetSessionIDCookie(w http.ResponseWriter, sessionID string) {
	if sessionID == "" {
		// Generate a new session ID if none exists
		sessionID = uuid.New().String()
		slog.Debug("Generated new session ID for cookie", "session_id", sessionID)
	}

	cookie := &http.Cookie{
		Name:     "session_id",            // Name of the cookie
		Value:    sessionID,               // The session ID value
		Path:     "/",                     // Cookie is valid for the entire site
		HttpOnly: true,                    // Prevents JavaScript access (security)
		Secure:   false,                   // Set to true if using HTTPS in production
		SameSite: http.SameSiteStrictMode, // Mitigate CSRF (adjust if needed for cross-origin requests)
		MaxAge:   86400,                   // Cookie expires in 24 hours (86400 seconds)
		// Expires:  time.Now().Add(24 * time.Hour), // Alternative to MaxAge
	}

	http.SetCookie(w, cookie) // Add the cookie to the response headers
}
