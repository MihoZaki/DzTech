package services

import (
	"context"
	"errors"
	"time"

	"github.com/MihoZaki/DzTech/internal/db"
	"github.com/MihoZaki/DzTech/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	querier db.Querier
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
