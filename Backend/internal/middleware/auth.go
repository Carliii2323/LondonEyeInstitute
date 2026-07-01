package middleware

import (
	"net/http"
	"strings"

	"sge-london-eye/internal/auth"

	"github.com/gin-gonic/gin"
)

func Auth(cfg interface{ GetJWTSecret() string }) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token requerido"})
			return
		}

		token := strings.TrimPrefix(header, "Bearer ")
		claims, err := auth.ParseJWT(token, cfg.GetJWTSecret())
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token inválido o expirado"})
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("userRole", claims.Role)
		c.Next()
	}
}
