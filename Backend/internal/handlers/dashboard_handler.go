package handlers

import (
	"net/http"
	"time"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DashboardHandler struct {
	svc *services.DashboardService
}

func NewDashboardHandler(pool *pgxpool.Pool) *DashboardHandler {
	return &DashboardHandler{svc: services.NewDashboardService(pool)}
}

func (h *DashboardHandler) Stats(c *gin.Context) {
	now := time.Now()
	month := queryInt(c, "month", int(now.Month()))
	year := queryInt(c, "year", now.Year())

	if month < 1 || month > 12 {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "month debe estar entre 1 y 12", Code: "INVALID_MONTH"})
		return
	}
	if year < 2020 {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "year inválido (>= 2020)", Code: "INVALID_YEAR"})
		return
	}

	stats, err := h.svc.Stats(c.Request.Context(), month, year)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *DashboardHandler) Activity(c *gin.Context) {
	limit := queryInt(c, "limit", 10)
	items, err := h.svc.Activity(c.Request.Context(), limit)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *DashboardHandler) EnrollmentsSeries(c *gin.Context) {
	months := queryInt(c, "months", 6)
	series, err := h.svc.EnrollmentsSeries(c.Request.Context(), months)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, series)
}

func (h *DashboardHandler) Events(c *gin.Context) {
	limit := queryInt(c, "limit", 5)
	items, err := h.svc.UpcomingEvents(c.Request.Context(), limit)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}
