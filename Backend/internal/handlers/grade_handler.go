package handlers

import (
	"net/http"
	"time"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type GradeHandler struct {
	svc *services.GradeService
}

func NewGradeHandler(pool *pgxpool.Pool) *GradeHandler {
	return &GradeHandler{svc: services.NewGradeService(pool)}
}

func (h *GradeHandler) Get(c *gin.Context) {
	courseID := c.Query("course_id")
	if courseID == "" {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "course_id requerido"})
		return
	}
	year := queryInt(c, "year", time.Now().Year())
	role := c.GetString("userRole")
	userID := c.GetString("userID")

	resp, err := h.svc.GetByCourseAndYear(c.Request.Context(), courseID, year, userID, role)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *GradeHandler) Save(c *gin.Context) {
	var req dto.SaveGradesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	role := c.GetString("userRole")
	userID := c.GetString("userID")

	if err := h.svc.Save(c.Request.Context(), req, userID, role); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "notas guardadas"})
}

func (h *GradeHandler) GetMyGrades(c *gin.Context) {
	userID := c.GetString("userID")

	resp, err := h.svc.GetMyGrades(c.Request.Context(), userID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}
