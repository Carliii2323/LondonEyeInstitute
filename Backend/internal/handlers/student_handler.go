package handlers

import (
	"io"
	"net/http"
	"strconv"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"
	"sge-london-eye/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StudentHandler struct {
	svc       *services.StudentService
	gradeSvc  *services.GradeService
	attendSvc *services.AttendanceService
}

func NewStudentHandler(pool *pgxpool.Pool, store storage.Storage) *StudentHandler {
	return &StudentHandler{
		svc:       services.NewStudentService(pool, store),
		gradeSvc:  services.NewGradeService(pool),
		attendSvc: services.NewAttendanceService(pool),
	}
}

func (h *StudentHandler) List(c *gin.Context) {
	search := c.DefaultQuery("search", "")
	status := c.DefaultQuery("status", "")
	courseID := c.DefaultQuery("course_id", "")
	year := queryInt(c, "year", 0) // 0 = todos los anios
	page := queryInt(c, "page", 1)
	pageSize := queryInt(c, "page_size", 20)

	result, err := h.svc.List(c.Request.Context(), search, status, courseID, year, page, pageSize)
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

// GetMe — GET /student/profile (el alumno autenticado ve sus propios datos:
// dni, domicilio, tutor, etc. — para pre-cargar el contrato).
func (h *StudentHandler) GetMe(c *gin.Context) {
	student, err := h.svc.GetByID(c.Request.Context(), c.GetString("userID"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, student)
}

// UpdateMyAddress — PUT /student/profile/address (el alumno edita su dirección, F9).
func (h *StudentHandler) UpdateMyAddress(c *gin.Context) {
	var req dto.UpdateMyAddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	student, err := h.svc.UpdateMyAddress(c.Request.Context(), c.GetString("userID"), req.Address)
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

// UploadDni — POST /admin/students/:id/dni/:side (side = front|back)
func (h *StudentHandler) UploadDni(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "campo 'file' requerido"})
		return
	}
	defer file.Close()

	const maxSize = 5 << 20 // 5 MB
	if header.Size > maxSize {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "el archivo supera el límite de 5 MB"})
		return
	}
	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiError{Error: "error al leer el archivo"})
		return
	}
	if err := h.svc.UploadDni(c.Request.Context(), c.Param("id"), c.Param("side"), data, header.Filename); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "archivo del DNI guardado"})
}

// GetDni — GET /admin/students/:id/dni/:side (stream autenticado)
func (h *StudentHandler) GetDni(c *gin.Context) {
	data, filename, err := h.svc.GetDni(c.Request.Context(), c.Param("id"), c.Param("side"))
	if err != nil {
		respondError(c, err)
		return
	}
	serveFile(c, data, filename)
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
