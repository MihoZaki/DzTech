package models

import (
	"context"
	"errors"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID        string     `json:"id"`
	Email     string     `json:"email"`
	Password  string     `json:"-" validate:"required"`
	FullName  string     `json:"full_name"`
	IsAdmin   bool       `json:"is_admin"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}

type UserLogin struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type UserRegister struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	FullName string `json:"full_name" validate:"max=100"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

var validate *validator.Validate

func init() {
	validate = validator.New()
}

func (ur *UserRegister) Validate() error {
	return validate.Struct(ur)
}

func (ul *UserLogin) Validate() error {
	return validate.Struct(ul)
}

func (u *User) HashPassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

func (u *User) CheckPassword(password string) error {
	return bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
}

func (u *User) Create(ctx context.Context, conn *pgx.Conn) error {
	query := `
		INSERT INTO users (email, password_hash, full_name, is_admin, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, email, full_name, is_admin, created_at, updated_at`

	err := conn.QueryRow(ctx, query,
		u.Email,
		[]byte(u.Password),
		u.FullName,
		u.IsAdmin,
		time.Now(),
		time.Now(),
	).Scan(
		&u.ID,
		&u.Email,
		&u.FullName,
		&u.IsAdmin,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	return err
}

func GetUserByEmail(ctx context.Context, conn *pgx.Conn, email string) (*User, error) {
	query := `
		SELECT id, email, password_hash, full_name, is_admin, created_at, updated_at, deleted_at
		FROM users
		WHERE email = $1 AND deleted_at IS NULL`

	var user User
	var passwordHash []byte

	err := conn.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&passwordHash,
		&user.FullName,
		&user.IsAdmin,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	user.Password = string(passwordHash)
	return &user, nil
}
