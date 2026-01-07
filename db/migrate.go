package db

import (
	"log"

	"github.com/pressly/goose/v3"
)

func RunMigrations() error {
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}

	if err := goose.Up(DB, "migrations"); err != nil {
		return err
	}

	log.Println("Migrations completed successfully")
	return nil
}
