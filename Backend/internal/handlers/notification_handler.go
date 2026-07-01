package handlers

import (
	"net/http"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NotificationHandler struct {
	svc *services.NotificationService
}

func NewNotificationHandler(pool *pgxpool.Pool) *NotificationHandler {
	return &NotificationHandler{svc: services.NewNotificationService(pool)}
}

func (h *NotificationHandler) List(c *gin.Context) {
	items, err := h.svc.List(c.Request.Context(), c.GetString("userID"), c.GetString("userRole"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *NotificationHandler) Create(c *gin.Context) {
	var req dto.CreateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	id, err := h.svc.Create(c.Request.Context(), req, c.GetString("userID"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *NotificationHandler) Update(c *gin.Context) {
	var req dto.UpdateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	if err := h.svc.Update(c.Request.Context(), c.Param("id"), req); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "notificación actualizada"})
}

func (h *NotificationHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), c.Param("id")); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "notificación eliminada"})
}
