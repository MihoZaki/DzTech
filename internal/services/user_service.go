package services

import (
	"context"
	"errors"
	"time"

	"github.com/MihoZaki/DzTech/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	querier db.Querier
}

type User struct {
	ID        string
	Email     string
	Password  string // This will come from DB as []byte
	FullName  string
	IsAdmin   bool
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
}

type RegisterInput struct {
	Email    string
	Password string
	FullName string
}

func NewUserService(querier db.Querier) *UserService {
	return &UserService{
		querier: querier,
	}
}

func (s *UserService) Register(ctx context.Context, email, password, fullName string) (string, error) {
	// Check if user already exists
	_, err := s.querier.GetUserByEmail(ctx, email)
	if err == nil {
		return "", errors.New("user already exists")
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	now := pgtype.Timestamptz{Time: time.Now(), Valid: true}
	params := db.CreateUserParams{
		Email:        email,
		PasswordHash: hashedPassword,
		FullName:     pgtype.Text{String: fullName, Valid: true},
		IsAdmin:      false,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	user, err := s.querier.CreateUser(ctx, params)
	if err != nil {
		return "", err
	}

	return user.ID.String(), nil // Convert uuid.UUID to string
}

func (s *UserService) Authenticate(ctx context.Context, email, password string) (*User, error) {
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
	user := &User{
		ID:        dbUser.ID.String(),
		Email:     dbUser.Email,
		Password:  string(dbUser.PasswordHash), // Not exposed in API response anyway
		FullName:  dbUser.FullName.String,
		IsAdmin:   dbUser.IsAdmin,
		CreatedAt: dbUser.CreatedAt.Time,
		UpdatedAt: dbUser.UpdatedAt.Time,
		DeletedAt: nil, // Handle this if needed
	}

	// Handle DeletedAt if it exists
	if dbUser.DeletedAt.Valid {
		user.DeletedAt = &dbUser.DeletedAt.Time
	}

	return user, nil
}

func (s *UserService) GetByID(ctx context.Context, id string) (*User, error) {
	// Parse the UUID string
	userID, err := uuid.Parse(id)
	if err != nil {
		return nil, errors.New("invalid user ID format")
	}

	dbUser, err := s.querier.GetUser(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	user := &User{
		ID:        dbUser.ID.String(),
		Email:     dbUser.Email,
		Password:  string(dbUser.PasswordHash),
		FullName:  dbUser.FullName.String,
		IsAdmin:   dbUser.IsAdmin,
		CreatedAt: dbUser.CreatedAt.Time,
		UpdatedAt: dbUser.UpdatedAt.Time,
	}

	if dbUser.DeletedAt.Valid {
		user.DeletedAt = &dbUser.DeletedAt.Time
	}

	return user, nil
}
