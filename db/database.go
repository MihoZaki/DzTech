package db

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

var (
	Conn *pgx.Conn
	Pool *pgxpool.Pool
)

func Init() error {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		slog.Info("No .env file found, using environment variables")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return fmt.Errorf("DATABASE_URL environment variable is required")
	}

	// Connect using pgx native connection
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Test connection
	if err = conn.Ping(context.Background()); err != nil {
		conn.Close(context.Background())
		return fmt.Errorf("failed to ping database: %w", err)
	}

	Conn = conn

	// Also create a connection pool for concurrent operations
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		conn.Close(context.Background())
		return fmt.Errorf("failed to create connection pool: %w", err)
	}

	Pool = pool

	slog.Info("Connected to database successfully with native pgx driver")
	return nil
}

func Close() {
	if Conn != nil {
		Conn.Close(context.Background())
	}
	if Pool != nil {
		Pool.Close()
	}
	slog.Info("Database connections closed")
}
