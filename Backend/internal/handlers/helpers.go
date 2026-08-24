package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	apperror "sge-london-eye/internal/errors"

	"github.com/gin-gonic/gin"
)

// safeInlineTypes — tipos que es seguro mostrar en el navegador (inline).
var safeInlineTypes = map[string]bool{
	"image/jpeg": true, "image/png": true, "image/webp": true, "application/pdf": true,
}

// serveFile entrega un archivo con cabeceras seguras. Para tipos no whitelisted
// (ej. un HTML malicioso llegado por mail) fuerza descarga como octet-stream, y
// agrega nosniff + CSP sandbox para que, aunque el tipo se escape, el contenido
// no se ejecute en el origen del backend. Cierra el XSS de adjuntos entrantes.
func serveFile(c *gin.Context, data []byte, filename string) {
	ct := http.DetectContentType(data)
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Content-Security-Policy", "default-src 'none'; sandbox")
	disp := "inline"
	if !safeInlineTypes[ct] {
		ct = "application/octet-stream"
		disp = "attachment"
	}
	c.Header("Content-Disposition", disp+`; filename="`+sanitizeHeaderFilename(filename)+`"`)
	c.Data(http.StatusOK, ct, data)
}

// sanitizeHeaderFilename saca comillas y saltos de línea del nombre para no
// romper (ni inyectar en) el header Content-Disposition.
func sanitizeHeaderFilename(name string) string {
	return strings.NewReplacer(`"`, "", "\r", "", "\n", "").Replace(name)
}

func respondError(c *gin.Context, err error) {
	var appErr *apperror.AppError
	if errors.As(err, &appErr) {
		status := appErrToStatus(appErr.Err)
		logError(c, status, appErr.Code, err)
		c.JSON(status, gin.H{
			"error": appErr.Message,
			"code":  appErr.Code,
		})
		return
	}
	// Sentinels devueltos directamente sin envolver en AppError
	if status := appErrToStatus(err); status != http.StatusInternalServerError {
		logError(c, status, "", err)
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	logError(c, http.StatusInternalServerError, "", err)
	c.JSON(http.StatusInternalServerError, gin.H{"error": "error interno del servidor"})
}

// logError registra el detalle interno del error (útil sobre todo en 5xx, donde
// al cliente se le oculta la causa). El logger de requests ya loguea
// method/path/status; acá se agrega el error real y el código. No incluye body
// ni credenciales.
func logError(c *gin.Context, status int, code string, err error) {
	attrs := []any{
		slog.String("request_id", c.GetString("request_id")),
		slog.String("method", c.Request.Method),
		slog.String("path", c.Request.URL.Path),
		slog.Int("status", status),
		slog.String("error", err.Error()),
	}
	if code != "" {
		attrs = append(attrs, slog.String("code", code))
	}
	if status >= 500 {
		slog.Error("request error", attrs...)
	} else {
		slog.Warn("request error", attrs...)
	}
}

func appErrToStatus(err error) int {
	switch {
	case errors.Is(err, apperror.ErrNotFound):
		return http.StatusNotFound
	case errors.Is(err, apperror.ErrUnauthorized), errors.Is(err, apperror.ErrInvalidCredentials):
		return http.StatusUnauthorized
	case errors.Is(err, apperror.ErrForbidden):
		return http.StatusForbidden
	case errors.Is(err, apperror.ErrConflict), errors.Is(err, apperror.ErrCourseFull):
		return http.StatusConflict
	case errors.Is(err, apperror.ErrBadRequest), errors.Is(err, apperror.ErrPaymentNotPending):
		return http.StatusBadRequest
	default:
		return http.StatusInternalServerError
	}
}
