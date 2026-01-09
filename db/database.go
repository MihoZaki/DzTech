package db

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

var (
	Conn *pgxpool.Pool // Use only the pool, not single connection
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

	// Create a connection pool for concurrent operations
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		return fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test the pool connection
	if err = pool.Ping(context.Background()); err != nil {
		pool.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	Conn = pool

	slog.Info("Connected to database successfully with native pgx pool")
	return nil
}

func Close() {
	if Conn != nil {
		Conn.Close()
	}
	slog.Info("Database connection pool closed")
}

// GetPool returns the database connection pool
func GetPool() *pgxpool.Pool {
	return Conn
}
