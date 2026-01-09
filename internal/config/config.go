package config

import (
	"log/slog"
	"os"
)

type Config struct {
	ServerPort string
	DBURL      string
	JWTSecret  string
}

func LoadConfig() *Config {
	cfg := &Config{
		ServerPort: getEnvOrDefault("PORT", "8080"),
		DBURL:      getEnvOrDefault("DATABASE_URL", ""),
		JWTSecret:  getEnvOrDefault("JWT_SECRET", ""),
	}

	if cfg.JWTSecret == "" {
		slog.Error("JWT_SECRET environment variable is required")
		panic("JWT_SECRET environment variable is required")
	}

	return cfg
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
