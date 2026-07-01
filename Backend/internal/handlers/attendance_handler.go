package handlers

import (
	"net/http"
	"time"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AttendanceHandler struct {
	svc *services.AttendanceService
}

func NewAttendanceHandler(pool *pgxpool.Pool) *AttendanceHandler {
	return &AttendanceHandler{svc: services.NewAttendanceService(pool)}
}

func (h *AttendanceHandler) GetSession(c *gin.Context) {
	courseID := c.Query("course_id")
	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	if courseID == "" {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "course_id requerido"})
		return
	}

	resp, err := h.svc.GetSession(c.Request.Context(), courseID, date, c.GetString("userID"), c.GetString("userRole"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *AttendanceHandler) SaveAttendance(c *gin.Context) {
	var req dto.SaveAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	if err := h.svc.SaveAttendance(c.Request.Context(), req, c.GetString("userID"), c.GetString("userRole")); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "asistencia guardada"})
}

func (h *AttendanceHandler) GetHistory(c *gin.Context) {
	studentID := c.Param("studentId")
	courseID := c.DefaultQuery("course_id", "")

	items, err := h.svc.GetHistory(c.Request.Context(), studentID, courseID, c.GetString("userID"), c.GetString("userRole"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *AttendanceHandler) GetAnnual(c *gin.Context) {
	courseID := c.Query("course_id")
	if courseID == "" {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "course_id requerido"})
		return
	}
	year := queryInt(c, "year", time.Now().Year())

	rows, err := h.svc.GetAnnual(c.Request.Context(), courseID, year, c.GetString("userID"), c.GetString("userRole"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, rows)
}

func (h *AttendanceHandler) GetMyAttendance(c *gin.Context) {
	items, err := h.svc.GetMyAttendance(c.Request.Context(), c.GetString("userID"), c.DefaultQuery("course_id", ""))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}
