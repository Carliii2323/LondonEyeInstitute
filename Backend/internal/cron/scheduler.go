package cron

import (
	"context"
	"log"
	"sort"
	"time"

	"sge-london-eye/internal/services"

	"github.com/robfig/cron/v3"
)

// JobFunc es la firma de un job ejecutable (por cron o por trigger manual).
type JobFunc func(context.Context) (map[string]any, error)

// Runner orquesta los jobs programados. La whitelist de jobs válidos es
// el propio mapa: un nombre fuera de él no se puede ejecutar.
type Runner struct {
	jobs map[string]JobFunc
}

func NewRunner(payments *services.PaymentService, auth *services.AuthService) *Runner {
	return &Runner{
		jobs: map[string]JobFunc{
			"monthly-invoices": payments.GenerateMonthlyInvoices,
			"course-derechos":  payments.GenerateDerechos,
			"overdue-payments": payments.MarkOverduePayments,
			"cleanup-tokens":   auth.CleanupExpiredTokens,
		},
	}
}

// Run ejecuta un job por nombre. El segundo retorno indica si el job existe
// (false → nombre fuera de la whitelist).
func (r *Runner) Run(ctx context.Context, job string) (map[string]any, bool, error) {
	fn, ok := r.jobs[job]
	if !ok {
		return nil, false, nil
	}
	res, err := fn(ctx)
	return res, true, err
}

// JobNames devuelve los nombres válidos, ordenados (para mensajes de error).
func (r *Runner) JobNames() []string {
	names := make([]string, 0, len(r.jobs))
	for k := range r.jobs {
		names = append(names, k)
	}
	sort.Strings(names)
	return names
}

// Start registra los schedules y arranca el cron en background.
// Devuelve el *cron.Cron para que el caller pueda detenerlo en el shutdown.
func (r *Runner) Start() *cron.Cron {
	c := cron.New()
	// min hora día mes weekday
	c.AddFunc("0 2 1 * *", func() { r.runLogged("monthly-invoices") }) // 1° de mes 02:00
	c.AddFunc("15 2 1 * *", func() { r.runLogged("course-derechos") }) // 1° de mes 02:15 (solo actúa feb/jul/nov)
	c.AddFunc("0 3 * * *", func() { r.runLogged("overdue-payments") }) // diario 03:00
	c.AddFunc("0 4 * * *", func() { r.runLogged("cleanup-tokens") })   // diario 04:00
	c.Start()
	log.Println("cron iniciado: monthly-invoices (1° 02:00), course-derechos (1° 02:15), overdue-payments (diario 03:00), cleanup-tokens (diario 04:00)")
	return c
}

// runLogged ejecuta un job desde el scheduler y loguea resultado o error.
func (r *Runner) runLogged(job string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	start := time.Now()
	res, _, err := r.Run(ctx, job)
	if err != nil {
		log.Printf("[cron] %s FALLÓ tras %s: %v", job, time.Since(start), err)
		return
	}
	log.Printf("[cron] %s OK en %s: %v", job, time.Since(start), res)
}
