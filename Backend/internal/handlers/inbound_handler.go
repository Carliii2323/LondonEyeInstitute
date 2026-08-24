package handlers

import (
	"net/http"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"
	"sge-london-eye/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type InboundReceiptHandler struct {
	svc *services.InboundReceiptService
}

func NewInboundReceiptHandler(pool *pgxpool.Pool, s storage.Storage) *InboundReceiptHandler {
	return &InboundReceiptHandler{svc: services.NewInboundReceiptService(pool, s)}
}

// List — GET /admin/inbound-receipts?status=
func (h *InboundReceiptHandler) List(c *gin.Context) {
	items, err := h.svc.List(c.Request.Context(), c.Query("status"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

// Candidates — GET /admin/inbound-receipts/:id/candidates
// Devuelve el alumno sugerido y sus cuotas abiertas para vincular.
func (h *InboundReceiptHandler) Candidates(c *gin.Context) {
	sug, err := h.svc.Candidates(c.Request.Context(), c.Param("id"), c.Query("student_id"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, sug)
}

// GetAttachment — GET /admin/inbound-receipts/:id/attachment
func (h *InboundReceiptHandler) GetAttachment(c *gin.Context) {
	data, filename, err := h.svc.GetAttachment(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondError(c, err)
		return
	}
	serveFile(c, data, filename)
}

// Link — POST /admin/inbound-receipts/:id/link
func (h *InboundReceiptHandler) Link(c *gin.Context) {
	var req dto.LinkInboundReceiptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	if err := h.svc.Link(c.Request.Context(), c.Param("id"), req.PaymentID, c.GetString("userID"), req.Approve, req.Method); err != nil {
		respondError(c, err)
		return
	}
	msg := "comprobante vinculado al pago"
	if req.Approve {
		msg = "comprobante vinculado y pago aprobado"
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: msg})
}

// Discard — POST /admin/inbound-receipts/:id/discard
func (h *InboundReceiptHandler) Discard(c *gin.Context) {
	if err := h.svc.Discard(c.Request.Context(), c.Param("id")); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "comprobante descartado"})
}
