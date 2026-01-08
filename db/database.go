package db

import (
	"context"
	"fmt"
	"log"
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
		log.Println("No .env file found, using environment variables")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Build from individual components if DATABASE_URL not set
		host := getEnvOrDefault("DB_HOST", "localhost")
		port := getEnvOrDefault("DB_PORT", "5432")
		user := getEnvOrDefault("DB_USER", "tech_user")
		password := getEnvOrDefault("DB_PASSWORD", "password")
		dbname := getEnvOrDefault("DB_NAME", "tech_store_dev")

		dbURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
			user, password, host, port, dbname)
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

	log.Println("Connected to database successfully with native pgx driver")
	return nil
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func Close() {
	if Conn != nil {
		Conn.Close(context.Background())
	}
	if Pool != nil {
		Pool.Close()
	}
}
