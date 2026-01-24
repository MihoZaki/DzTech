package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/MihoZaki/DzTech/internal/config"
	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/MihoZaki/DzTech/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func JWTMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				// No token provided, allow request to proceed without adding user to context
				next.ServeHTTP(w, r)
				return
			}

			// Token is provided, attempt to validate it
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(cfg.JWTSecret), nil
			})

			if err != nil || !token.Valid {
				slog.Warn("Invalid JWT token", "error", err)
				// Returning 401 here if token is present but invalid.
				utils.SendErrorResponse(w, http.StatusUnauthorized, "Unauthorized", "Invalid or expired token")
				return
			}

			// Token is valid, extract claims and add user to context
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				slog.Error("Invalid JWT claims format")
				utils.SendErrorResponse(w, http.StatusUnauthorized, "Unauthorized", "Invalid token claims")
				return
			}

			userIDStr, ok := claims["user_id"].(string)
			if !ok {
				slog.Error("Missing user_id claim in JWT")
				utils.SendErrorResponse(w, http.StatusUnauthorized, "Unauthorized", "Invalid token: missing user_id")
				return
			}

			userID, err := uuid.Parse(userIDStr)
			if err != nil {
				slog.Error("Invalid user_id format in JWT", "user_id_str", userIDStr, "error", err)
				utils.SendErrorResponse(w, http.StatusUnauthorized, "Unauthorized", "Invalid token: malformed user_id")
				return
			}

			// Extract other claims if needed (email, isAdmin)
			email, _ := claims["email"].(string) // Use _ to ignore the boolean return value
			isAdmin, _ := claims["is_admin"].(bool)

			user := &models.User{
				ID:      userID,
				Email:   email,
				IsAdmin: isAdmin,
			}

			// Add user to the request context
			ctx := context.WithValue(r.Context(), models.ContextKeyUser, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := models.GetUserFromContext(r.Context())
		if !ok || user == nil || !user.IsAdmin {
			slog.Warn("Access denied: Admin access required or user not found in context", "user_found_in_context", ok, "user_is_nil", user == nil)
			utils.SendErrorResponse(w, http.StatusForbidden, "Forbidden", "Admin access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ApplyMiddleware applies essential middleware for the application.
func ApplyMiddleware(r *chi.Mux) {
	// Essential middleware for production
	r.Use(middleware.RequestID) // Important for rate limiting
	r.Use(middleware.RealIP)    // Important for rate limiting, analytics and tracing
	r.Use(middleware.Timeout(60 * time.Second))

	// Logging middleware with structured logging
	r.Use(middleware.Logger)

	r.Use(middleware.Recoverer)
}
