package mailer

import (
	"context"
	"fmt"
	"log"
	"mime"
	"net/smtp"
	"strings"

	"sge-london-eye/internal/config"
)

// Sender envía correos salientes. Hay dos implementaciones: una real por SMTP
// y un fallback de log para desarrollo (cuando no hay credenciales cargadas).
type Sender interface {
	Send(ctx context.Context, to, subject, htmlBody string) error
}

// New elige la implementación según la config: si hay SMTP_HOST envía por SMTP;
// si no, usa el LogSender (no envía, solo loguea) — útil en desarrollo.
func New(cfg *config.Config) Sender {
	// Requiere host + usuario: si falta cualquiera, cae en modo log (no rompe).
	if strings.TrimSpace(cfg.SMTPHost) == "" || strings.TrimSpace(cfg.SMTPUser) == "" {
		log.Println("[mailer] SMTP incompleto (falta SMTP_HOST o SMTP_USER): usando LogSender (los correos NO se envían, solo se loguean)")
		return &logSender{from: cfg.SMTPFrom}
	}
	return &smtpSender{
		host: cfg.SMTPHost,
		port: cfg.SMTPPort,
		user: cfg.SMTPUser,
		pass: cfg.SMTPPass,
		from: fromOrUser(cfg.SMTPFrom, cfg.SMTPUser),
	}
}

// ── SMTP real (Gmail/Workspace por STARTTLS en el 587) ────────────────

type smtpSender struct {
	host, from, user, pass string
	port                   int
}

func (s *smtpSender) Send(_ context.Context, to, subject, htmlBody string) error {
	addr := fmt.Sprintf("%s:%d", s.host, s.port)
	auth := smtp.PlainAuth("", s.user, s.pass, s.host)
	// El envelope-from debe ser la casilla autenticada (Gmail lo exige);
	// el header From puede ser un display distinto (SMTP_FROM).
	if err := smtp.SendMail(addr, auth, s.user, []string{to}, buildMIME(s.from, to, subject, htmlBody)); err != nil {
		return fmt.Errorf("smtp send: %w", err)
	}
	return nil
}

// ── Fallback de log (desarrollo sin credenciales) ─────────────────────

type logSender struct{ from string }

func (l *logSender) Send(_ context.Context, to, subject, htmlBody string) error {
	log.Printf("[mailer:log] (NO enviado) from=%q to=%q subject=%q\n%s", l.from, to, subject, htmlBody)
	return nil
}

// ── helpers ───────────────────────────────────────────────────────────

func buildMIME(from, to, subject, htmlBody string) []byte {
	var b strings.Builder
	b.WriteString("From: " + from + "\r\n")
	b.WriteString("To: " + to + "\r\n")
	b.WriteString("Subject: " + mime.QEncoding.Encode("UTF-8", subject) + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	b.WriteString("\r\n")
	b.WriteString(htmlBody)
	return []byte(b.String())
}

func fromOrUser(from, user string) string {
	if strings.TrimSpace(from) == "" {
		return user
	}
	return from
}
