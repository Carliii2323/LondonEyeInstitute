package handlers

import (
	"net/http"
	"time"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CalendarHandler struct {
	svc *services.CalendarService
}

func NewCalendarHandler(pool *pgxpool.Pool) *CalendarHandler {
	return &CalendarHandler{svc: services.NewCalendarService(pool)}
}

func (h *CalendarHandler) List(c *gin.Context) {
	now := time.Now()
	month := queryInt(c, "month", int(now.Month()))
	year := queryInt(c, "year", now.Year())

	items, err := h.svc.List(c.Request.Context(), month, year, c.GetString("userID"), c.GetString("userRole"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *CalendarHandler) Create(c *gin.Context) {
	var req dto.CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	id, err := h.svc.Create(c.Request.Context(), req, c.GetString("userID"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *CalendarHandler) Update(c *gin.Context) {
	var req dto.UpdateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	if err := h.svc.Update(c.Request.Context(), c.Param("id"), req); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "evento actualizado"})
}

func (h *CalendarHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), c.Param("id")); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "evento eliminado"})
}
