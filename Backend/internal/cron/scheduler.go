package cron

// -- Scheduler--
import (
	"context"
	"fmt"
	"log"
	"sort"
	"time"
	_ "time/tzdata" // tzdata embebida: LoadLocation funciona en Windows y en imágenes sin zoneinfo

	"sge-london-eye/internal/services"

	"github.com/robfig/cron/v3"
)

// schedulerTZ — zona horaria del instituto. Los horarios de los jobs
// ("1° de mes 02:00") se interpretan SIEMPRE en esta zona, no en la del server.
const schedulerTZ = "America/Argentina/Buenos_Aires"

// JobFunc es la firma de un job ejecutable (por cron o por trigger manual).
type JobFunc func(context.Context) (map[string]any, error)

// billingJobs — jobs que generan cobros. Son los únicos que respetan el
// interruptor de cobro automático (ver institute_settings.auto_billing_enabled,
// manejable por bash con `make billing-on|billing-off|billing-status`).
// El disparo MANUAL de estos jobs NO pasa por el interruptor: es explícito.
var billingJobs = map[string]bool{
	"monthly-invoices": true,
	"course-derechos":  true,
}

// catchUpJobs — jobs que se corren una vez al arrancar para recuperar lo que
// se haya perdido mientras el proceso estuvo apagado. Todos son idempotentes
// (ON CONFLICT DO NOTHING / marcado de estado), así que repetirlos no duplica.
var catchUpJobs = []string{"monthly-invoices", "course-derechos", "overdue-payments"}

// Runner orquesta los jobs programados. La whitelist de jobs válidos es
// el propio mapa: un nombre fuera de él no se puede ejecutar.
type Runner struct {
	jobs            map[string]JobFunc
	inboundEnabled  bool
	inboundEveryMin int
	// billingEnabled consulta el interruptor de cobro automático.
	billingEnabled func(context.Context) (bool, error)
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
	return &Runner{
		jobs:            jobs,
		inboundEnabled:  inbound != nil,
		inboundEveryMin: inboundEveryMin,
		billingEnabled:  payments.IsAutoBillingEnabled,
	}
}

// Run ejecuta un job por nombre. El segundo retorno indica si el job existe
// (false → nombre fuera de la whitelist). No consulta el interruptor: un
// disparo manual es una acción explícita de operación/mantenimiento.
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
	loc, err := time.LoadLocation(schedulerTZ)
	if err != nil {
		log.Printf("[cron] no se pudo cargar la zona %s (%v): se usa la del sistema", schedulerTZ, err)
		loc = time.Local
	}

	c := cron.New(cron.WithLocation(loc))
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
	log.Printf("cron iniciado (%s): monthly-invoices (1° 02:00), course-derechos (1° 02:15), overdue-payments (diario 03:00), cleanup-tokens (diario 04:00), %s", loc, inboundMsg)

	// Recuperación de lo perdido: el cron solo dispara si el proceso está vivo
	// en ese instante exacto. Si el server estuvo apagado el 1° a las 02:00, el
	// mes no se generaba nunca. Al arrancar corremos los jobs idempotentes.
	go r.runCatchUp()

	return c
}

// runCatchUp corre al arrancar los jobs que pudieron perderse con el proceso
// apagado. Es seguro repetirlos: todos son idempotentes.
func (r *Runner) runCatchUp() {
	log.Printf("[cron] catch-up de arranque: %v", catchUpJobs)
	for _, job := range catchUpJobs {
		r.runLogged(job)
	}
}

// runLogged ejecuta un job desde el scheduler y loguea resultado o error.
// Para los jobs de cobro consulta antes el interruptor de cobro automático.
func (r *Runner) runLogged(job string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	if billingJobs[job] && r.billingEnabled != nil {
		enabled, err := r.billingEnabled(ctx)
		if err != nil {
			log.Printf("[cron] %s OMITIDO: no se pudo leer el interruptor de cobro: %v", job, err)
			return
		}
		if !enabled {
			log.Printf("[cron] %s OMITIDO: cobro automático PARADO (make billing-on para reactivar)", job)
			return
		}
	}

	start := time.Now()
	res, _, err := r.Run(ctx, job)
	if err != nil {
		log.Printf("[cron] %s FALLÓ tras %s: %v", job, time.Since(start), err)
		return
	}
	log.Printf("[cron] %s OK en %s: %v", job, time.Since(start), res)
}
