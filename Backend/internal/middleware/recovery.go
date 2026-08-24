package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
)

// Recovery captura panics, los loguea de forma estructurada (con request id y
// stack trace) y responde 500 sin exponer el detalle al cliente.
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				slog.Error("panic recovered",
					slog.String("request_id", c.GetString(RequestIDKey)),
					slog.String("method", c.Request.Method),
					slog.String("path", c.Request.URL.Path),
					slog.Any("panic", err),
					slog.String("stack", string(debug.Stack())),
				)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error": "error interno del servidor",
				})
			}
		}()
		c.Next()
	}
}
