package cron

import (
	"context"
	"fmt"
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
	jobs            map[string]JobFunc
	inboundEnabled  bool
	inboundEveryMin int
}

// NewRunner arma el runner. inbound puede ser nil (si no hay IMAP configurado):
// en ese caso el job "poll-inbound" no se registra ni se agenda.
func NewRunner(payments *services.PaymentService, auth *services.AuthService, inbound *services.InboundPoller, inboundEveryMin int) *Runner {
	jobs := map[string]JobFunc{
		"monthly-invoices": payments.GenerateMonthlyInvoices,
		"course-derechos":  payments.GenerateDerechos,
		"overdue-payments": payments.MarkOverduePayments,
		"cleanup-tokens":   auth.CleanupExpiredTokens,
	}
	if inbound != nil {
		jobs["poll-inbound"] = inbound.PollInbox
	}
	return &Runner{jobs: jobs, inboundEnabled: inbound != nil, inboundEveryMin: inboundEveryMin}
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

	inboundMsg := "poll-inbound (deshabilitado: sin IMAP)"
	if r.inboundEnabled {
		every := r.inboundEveryMin
		if every < 1 {
			every = 5
		}
		c.AddFunc(fmt.Sprintf("@every %dm", every), func() { r.runLogged("poll-inbound") })
		inboundMsg = fmt.Sprintf("poll-inbound (cada %dm)", every)
	}

	c.Start()
	log.Printf("cron iniciado: monthly-invoices (1° 02:00), course-derechos (1° 02:15), overdue-payments (diario 03:00), cleanup-tokens (diario 04:00), %s", inboundMsg)
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
