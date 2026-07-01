package handlers

import (
	"net/http"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TeacherHandler struct {
	svc *services.TeacherService
}

func NewTeacherHandler(pool *pgxpool.Pool) *TeacherHandler {
	return &TeacherHandler{svc: services.NewTeacherService(pool)}
}

func (h *TeacherHandler) List(c *gin.Context) {
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

func (h *TeacherHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	teacher, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, teacher)
}

func (h *TeacherHandler) Create(c *gin.Context) {
	var req dto.CreateTeacherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	teacher, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, teacher)
}

func (h *TeacherHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateTeacherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	teacher, err := h.svc.Update(c.Request.Context(), id, req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, teacher)
}

func (h *TeacherHandler) UpdateStatus(c *gin.Context) {
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
