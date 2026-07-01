package handlers

import (
	"net/http"
	"strings"
	"time"

	"sge-london-eye/internal/cron"
	"sge-london-eye/internal/dto"

	"github.com/gin-gonic/gin"
)

type CronHandler struct {
	runner *cron.Runner
}

func NewCronHandler(runner *cron.Runner) *CronHandler {
	return &CronHandler{runner: runner}
}

// Run dispara manualmente un job de cron (operación / testing).
// POST /admin/cron/run/:job — :job validado contra la whitelist del Runner.
func (h *CronHandler) Run(c *gin.Context) {
	job := c.Param("job")
	start := time.Now()

	res, found, err := h.runner.Run(c.Request.Context(), job)
	if !found {
		c.JSON(http.StatusNotFound, dto.ApiError{
			Error: "job desconocido. Válidos: " + strings.Join(h.runner.JobNames(), ", "),
			Code:  "UNKNOWN_JOB",
		})
		return
	}
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.CronRunResult{
		Job:        job,
		ExecutedAt: start.Format(time.RFC3339),
		DurationMs: time.Since(start).Milliseconds(),
		Result:     res,
	})
}
