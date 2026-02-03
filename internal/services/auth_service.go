package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
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
)

// AuthService handles authentication-related business logic, including JWT and refresh tokens.
type AuthService struct {
	querier     db.Querier
	userService *UserService
	jwtSecret   []byte // Secret for access/refresh token signing
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
func (s *AuthService) Login(ctx context.Context, email, password string) (*models.LoginResponse, string, error) {
	user, err := s.userService.Authenticate(ctx, email, password)
	if err != nil {
		return nil, "", err
	}
	err = s.querier.RevokeAllRefreshTokensByUserID(ctx, user.ID)
	if err != nil {
		s.logger.Error("Failed to revoke existing refresh tokens during login", "error", err, "user_id", user.ID)
	}
	accessToken, refreshTokenStr, err := s.generateTokens(ctx, user.ID, user.Email, user.IsAdmin)
	if err != nil {
		s.logger.Error("Failed to generate tokens during login", "error", err, "user_id", user.ID)
		return nil, "", fmt.Errorf("failed to generate tokens: %w", err)
	}

	return &models.LoginResponse{
		Token: accessToken,
		User:  *user,
	}, refreshTokenStr, nil
}

// Register registers a new user and returns access token, refresh token string, and user details.
func (s *AuthService) Register(ctx context.Context, email, password, fullName string) (*models.LoginResponse, string, error) {
	userID, err := s.userService.Register(ctx, email, password, fullName)
	if err != nil {
		return nil, "", err
	}

	user, err := s.userService.GetByID(ctx, userID.String())
	if err != nil {
		s.logger.Error("Failed to fetch user details after registration", "error", err, "user_id", userID)
		return nil, "", fmt.Errorf("failed to fetch user details after registration: %w", err)
	}

	err = s.querier.RevokeAllRefreshTokensByUserID(ctx, user.ID)
	if err != nil {
		s.logger.Error("Failed to revoke existing refresh tokens during registration", "error", err, "user_id", user.ID)
	}
	accessToken, refreshTokenStr, err := s.generateTokens(ctx, user.ID, user.Email, user.IsAdmin)
	if err != nil {
		s.logger.Error("Failed to generate tokens during registration", "error", err, "user_id", user.ID)
		return nil, "", fmt.Errorf("failed to generate tokens: %w", err)
	}

	return &models.LoginResponse{
		Token: accessToken,
		User:  *user,
	}, refreshTokenStr, nil
}

// Refresh exchanges a valid refresh token (received from cookie) for a new access token and refresh token.
func (s *AuthService) Refresh(ctx context.Context, refreshTokenStr string) (string, string, error) {
	s.logger.Debug("Refreshing token", "received_token_str_len", len(refreshTokenStr))

	// Hash the received token string for DB lookup comparison
	receivedTokenHash := s.hashToken(refreshTokenStr)

	// Parse the JWT to extract the JTI and verify its signature
	token, err := jwt.ParseWithClaims(refreshTokenStr, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil || !token.Valid {
		s.logger.Warn("Invalid or malformed refresh token JWT during refresh", "error", err, "token_valid", token.Valid)
		return "", "", errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok {
		s.logger.Warn("Could not parse claims from refresh token JWT during refresh")
		return "", "", errors.New("invalid refresh token")
	}

	jti := claims.ID
	if jti == "" {
		s.logger.Warn("Missing JTI in refresh token JWT during refresh")
		return "", "", errors.New("invalid refresh token")
	}

	// Lookup DB record by JTI (this gets the stored hash)
	dbRefreshToken, err := s.querier.GetValidRefreshTokenRecord(ctx, jti)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			s.logger.Warn("Refresh token JTI not found in DB or is expired/revoked", "jti", jti)
			return "", "", errors.New("invalid or expired refresh token")
		}
		s.logger.Error("Failed to fetch refresh token record from DB", "error", err, "jti", jti)
		return "", "", fmt.Errorf("failed to validate refresh token: %w", err)
	}

	// Compare the *received token's hash* with the *stored hash*
	if receivedTokenHash != dbRefreshToken.TokenHash {
		s.logger.Warn("Refresh token hash verification failed", "jti", jti)
		return "", "", errors.New("invalid refresh token")
	}

	// --- IMMEDIATELY REVOKE THE OLD TOKEN (Token Rotation) ---
	err = s.querier.RevokeRefreshTokenByJTI(ctx, jti)
	if err != nil {
		s.logger.Warn("Could not revoke old refresh token during refresh (might be concurrent request)", "jti", jti, "error", err)
	}

	dbUser, err := s.querier.GetUser(ctx, dbRefreshToken.UserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", errors.New("user associated with refresh token not found")
		}
		s.logger.Error("Failed to fetch user associated with refresh token", "error", err, "user_id", dbRefreshToken.UserID)
		return "", "", fmt.Errorf("failed to validate user for refresh: %w", err)
	}

	user := &models.User{
		ID:      dbUser.ID,
		Email:   dbUser.Email,
		IsAdmin: dbUser.IsAdmin,
	}

	newAccessToken, newRefreshTokenStr, err := s.generateTokens(ctx, user.ID, user.Email, user.IsAdmin)
	if err != nil {
		s.logger.Error("Failed to generate new tokens during refresh", "error", err, "user_id", user.ID)
		return "", "", fmt.Errorf("failed to generate new tokens: %w", err)
	}

	return newAccessToken, newRefreshTokenStr, nil
}

// Logout revokes the provided refresh token (received from cookie).
func (s *AuthService) Logout(ctx context.Context, refreshTokenStr string) error {
	s.logger.Debug("Logging out", "refresh_token_str_len", len(refreshTokenStr))

	// Parse the JWT to extract the JTI and verify its signature
	token, err := jwt.ParseWithClaims(refreshTokenStr, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil || !token.Valid {
		s.logger.Warn("Invalid or malformed refresh token JWT during logout", "error", err, "token_valid", token.Valid)
		return errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok {
		s.logger.Warn("Could not parse claims from refresh token JWT during logout")
		return errors.New("invalid refresh token")
	}

	jti := claims.ID
	if jti == "" {
		s.logger.Warn("Missing JTI in refresh token JWT during logout")
		return errors.New("invalid refresh token")
	}

	// Attempt to revoke the token in the database using its JTI
	err = s.querier.RevokeRefreshTokenByJTI(ctx, jti)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			s.logger.Warn("Attempted to revoke non-existent or already revoked refresh token", "jti", jti)
			return nil // Treat as success for the client
		}
		s.logger.Error("Failed to revoke refresh token in DB", "error", err, "jti", jti)
		return fmt.Errorf("failed to revoke refresh token: %w", err)
	}

	s.logger.Info("Refresh token revoked successfully", "jti", jti)
	return nil
}

// generateTokens creates a new access token and refresh token pair.
// It stores the refresh token hash in the database using the token's JTI.
// The hash is SHA-256 of the *entire signed refresh token string*.
func (s *AuthService) generateTokens(ctx context.Context, userID uuid.UUID, email string, isAdmin bool) (accessToken, refreshTokenStr string, err error) {
	// Generate a unique JTI (JWT ID) - this will be the unique identifier for the DB record
	refreshTokenJTI := uuid.NewString()

	// Define expiry times
	accessTokenExpiry := time.Now().Add(15 * time.Minute)    // Short-lived
	refreshTokenExpiry := time.Now().Add(7 * 24 * time.Hour) // Long-lived (7 days)

	// Create the access token
	accessToken, err = s.createAccessToken(userID, email, isAdmin, accessTokenExpiry)
	if err != nil {
		return "", "", fmt.Errorf("failed to create access token: %w", err)
	}

	// Create the refresh token JWT containing the JTI and expiry
	refreshTokenClaims := jwt.RegisteredClaims{
		ID:        refreshTokenJTI,            // Use the generated JTI
		Subject:   userID.String(),            // Link to user
		Issuer:    "tech-store-backend",       // Optional: Identify the issuer
		Audience:  jwt.ClaimStrings{"client"}, // Optional: Intended audience
		ExpiresAt: &jwt.NumericDate{Time: refreshTokenExpiry},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshTokenClaims)
	refreshTokenStr, err = refreshToken.SignedString(s.jwtSecret) // Sign with the main app secret
	if err != nil {
		return "", "", fmt.Errorf("failed to sign refresh token: %w", err)
	}

	// Hash the *entire signed refresh token string* using SHA-256
	tokenHash := s.hashToken(refreshTokenStr)

	// Store the JTI (as identifier) and the SHA-256 hash of the *entire signed token string* in the database
	err = s.querier.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
		Jti:       refreshTokenJTI, // Store the JTI as the lookup key
		UserID:    userID,          // Link to the user
		TokenHash: tokenHash,       // Store the SHA-256 hash of the *entire signed token string*
		ExpiresAt: pgtype.Timestamptz{Time: refreshTokenExpiry, Valid: true},
	})
	if err != nil {
		s.logger.Error("Failed to store refresh token in DB", "error", err, "user_id", userID, "jti", refreshTokenJTI)
		return "", "", fmt.Errorf("failed to store refresh token: %w", err)
	}

	return accessToken, refreshTokenStr, nil
}

// hashToken creates a SHA-256 hash of the input string and returns it as a hex string.
func (s *AuthService) hashToken(token string) string {
	hasher := sha256.New()
	hasher.Write([]byte(token))
	return hex.EncodeToString(hasher.Sum(nil))
}

// createAccessToken generates the actual JWT access token string.
func (s *AuthService) createAccessToken(userID uuid.UUID, email string, isAdmin bool, expiry time.Time) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  userID.String(),
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
)
