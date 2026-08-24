package services

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"sge-london-eye/internal/config"
	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/mailer"
	"sge-london-eye/internal/storage"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// allowedReceiptTypes — tipos aceptados para un comprobante, y su extensión
// canónica (la extensión sale del tipo detectado, no del nombre del remitente).
var allowedReceiptTypes = map[string]string{
	"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf",
}

// InboundPoller — job de cron que baja los comprobantes recibidos por mail
// (IMAP) y los deposita en la bandeja (inbound_receipts). No auto-aprueba:
// solo ingesta; el admin resuelve desde la card de Revisión.
type InboundPoller struct {
	pool    *pgxpool.Pool
	storage storage.Storage
	imap    mailer.IMAPConfig
}

func NewInboundPoller(pool *pgxpool.Pool, s storage.Storage, cfg *config.Config) *InboundPoller {
	return &InboundPoller{
		pool:    pool,
		storage: s,
		imap:    mailer.IMAPConfig{Host: cfg.IMAPHost, User: cfg.IMAPUser, Pass: cfg.IMAPPass},
	}
}

// PollInbox baja los no leídos y los inserta en la bandeja (idempotente por
// message_uid). Firma compatible con el runner de cron.
func (p *InboundPoller) PollInbox(ctx context.Context) (map[string]any, error) {
	skipped := 0
	processed, err := mailer.PollInbox(p.imap, func(m mailer.InboundMessage) error {
		ingested, herr := p.ingest(ctx, m)
		if herr != nil {
			return herr
		}
		if !ingested {
			skipped++
		}
		return nil
	})
	res := map[string]any{"processed": processed, "skipped_sin_adjunto": skipped}
	if err != nil {
		return res, err
	}
	return res, nil
}

// ingest deposita un mail en la bandeja. Devuelve false si se omite (sin adjunto).
func (p *InboundPoller) ingest(ctx context.Context, m mailer.InboundMessage) (bool, error) {
	if len(m.Attachments) == 0 {
		return false, nil // sin adjunto: no hay comprobante que depositar
	}
	att := m.Attachments[0]
	q := dbsqlc.New(p.pool)

	// Identificación por remitente (email registrado de un alumno).
	var studentID pgtype.UUID
	status := "sin_identificar"
	if u, err := q.GetUserByEmail(ctx, m.From); err == nil && string(u.Role) == "student" {
		studentID = u.ID
		status = "identificado"
	}

	// Ayudas detectadas del cuerpo (best-effort; el admin confirma).
	text := m.Subject + "\n" + m.Body
	dni := detectDNI(text)
	amount := detectAmount(text)

	// Validar el adjunto: solo se persiste si es un tipo soportado y no excede el
	// tamaño. Si no, se registra el entrante SIN archivo con una nota, para que el
	// admin sepa que llegó algo y pida reenvío (no se descarta en silencio).
	attachmentURL, attachmentName, note := "", "", ""
	switch {
	case att.Oversized:
		note = " [Adjunto demasiado grande — pedir reenvío (máx 6 MB)]"
	default:
		ext, ok := allowedReceiptTypes[http.DetectContentType(att.Data)]
		if !ok {
			note = fmt.Sprintf(" [Adjunto no soportado (%s) — pedir reenvío en PDF o imagen]", att.Filename)
		} else if url, err := p.storage.Save(ctx, "inbound", inboundFilename(m, ext), att.Data); err != nil {
			return false, err
		} else {
			attachmentURL, attachmentName = url, att.Filename
		}
	}

	uid := m.MessageID
	if uid == "" {
		uid = fmt.Sprintf("imap-uid-%d", m.UID)
	}

	received := m.Date
	if received.IsZero() {
		received = time.Now()
	}

	if _, err := q.CreateInboundReceipt(ctx, dbsqlc.CreateInboundReceiptParams{
		FromEmail:          m.From,
		StudentID:          studentID,
		Subject:            m.Subject,
		BodyExcerpt:        excerpt(m.Body, 400) + note,
		AttachmentUrl:      attachmentURL,
		AttachmentFilename: attachmentName,
		MessageUid:         uid,
		Status:             status,
		ReceivedAt:         pgtype.Timestamptz{Time: received, Valid: true},
		DetectedDni:        dni,
		DetectedAmount:     amount,
	}); err != nil {
		return false, err
	}
	return true, nil
}

// ── detección best-effort de DNI y monto ─────────────────────────────

var (
	dniLabeledRe = regexp.MustCompile(`(?i)(?:dni|documento|d\.n\.i\.?)[^\d]{0,6}([\d.]{7,11})`)
	dniDottedRe  = regexp.MustCompile(`\b\d{1,2}\.\d{3}\.\d{3}\b`)
	dniPlainRe   = regexp.MustCompile(`\b\d{7,8}\b`)
	amountSignRe = regexp.MustCompile(`\$\s?([\d][\d.,]*)`)
	amountWordRe = regexp.MustCompile(`(?i)(?:pag(?:u[eé]|o|ar|a)|abon[eé]|dep[oó]sit[eo]|transfer[ií]|monto|importe|total)[^\d]{0,10}([\d][\d.,]*)`)
	decimalTail  = regexp.MustCompile(`[.,]\d{2}$`)
	nonDigitRe   = regexp.MustCompile(`\D`)
)

func detectDNI(s string) string {
	if m := dniLabeledRe.FindStringSubmatch(s); len(m) == 2 {
		if d := nonDigitRe.ReplaceAllString(m[1], ""); len(d) == 7 || len(d) == 8 {
			return d
		}
	}
	if m := dniDottedRe.FindString(s); m != "" {
		return nonDigitRe.ReplaceAllString(m, "")
	}
	return dniPlainRe.FindString(s)
}

// detectAmount devuelve el monto hallado (NULL si no hay). Prioriza montos con
// símbolo "$"; si no, montos precedidos por "pagué/monto/importe/total".
func detectAmount(s string) pgtype.Numeric {
	var raw string
	if m := amountSignRe.FindStringSubmatch(s); len(m) == 2 {
		raw = m[1]
	} else if m := amountWordRe.FindStringSubmatch(s); len(m) == 2 {
		raw = m[1]
	} else {
		return pgtype.Numeric{}
	}
	norm := normalizeAmount(raw)
	var n pgtype.Numeric
	if norm == "" || n.Scan(norm) != nil {
		return pgtype.Numeric{}
	}
	return n
}

// normalizeAmount pasa "12.345,67" / "12.000" / "12345,50" a un decimal parseable.
func normalizeAmount(raw string) string {
	raw = strings.TrimSpace(raw)
	hasComma := strings.Contains(raw, ",")
	hasDot := strings.Contains(raw, ".")
	switch {
	case hasComma && hasDot:
		// formato es-AR: punto = miles, coma = decimal
		raw = strings.ReplaceAll(raw, ".", "")
		raw = strings.ReplaceAll(raw, ",", ".")
	case hasComma:
		if decimalTail.MatchString(raw) {
			raw = strings.ReplaceAll(raw, ",", ".")
		} else {
			raw = strings.ReplaceAll(raw, ",", "")
		}
	case hasDot:
		if !decimalTail.MatchString(raw) {
			raw = strings.ReplaceAll(raw, ".", "") // punto de miles
		}
	}
	if !regexp.MustCompile(`^\d+(\.\d{1,2})?$`).MatchString(raw) {
		return ""
	}
	return raw
}

// excerpt recorta a n bytes sin partir una runa UTF-8 y devuelve UTF-8 válido.
// (Cortar por bytes podía dejar UTF-8 inválido → PostgreSQL lo rechazaba → el
// mail se reintentaba cada ciclo para siempre.)
func excerpt(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) > n {
		cut := n
		for cut > 0 && !utf8.RuneStart(s[cut]) {
			cut--
		}
		s = s[:cut]
	}
	return strings.ToValidUTF8(s, "")
}

func inboundFilename(m mailer.InboundMessage, ext string) string {
	base := m.MessageID
	if base == "" {
		base = fmt.Sprintf("uid-%d", m.UID)
	}
	base = regexp.MustCompile(`[^a-zA-Z0-9_-]`).ReplaceAllString(base, "_")
	if len(base) > 80 {
		base = base[:80]
	}
	return base + ext
}
