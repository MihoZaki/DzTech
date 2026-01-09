package db

import (
	"database/sql"
	"fmt"
	"log/slog"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib" // Import for side effects - registers the pgx driver
	"github.com/pressly/goose/v3"
)

func RunMigrations() error {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return fmt.Errorf("DATABASE_URL environment variable is required")
	}

	// Create a *sql.DB for migrations using pgx driver
	sqlDB, err := sql.Open("pgx", dbURL)
	if err != nil {
		return fmt.Errorf("failed to create sql.DB for migrations: %w", err)
	}
	defer sqlDB.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}

	if err := goose.Up(sqlDB, "migrations"); err != nil {
		return err
	}

	slog.Info("Migrations completed successfully")
	return nil
}
