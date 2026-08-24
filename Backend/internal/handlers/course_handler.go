package handlers

import (
	"net/http"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CourseHandler struct {
	svc *services.CourseService
}

func NewCourseHandler(pool *pgxpool.Pool) *CourseHandler {
	return &CourseHandler{svc: services.NewCourseService(pool)}
}

func (h *CourseHandler) List(c *gin.Context) {
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

// Stats — GET /admin/courses/stats (stat cards)
func (h *CourseHandler) Stats(c *gin.Context) {
	stats, err := h.svc.Stats(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *CourseHandler) GetByID(c *gin.Context) {
	course, err := h.svc.GetByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, course)
}

func (h *CourseHandler) Create(c *gin.Context) {
	var req dto.CreateCourseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	course, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, course)
}

func (h *CourseHandler) Update(c *gin.Context) {
	var req dto.UpdateCourseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	course, err := h.svc.Update(c.Request.Context(), c.Param("id"), req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, course)
}

func (h *CourseHandler) UpdateStatus(c *gin.Context) {
	var req dto.UpdateCourseStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	if err := h.svc.UpdateStatus(c.Request.Context(), c.Param("id"), req.Status); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "estado actualizado"})
}

func (h *CourseHandler) ListByTeacher(c *gin.Context) {
	courses, err := h.svc.ListByTeacher(c.Request.Context(), c.GetString("userID"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, courses)
}

// ListMyCourses — GET /student/courses ("Mis Cursos" del alumno autenticado)
func (h *CourseHandler) ListMyCourses(c *gin.Context) {
	courses, err := h.svc.ListByStudent(c.Request.Context(), c.GetString("userID"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, courses)
}

// ListByTeacherID — GET /admin/teachers/:id/courses (cursos de un docente, admin)
func (h *CourseHandler) ListByTeacherID(c *gin.Context) {
	courses, err := h.svc.ListByTeacher(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, courses)
}

func (h *CourseHandler) ListStudents(c *gin.Context) {
	students, err := h.svc.ListStudents(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, students)
}

// ListMyCourseStudents — GET /teacher/courses/:id/students (roster del curso del docente)
func (h *CourseHandler) ListMyCourseStudents(c *gin.Context) {
	students, err := h.svc.ListStudentsForTeacher(c.Request.Context(), c.Param("id"), c.GetString("userID"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, students)
}
