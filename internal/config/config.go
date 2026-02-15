package config

import (
	"log"
	"log/slog"
	"os"
	"strconv"
)

type SMTP struct {
	Host     string `mapstructure:"SMTP_HOST"`
	Port     int    `mapstructure:"SMTP_PORT"`
	Username string `mapstructure:"SMTP_USERNAME"`
	Password string `mapstructure:"SMTP_PASSWORD"`
	Sender   string `mapstructure:"SMTP_SENDER"`
}

type Config struct {
	ServerPort    string
	DBURL         string
	JWTSecret     string
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int
	SMTP          SMTP   `mapstructure:"smtp"`
	BaseURL       string `mapstructure:"SERVER_BASE_URL"` // Add this field with the correct mapstructure tag
}

func LoadConfig() *Config {
	cfg := &Config{
		ServerPort:    getEnvOrDefault("PORT", "8080"),
		DBURL:         getEnvOrDefault("DATABASE_URL", ""),
		JWTSecret:     getEnvOrDefault("JWT_SECRET", ""),
		RedisHost:     getEnvOrDefault("REDIS_HOST", "localhost"),
		RedisPort:     getEnvOrDefault("REDIS_PORT", "6379"),
		RedisPassword: getEnvOrDefault("REDIS_PASSWORD", ""),
		RedisDB:       getEnvAsInt("REDIS_DB", 0),
		BaseURL:       getEnvOrDefault("SERVER_BASE_URL", "http://localhost:3000"), // Provide a default value like localhost for dev
		// Load SMTP configuration
		SMTP: SMTP{
			Host:     getEnvOrDefault("SMTP_HOST", ""), // Provide a default if needed, maybe empty string
			Port:     getEnvAsInt("SMTP_PORT", 0),      // Provide a default if needed, maybe 0
			Username: getEnvOrDefault("SMTP_USERNAME", ""),
			Password: getEnvOrDefault("SMTP_PASSWORD", ""),
			Sender:   getEnvOrDefault("SMTP_SENDER", ""),
		},
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

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		intValue, err := strconv.Atoi(value)
		if err != nil {
			log.Printf("Warning: Could not parse environment variable %s as integer, using default %d", key, defaultValue)
			return defaultValue
		}
		return intValue
	}
	return defaultValue
}
