package handlers

import (
	"net/http"
	"strconv"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StudentHandler struct {
	svc        *services.StudentService
	gradeSvc   *services.GradeService
	attendSvc  *services.AttendanceService
}

func NewStudentHandler(pool *pgxpool.Pool) *StudentHandler {
	return &StudentHandler{
		svc:       services.NewStudentService(pool),
		gradeSvc:  services.NewGradeService(pool),
		attendSvc: services.NewAttendanceService(pool),
	}
}

func (h *StudentHandler) List(c *gin.Context) {
	search := c.DefaultQuery("search", "")
	status := c.DefaultQuery("status", "")
	page := queryInt(c, "page", 1)
	pageSize := queryInt(c, "page_size", 20)

	result, err := h.svc.List(c.Request.Context(), search, status, page, pageSize)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *StudentHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	student, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, student)
}

func (h *StudentHandler) Create(c *gin.Context) {
	var req dto.CreateStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	student, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, student)
}

func (h *StudentHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	student, err := h.svc.Update(c.Request.Context(), id, req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, student)
}

func (h *StudentHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	if err := h.svc.UpdateStatus(c.Request.Context(), id, req.Status); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "estado actualizado"})
}

func (h *StudentHandler) Approve(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Approve(c.Request.Context(), id); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "estudiante aprobado"})
}

func (h *StudentHandler) GetGrades(c *gin.Context) {
	id := c.Param("id")
	resp, err := h.gradeSvc.GetMyGrades(c.Request.Context(), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *StudentHandler) GetAttendance(c *gin.Context) {
	id := c.Param("id")
	items, err := h.attendSvc.GetHistory(c.Request.Context(), id, "", c.GetString("userID"), "admin")
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

// queryInt lee un query param como int con fallback.
func queryInt(c *gin.Context, key string, fallback int) int {
	if v := c.Query(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return fallback
}
