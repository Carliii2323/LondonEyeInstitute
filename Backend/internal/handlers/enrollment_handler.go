package handlers

import (
	"net/http"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type EnrollmentHandler struct {
	svc *services.EnrollmentService
}

func NewEnrollmentHandler(pool *pgxpool.Pool) *EnrollmentHandler {
	return &EnrollmentHandler{svc: services.NewEnrollmentService(pool)}
}

func (h *EnrollmentHandler) List(c *gin.Context) {
	studentID := c.DefaultQuery("student_id", "")
	courseID := c.DefaultQuery("course_id", "")
	status := c.DefaultQuery("status", "active")

	items, err := h.svc.List(c.Request.Context(), studentID, courseID, status)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *EnrollmentHandler) Enroll(c *gin.Context) {
	var req dto.EnrollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	resp, err := h.svc.Enroll(c.Request.Context(), req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, resp)
}

func (h *EnrollmentHandler) Drop(c *gin.Context) {
	if err := h.svc.Drop(c.Request.Context(), c.Param("id")); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "inscripción dada de baja"})
}
