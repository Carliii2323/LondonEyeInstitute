package handlers

import (
	"net/http"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LibretaHandler struct {
	svc *services.LibretaService
}

func NewLibretaHandler(pool *pgxpool.Pool) *LibretaHandler {
	return &LibretaHandler{svc: services.NewLibretaService(pool)}
}

// ListMine — GET /student/libreta/requests (estado de mis libretas)
func (h *LibretaHandler) ListMine(c *gin.Context) {
	items, err := h.svc.ListByStudent(c.Request.Context(), c.GetString("userID"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

// Download — POST /student/libreta/download (consume una descarga)
func (h *LibretaHandler) Download(c *gin.Context) {
	var req dto.LibretaActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	if err := h.svc.Download(c.Request.Context(), c.GetString("userID"), req); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "descarga autorizada"})
}

// Request — POST /student/libreta/request (solicita autorización al admin)
func (h *LibretaHandler) Request(c *gin.Context) {
	var req dto.LibretaActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	if err := h.svc.RequestDownload(c.Request.Context(), c.GetString("userID"), req); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, dto.StatusResponse{Message: "solicitud enviada"})
}

// ListPending — GET /admin/libreta/requests (solicitudes pendientes)
func (h *LibretaHandler) ListPending(c *gin.Context) {
	items, err := h.svc.ListPending(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

// Approve — POST /admin/libreta/requests/:id/approve
func (h *LibretaHandler) Approve(c *gin.Context) {
	if err := h.svc.Approve(c.Request.Context(), c.Param("id"), c.GetString("userID")); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "solicitud aprobada"})
}

// Reject — POST /admin/libreta/requests/:id/reject
func (h *LibretaHandler) Reject(c *gin.Context) {
	if err := h.svc.Reject(c.Request.Context(), c.Param("id"), c.GetString("userID")); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "solicitud rechazada"})
}
