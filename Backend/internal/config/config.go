package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                   string
	Env                    string
	DatabaseURL            string
	JWTSecret              string
	JWTExpiryMinutes       int
	RefreshTokenExpiryDays int
	StorageDriver          string
	StoragePath            string
	AllowedOrigins         string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("archivo .env no encontrado, usando variables del sistema")
	}

	return &Config{
		Port:                   getEnv("PORT", "8080"),
		Env:                    getEnv("ENV", "development"),
		DatabaseURL:            getEnv("DATABASE_URL", ""),
		JWTSecret:              getEnv("JWT_SECRET", ""),
		JWTExpiryMinutes:       getEnvInt("JWT_EXPIRY_MINUTES", 15),
		RefreshTokenExpiryDays: getEnvInt("REFRESH_TOKEN_EXPIRY_DAYS", 7),
		StorageDriver:          getEnv("STORAGE_DRIVER", "local"),
		StoragePath:            getEnv("STORAGE_PATH", "./uploads"),
		AllowedOrigins:         getEnv("ALLOWED_ORIGINS", "http://localhost:5173"),
	}
}

func (c *Config) GetJWTSecret() string { return c.JWTSecret }

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
