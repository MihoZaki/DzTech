package config

import (
	"log"
	"log/slog"
	"os"
	"strconv"
)

type Config struct {
	ServerPort    string
	DBURL         string
	JWTSecret     string
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int
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
