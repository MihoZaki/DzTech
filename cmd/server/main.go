package main

import (
	"log/slog"
	"os"

	"github.com/MihoZaki/DzTech/internal/config"
	"github.com/MihoZaki/DzTech/internal/server"
)

func main() {
	// Configure structured logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// Load configuration
	cfg := config.LoadConfig()

	// Create and start server
	srv := server.New(cfg)

	if err := srv.Start(); err != nil {
		slog.Error("Server failed to start", "error", err)
		os.Exit(1)
	}
}
