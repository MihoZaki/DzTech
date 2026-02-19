package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/MihoZaki/DzTech/internal/db"
	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	querier db.Querier
	// emailService EmailService
}

func NewUserService(querier db.Querier) *UserService {
	return &UserService{
		querier: querier,
	}
}

func (s *UserService) Register(ctx context.Context, email, password, fullName string) (uuid.UUID, error) {
	// Check if user already exists
	_, err := s.querier.GetUserByEmail(ctx, email)
	if err == nil {
		return uuid.Nil, errors.New("user already exists")
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, err
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return uuid.Nil, err
	}

	// Create user
	now := pgtype.Timestamptz{Time: time.Now(), Valid: true}
	params := db.CreateUserParams{
		Email:        email,
		PasswordHash: hashedPassword,
		FullName:     &fullName,
		IsAdmin:      false,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	user, err := s.querier.CreateUser(ctx, params)
	if err != nil {
		return uuid.Nil, err
	}

	// Return uuid.UUID directly
	return user.ID, nil
}

func (s *UserService) Authenticate(ctx context.Context, email, password string) (*models.User, error) {
	dbUser, err := s.querier.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("invalid credentials")
		}
		return nil, err
	}

	// Compare the provided password with the hashed password from DB
	if err := bcrypt.CompareHashAndPassword(dbUser.PasswordHash, []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Convert database user to service user
	user := &models.User{
		ID:        dbUser.ID, // Now uuid.UUID
		Email:     dbUser.Email,
		Password:  string(dbUser.PasswordHash),
		FullName:  *dbUser.FullName,
		IsAdmin:   dbUser.IsAdmin,
		CreatedAt: dbUser.CreatedAt.Time,
		UpdatedAt: dbUser.UpdatedAt.Time,
	}

	if dbUser.DeletedAt.Valid {
		user.DeletedAt = &dbUser.DeletedAt.Time
	}

	return user, nil
}

func (s *UserService) GetByID(ctx context.Context, id string) (*models.User, error) {
	// Parse the UUID string
	userUUID, err := uuid.Parse(id)
	if err != nil {
		return nil, errors.New("invalid user ID format")
	}

	dbUser, err := s.querier.GetUser(ctx, userUUID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	user := &models.User{
		ID:        dbUser.ID, // Now uuid.UUID
		Email:     dbUser.Email,
		Password:  string(dbUser.PasswordHash),
		FullName:  *dbUser.FullName,
		IsAdmin:   dbUser.IsAdmin,
		CreatedAt: dbUser.CreatedAt.Time,
		UpdatedAt: dbUser.UpdatedAt.Time,
	}

	if dbUser.DeletedAt.Valid {
		user.DeletedAt = &dbUser.DeletedAt.Time
	}

	return user, nil
}

// UpdateProfile updates the user's full name and/or email address.
func (s *UserService) UpdateProfile(ctx context.Context, userID uuid.UUID, req models.UpdateProfileRequest) (*models.UserProfileResponse, error) {
	var updatedUser db.UpdateUserFullNameRow

	if req.FullName != nil {
		updateFullNameParams := db.UpdateUserFullNameParams{
			FullName: req.FullName,
			ID:       userID,
		}
		dbUser, err := s.querier.UpdateUserFullName(ctx, updateFullNameParams)
		if err != nil {
			return nil, fmt.Errorf("failed to update user full name: %w", err)
		}
		updatedUser = dbUser // Store the result
		slog.Info("User full name updated successfully", "user_id", userID, "new_full_name", *req.FullName)
	}

	if req.Email != nil {
		// Optional: Check if the new email already exists for another user
		existingUser, err := s.querier.GetUserByEmail(ctx, *req.Email)
		if err == nil && existingUser.ID != userID {
			return nil, fmt.Errorf("email %s is already taken", *req.Email)
		}
		// Ignore error if user doesn't exist (expected for new email)

		updateEmailParams := db.UpdateUserEmailParams{
			Email: *req.Email,
			ID:    userID,
		}
		dbUser, err := s.querier.UpdateUserEmail(ctx, updateEmailParams)
		if err != nil {
			// Check for unique constraint violation (email uniqueness) if applicable
			// This depends on your DB schema and constraints.
			// Example using pgx:
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "users_email_key" {
				return nil, fmt.Errorf("email %s is already taken", *req.Email)
			}
			return nil, fmt.Errorf("failed to update user email: %w", err)
		}
		updatedUser = db.UpdateUserFullNameRow(dbUser)
		slog.Info("User email updated successfully", "user_id", userID, "new_email", *req.Email)
	}

	// If neither field was updated, it's an error state, though validation might prevent this
	if req.FullName == nil && req.Email == nil {
		return nil, errors.New("nothing to update: both full_name and email are nil in request")
	}

	// Map the database result to the application model
	profileRes := &models.UserProfileResponse{
		ID:        updatedUser.ID,
		Email:     updatedUser.Email,
		FullName:  updatedUser.FullName,
		CreatedAt: updatedUser.CreatedAt.Time,
		UpdatedAt: updatedUser.UpdatedAt.Time,
	}

	return profileRes, nil
}

// ChangePassword updates the user's password after verifying the current password.
func (s *UserService) ChangePassword(ctx context.Context, userID uuid.UUID, req models.ChangePasswordRequest) error {
	// 1. Fetch the current user details (especially the hashed password) using the user ID
	// Use the existing GetUser query which returns the password_hash
	dbUser, err := s.querier.GetUser(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("user not found")
		}
		return fmt.Errorf("failed to fetch user credentials for password change: %w", err)
	}

	// 2. Verify the provided current password against the stored hash
	err = checkPassword(dbUser.PasswordHash, req.CurrentPassword)
	if err != nil {
		// Password verification failed
		return errors.New("current password is incorrect")
	}

	// 3. Validate the new password requirements
	if len(req.NewPassword) < 8 {
		return errors.New("new password must be at least 8 characters long")
	}
	if req.NewPassword != req.ConfirmPassword {
		return errors.New("new password and confirmation do not match")
	}

	// 4. Hash the new password
	hashedNewPassword, err := hashPassword(req.NewPassword)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	// 5. Update the user's password in the database
	updatePasswordParams := db.UpdateUserPasswordParams{
		PasswordHash: hashedNewPassword,
		ID:           userID,
	}
	_, err = s.querier.UpdateUserPassword(ctx, updatePasswordParams)
	if err != nil {
		return fmt.Errorf("failed to update user password in database: %w", err)
	}

	slog.Info("User password updated successfully", "user_id", userID)
	return nil
}

// // ForgotPassword initiates the password recovery process for a user.
// func (s *UserService) ForgotPassword(ctx context.Context, req models.ForgotPasswordRequest) error {
// 	email := req.Email

// 	// Fetch the user by email to check if they exist
// 	// This query excludes soft-deleted users
// 	dbUser, err := s.querier.GetUserByEmail(ctx, email)
// 	if err != nil {
// 		// Treat non-existent user the same as success to prevent email enumeration
// 		// Log the attempt for monitoring if desired
// 		slog.Info("Forgot password attempt for non-existent email", "email", email)
// 		return nil // Return success to the client (generic message)
// 	}

// 	// Generate a secure token
// 	token, err := generateSecureToken(32) // 32 bytes = 64 character hex string
// 	if err != nil {
// 		return fmt.Errorf("failed to generate password reset token: %w", err)
// 	}

// 	// Set expiration time (e.g., 1 hour from now)
// 	expirationTime := time.Now().Add(1 * time.Hour)

// 	// Store the token in the database
// 	tokenParams := db.CreatePasswordResetTokenParams{
// 		UserID:    dbUser.ID, // Associate the token with the user ID
// 		Token:     token,
// 		ExpiresAt: ToPgTimestamptz(expirationTime), // Helper to convert time.Time to pgtype.Timestamptz
// 	}
// 	err = s.querier.CreatePasswordResetToken(ctx, tokenParams)
// 	if err != nil {
// 		// Check for potential unique constraint violation if tokens table has a unique token column
// 		// var pgErr *pgconn.PgError
// 		// if errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "password_reset_tokens_token_key" {
// 		//     // This should ideally not happen with a cryptographically secure random token
// 		//     return fmt.Errorf("failed to store password reset token due to a conflict, please try again")
// 		// }
// 		return fmt.Errorf("failed to store password reset token: %w", err)
// 	}

// 	err = s.emailService.SendPasswordResetEmail(ctx, email, token)
// 	if err != nil {
// 		slog.Error("Failed to send password reset email", "email", email, "error", err)
// 		// IMPORTANT: Returning an error here might reveal information about user existence
// 		return fmt.Errorf("failed to send password reset email: %w", err)
// 	}
// 	slog.Info("Password reset token generated and stored", "user_id", dbUser.ID, "email", email, "token_preview", token[:10]+"...") // Log only a preview

// 	return nil
// }

// // ResetPassword completes the password recovery process using a token.
// func (s *UserService) ResetPassword(ctx context.Context, req models.ResetPasswordRequest) error {
// 	token := req.Token

// 	// Validate the new password
// 	if len(req.NewPassword) < 8 {
// 		return errors.New("new password must be at least 8 characters long")
// 	}
// 	if req.NewPassword != req.ConfirmPassword {
// 		return errors.New("new password and confirmation do not match")
// 	}

// 	// Fetch the user associated with the token (checks validity and expiry)
// 	dbUser, err := s.querier.GetUserByResetToken(ctx, token)
// 	if err != nil {
// 		if errors.Is(err, pgx.ErrNoRows) {
// 			return errors.New("invalid or expired password reset token")
// 		}
// 		return fmt.Errorf("failed to verify password reset token: %w", err)
// 	}

// 	// Hash the new password
// 	hashedNewPassword, err := hashPassword(req.NewPassword)
// 	if err != nil {
// 		return fmt.Errorf("failed to hash new password: %w", err)
// 	}

// 	// Update the user's password in the database
// 	updatePasswordParams := db.UpdateUserPasswordParams{
// 		PasswordHash: hashedNewPassword,
// 		ID:           dbUser.ID, // Use the user ID from the token verification
// 	}
// 	_, err = s.querier.UpdateUserPassword(ctx, updatePasswordParams)
// 	if err != nil {
// 		return fmt.Errorf("failed to update user password in database: %w", err)
// 	}

// 	// Delete the used token to prevent reuse
// 	err = s.querier.DeletePasswordResetToken(ctx, token)
// 	if err != nil {
// 		// Log the error, but don't fail the reset itself as the password was updated
// 		slog.Error("Failed to delete used password reset token", "token", token, "error", err)
// 		// Consider if you want to return an error here or just log it.
// 		// Returning an error might be safer to ensure token cleanup.
// 		// For now, let's just log.
// 	}

// 	slog.Info("Password reset completed successfully", "user_id", dbUser.ID)
// 	return nil
// }

// hashPassword hashes a plain-text password using bcrypt.
func hashPassword(password string) ([]byte, error) {
	// Use a cost of 12 for bcrypt (consider adjusting based on performance needs)
	return bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
}

// checkPassword compares a plain-text password with a hashed password.
func checkPassword(hashedPassword []byte, password string) error {
	return bcrypt.CompareHashAndPassword(hashedPassword, []byte(password))
}

// generateSecureToken generates a cryptographically secure random token string.
func generateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
