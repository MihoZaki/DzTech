// internal/services/auth_service.go

package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/MihoZaki/DzTech/internal/db"
	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

// AuthService handles authentication-related business logic, including JWT and refresh tokens.
type AuthService struct {
	querier     db.Querier
	userService *UserService
	jwtSecret   []byte
	logger      *slog.Logger
}

// NewAuthService creates a new instance of AuthService.
func NewAuthService(querier db.Querier, userService *UserService, jwtSecret string, logger *slog.Logger) *AuthService {
	return &AuthService{
		querier:     querier,
		userService: userService,
		jwtSecret:   []byte(jwtSecret),
		logger:      logger,
	}
}

// Login authenticates a user and returns access token, refresh token string, and user details.
// The refresh token string is for setting the secure cookie.
func (s *AuthService) Login(ctx context.Context, email, password string) (*models.LoginResponse, string, error) { // Return refresh token string
	user, err := s.userService.Authenticate(ctx, email, password)
	if err != nil {
		return nil, "", err
	}

	accessToken, refreshToken, err := s.generateTokens(ctx, user.ID, user.Email, user.IsAdmin)
	if err != nil {
		s.logger.Error("Failed to generate tokens during login", "error", err, "user_id", user.ID)
		return nil, "", fmt.Errorf("failed to generate tokens: %w", err)
	}

	// Return the access token, refresh token string, and user details
	return &models.LoginResponse{
		Token: accessToken,
		User:  *user,
	}, refreshToken, nil // Return the refresh token string
}

// Register registers a new user and returns access token, refresh token string, and user details.
// The refresh token string is for setting the secure cookie.
func (s *AuthService) Register(ctx context.Context, email, password, fullName string) (*models.LoginResponse, string, error) { // Return refresh token string
	userID, err := s.userService.Register(ctx, email, password, fullName)
	if err != nil {
		return nil, "", err
	}

	// Fetch the created user details to return in the response
	user, err := s.userService.GetByID(ctx, userID.String()) // Convert uuid.UUID to string for GetByID
	if err != nil {
		s.logger.Error("Failed to fetch user details after registration", "error", err, "user_id", userID)
		return nil, "", fmt.Errorf("failed to fetch user details after registration: %w", err)
	}

	accessToken, refreshToken, err := s.generateTokens(ctx, user.ID, user.Email, user.IsAdmin)
	if err != nil {
		s.logger.Error("Failed to generate tokens during registration", "error", err, "user_id", user.ID)
		return nil, "", fmt.Errorf("failed to generate tokens: %w", err)
	}

	// Return the access token, refresh token string, and user details
	return &models.LoginResponse{
		Token: accessToken,
		User:  *user,
	}, refreshToken, nil // Return the refresh token string
}

// Refresh exchanges a valid refresh token (received from cookie) for a new access token and refresh token.
func (s *AuthService) Refresh(ctx context.Context, refreshTokenStr string) (string, string, error) {
	s.logger.Debug("Refreshing token", "received_token_str_len", len(refreshTokenStr))

	dbRefreshToken, err := s.querier.GetValidRefreshTokenRecord(ctx, refreshTokenStr)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			s.logger.Warn("Refresh token not found in DB", "identifier_len", len(refreshTokenStr))
			return "", "", errors.New("invalid or expired refresh token")
		}
		s.logger.Error("Failed to fetch refresh token record from DB", "error", err, "identifier_len", len(refreshTokenStr))
		return "", "", fmt.Errorf("failed to validate refresh token: %w", err)
	}

	s.logger.Debug("Found DB token record", "db_stored_hash_len", len(dbRefreshToken.TokenHash), "expires_at", dbRefreshToken.ExpiresAt.Time, "revoked", dbRefreshToken.Revoked)

	if err := bcrypt.CompareHashAndPassword([]byte(dbRefreshToken.TokenHash), []byte(refreshTokenStr)); err != nil {
		s.logger.Warn("Refresh token hash verification failed", "identifier_len", len(refreshTokenStr), "error", err)
		return "", "", errors.New("invalid refresh token")
	}

	// --- IMMEDIATELY REVOKE THE OLD TOKEN (Token Rotation) ---
	err = s.querier.RevokeRefreshTokenByIdentifier(ctx, refreshTokenStr)
	if err != nil {
		s.logger.Warn("Could not revoke old refresh token during refresh (might be concurrent request)", "identifier", refreshTokenStr[:10]+"...", "error", err)
	}

	dbUser, err := s.querier.GetUser(ctx, dbRefreshToken.UserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", errors.New("user associated with refresh token not found")
		}
		s.logger.Error("Failed to fetch user associated with refresh token", "error", err, "user_id", dbRefreshToken.UserID)
		return "", "", fmt.Errorf("failed to validate user for refresh: %w", err)
	}

	// Convert database user to service user model (similar to UserService logic)
	user := &models.User{
		ID:      dbUser.ID,
		Email:   dbUser.Email,
		IsAdmin: dbUser.IsAdmin,
	}

	newAccessToken, newRefreshToken, err := s.generateTokens(ctx, user.ID, user.Email, user.IsAdmin)
	if err != nil {
		s.logger.Error("Failed to generate new tokens during refresh", "error", err, "user_id", user.ID)
		return "", "", fmt.Errorf("failed to generate new tokens: %w", err)
	}

	// Return the new access and refresh tokens
	return newAccessToken, newRefreshToken, nil // Return new access and refresh token strings
}

// Logout revokes the provided refresh token (received from cookie).
func (s *AuthService) Logout(ctx context.Context, refreshTokenStr string) error {
	s.logger.Debug("Logging out", "refresh_token_str_len", len(refreshTokenStr))

	// Attempt to revoke the token in the database using its identifier
	err := s.querier.RevokeRefreshTokenByIdentifier(ctx, refreshTokenStr)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Token was not found, might already be revoked or expired.
			// Log as warning, but treat as successful logout attempt.
			s.logger.Warn("Attempted to revoke non-existent or already revoked refresh token", "identifier_len", len(refreshTokenStr))
			return nil // Treat as success for the client
		}
		s.logger.Error("Failed to revoke refresh token in DB", "error", err, "identifier_len", len(refreshTokenStr))
		return fmt.Errorf("failed to revoke refresh token: %w", err)
	}

	s.logger.Info("Refresh token revoked successfully", "identifier_len", len(refreshTokenStr))
	return nil
}

// generateTokens creates a new access token and refresh token pair.
// It stores the refresh token hash in the database.
func (s *AuthService) generateTokens(ctx context.Context, userID uuid.UUID, email string, isAdmin bool) (accessToken, refreshToken string, err error) {
	// Generate a random byte slice
	refreshTokenBytes := make([]byte, 32) // 32 bytes = 256 bits, good randomness
	_, err = rand.Read(refreshTokenBytes)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate random bytes for refresh token: %w", err)
	}

	// The base64 string is the token identifier sent to the client AND used for DB lookup
	refreshToken = base64.URLEncoding.EncodeToString(refreshTokenBytes)

	// Hash the token string for secure storage/verification using bcrypt
	tokenHashForStorage, err := bcrypt.GenerateFromPassword([]byte(refreshToken), bcrypt.DefaultCost)
	if err != nil {
		return "", "", fmt.Errorf("failed to hash refresh token: %w", err)
	}

	// Define expiry times
	accessTokenExpiry := time.Now().Add(15 * time.Minute)    // Short-lived
	refreshTokenExpiry := time.Now().Add(7 * 24 * time.Hour) // Long-lived (7 days)

	// Create the access token
	accessToken, err = s.createAccessToken(userID, email, isAdmin, accessTokenExpiry)
	if err != nil {
		return "", "", fmt.Errorf("failed to create access token: %w", err)
	}

	// Store the base64 token string (as identifier) and its bcrypt hash
	err = s.querier.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
		UserID:          userID,
		TokenIdentifier: refreshToken,                // Store the base64 string as the lookup key
		TokenHash:       string(tokenHashForStorage), // Store the bcrypt hash for verification
		ExpiresAt:       pgtype.Timestamptz{Time: refreshTokenExpiry, Valid: true},
	})
	if err != nil {
		s.logger.Error("Failed to store refresh token in DB", "error", err, "user_id", userID)
		return "", "", fmt.Errorf("failed to store refresh token: %w", err)
	}

	return accessToken, refreshToken, nil
}

// createAccessToken generates the actual JWT access token string.
func (s *AuthService) createAccessToken(userID uuid.UUID, email string, isAdmin bool, expiry time.Time) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  userID.String(), // Convert uuid.UUID to string for the token
		"email":    email,
		"is_admin": isAdmin,
		"exp":      expiry.Unix(),
		// Add other claims as needed
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// --- Error Definitions ---
var (
	ErrInvalidRefreshToken = errors.New("invalid or expired refresh token")
	// Add other auth-specific errors as needed
)
