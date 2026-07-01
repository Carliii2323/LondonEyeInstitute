package handlers

import (
	"errors"
	"net/http"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CertificateHandler struct {
	svc *services.CertificateService
}

func NewCertificateHandler(pool *pgxpool.Pool) *CertificateHandler {
	return &CertificateHandler{svc: services.NewCertificateService(pool)}
}

func (h *CertificateHandler) Issue(c *gin.Context) {
	var req dto.IssueCertificateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	detail, err := h.svc.Issue(c.Request.Context(), req, c.GetString("userID"))
	if err != nil {
		// Caso especial: no elegible → 409 con el breakdown de cuotas impagas
		var neErr *services.NotEligibleError
		if errors.As(err, &neErr) {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "el alumno no es elegible: tiene cuotas mensuales sin aprobar",
				"code":    "NOT_ELIGIBLE",
				"details": neErr,
			})
			return
		}
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, detail)
}

func (h *CertificateHandler) List(c *gin.Context) {
	items, err := h.svc.List(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *CertificateHandler) ListMine(c *gin.Context) {
	items, err := h.svc.ListByStudent(c.Request.Context(), c.GetString("userID"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *CertificateHandler) GetByID(c *gin.Context) {
	detail, err := h.svc.GetByID(c.Request.Context(), c.Param("id"), c.GetString("userID"), c.GetString("userRole"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, detail)
}
