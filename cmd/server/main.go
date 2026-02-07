package main

import (
	"log/slog"
	"os"

	"github.com/MihoZaki/DzTech/internal/config"
	"github.com/MihoZaki/DzTech/internal/server"
)

func main() {
	// Configure structured logging
handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug, // Or get from config/env var
	})
	logger := slog.New(handler)
	slog.SetDefault(logger) // Set the global logger

	// Load configuration
	cfg := config.LoadConfig()

	// Create and start server
	srv := server.New(cfg)

	if err := srv.Start(); err != nil {
		slog.Error("Server failed to start", "error", err)
		os.Exit(1)
	}
}
