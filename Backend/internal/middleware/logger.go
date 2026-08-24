package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger registra cada request de forma estructurada (slog) con el request id.
// El nivel depende del status: 5xx → Error, 4xx → Warn, resto → Info.
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		status := c.Writer.Status()
		attrs := []any{
			slog.String("request_id", c.GetString(RequestIDKey)),
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
			slog.Int("status", status),
			slog.String("ip", c.ClientIP()),
			slog.Duration("took", time.Since(start)),
		}

		switch {
		case status >= 500:
			slog.Error("request", attrs...)
		case status >= 400:
			slog.Warn("request", attrs...)
		default:
			slog.Info("request", attrs...)
		}
	}
}
