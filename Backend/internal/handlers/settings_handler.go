package handlers

import (
	"net/http"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SettingsHandler struct {
	svc *services.SettingsService
}

func NewSettingsHandler(pool *pgxpool.Pool) *SettingsHandler {
	return &SettingsHandler{svc: services.NewSettingsService(pool)}
}

func (h *SettingsHandler) Get(c *gin.Context) {
	settings, err := h.svc.Get(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, settings)
}

// GetPublic — GET /settings/public (cualquier usuario autenticado)
func (h *SettingsHandler) GetPublic(c *gin.Context) {
	settings, err := h.svc.GetPublic(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *SettingsHandler) Update(c *gin.Context) {
	var req dto.UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	if err := h.svc.Update(c.Request.Context(), req); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "configuración actualizada"})
}
