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

	// AppURL — base pública del frontend, para armar links de emails
	// (ej. link de verificación de cuenta). Ej: https://app.londoneye.com
	AppURL string

	// SMTP — envío de correo saliente (verificación de cuenta, etc.).
	// Si SMTPHost está vacío, el mailer usa el fallback de log (no envía).
	SMTPHost string
	SMTPPort int
	SMTPUser string
	SMTPPass string
	SMTPFrom string

	// IMAP — recepción de comprobantes por mail (fase B).
	// Si IMAPHost está vacío, el poller no se registra.
	IMAPHost           string
	IMAPUser           string
	IMAPPass           string
	InboundPollMinutes int
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

		AppURL: getEnv("APP_URL", "http://localhost:5173"),

		SMTPHost: getEnv("SMTP_HOST", ""),
		SMTPPort: getEnvInt("SMTP_PORT", 587),
		SMTPUser: getEnv("SMTP_USER", ""),
		SMTPPass: getEnv("SMTP_PASS", ""),
		SMTPFrom: getEnv("SMTP_FROM", ""),

		IMAPHost:           getEnv("IMAP_HOST", ""),
		IMAPUser:           getEnv("IMAP_USER", ""),
		IMAPPass:           getEnv("IMAP_PASS", ""),
		InboundPollMinutes: getEnvInt("INBOUND_POLL_MINUTES", 5),
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
