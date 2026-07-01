package handlers

import (
	"errors"
	"net/http"

	apperror "sge-london-eye/internal/errors"

	"github.com/gin-gonic/gin"
)

func respondError(c *gin.Context, err error) {
	var appErr *apperror.AppError
	if errors.As(err, &appErr) {
		c.JSON(appErrToStatus(appErr.Err), gin.H{
			"error": appErr.Message,
			"code":  appErr.Code,
		})
		return
	}
	// Sentinels devueltos directamente sin envolver en AppError
	if status := appErrToStatus(err); status != http.StatusInternalServerError {
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "error interno del servidor"})
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
