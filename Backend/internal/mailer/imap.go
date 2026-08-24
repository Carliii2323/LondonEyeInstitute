package mailer

import (
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"github.com/emersion/go-message/mail"
)

// IMAPConfig — credenciales de la casilla desde la que se reciben comprobantes.
type IMAPConfig struct {
	Host string // ej: imap.gmail.com (se conecta por IMAPS en el 993)
	User string
	Pass string
}

// Límites de ingesta: evitan agotar memoria/disco con adjuntos o casillas grandes.
const (
	maxAttachmentBytes = 6 << 20 // 6 MB por adjunto (coherente con el upload por app)
	maxMessagesPerPoll = 50      // el resto queda sin leer para el próximo ciclo
)

// Attachment — un adjunto del mail. Oversized=true cuando superó el límite y no
// se leyó su contenido (Data queda nil), para que el poller lo registre igual.
type Attachment struct {
	Filename  string
	Data      []byte
	Oversized bool
}

// InboundMessage — mail entrante ya parseado.
type InboundMessage struct {
	UID         uint32
	MessageID   string
	From        string // remitente en minúsculas (mailbox@host)
	Subject     string
	Date        time.Time
	Body        string
	Attachments []Attachment
}

// PollInbox se conecta por IMAPS, procesa los mails NO leídos del INBOX con el
// handler dado y marca como leído SOLO los que el handler procesó sin error
// (así un fallo transitorio se reintenta en el próximo poll). Devuelve cuántos
// se procesaron OK.
func PollInbox(cfg IMAPConfig, handler func(InboundMessage) error) (int, error) {
	c, err := client.DialTLS(cfg.Host+":993", nil)
	if err != nil {
		return 0, fmt.Errorf("imap dial: %w", err)
	}
	defer c.Logout()

	if err := c.Login(cfg.User, cfg.Pass); err != nil {
		return 0, fmt.Errorf("imap login: %w", err)
	}
	if _, err := c.Select("INBOX", false); err != nil {
		return 0, fmt.Errorf("imap select: %w", err)
	}

	criteria := imap.NewSearchCriteria()
	criteria.WithoutFlags = []string{imap.SeenFlag}
	uids, err := c.UidSearch(criteria)
	if err != nil {
		return 0, fmt.Errorf("imap search: %w", err)
	}
	if len(uids) == 0 {
		return 0, nil
	}
	if len(uids) > maxMessagesPerPoll {
		uids = uids[:maxMessagesPerPoll] // acota el pico; el resto va al próximo ciclo
	}

	seqset := new(imap.SeqSet)
	seqset.AddNum(uids...)
	section := &imap.BodySectionName{}
	items := []imap.FetchItem{imap.FetchEnvelope, imap.FetchUid, section.FetchItem()}

	messages := make(chan *imap.Message, 10)
	done := make(chan error, 1)
	go func() { done <- c.UidFetch(seqset, items, messages) }()

	processed := 0
	var okUIDs []uint32
	for msg := range messages {
		im, perr := parseMessage(msg, section)
		if perr != nil {
			continue // no parseable: se deja sin leer para diagnóstico
		}
		if err := handler(im); err != nil {
			continue // handler falló: se deja sin leer para reintentar
		}
		processed++
		okUIDs = append(okUIDs, msg.Uid)
	}
	if err := <-done; err != nil {
		return processed, fmt.Errorf("imap fetch: %w", err)
	}

	if len(okUIDs) > 0 {
		markSet := new(imap.SeqSet)
		markSet.AddNum(okUIDs...)
		op := imap.FormatFlagsOp(imap.AddFlags, true)
		if err := c.UidStore(markSet, op, []interface{}{imap.SeenFlag}, nil); err != nil {
			return processed, fmt.Errorf("imap store seen: %w", err)
		}
	}
	return processed, nil
}

func parseMessage(msg *imap.Message, section *imap.BodySectionName) (InboundMessage, error) {
	im := InboundMessage{UID: msg.Uid}
	if msg.Envelope != nil {
		im.Subject = msg.Envelope.Subject
		im.Date = msg.Envelope.Date
		im.MessageID = msg.Envelope.MessageId
		if len(msg.Envelope.From) > 0 {
			a := msg.Envelope.From[0]
			im.From = strings.ToLower(a.MailboxName + "@" + a.HostName)
		}
	}

	lit := msg.GetBody(section)
	if lit == nil {
		return im, fmt.Errorf("mensaje sin body")
	}
	mr, err := mail.CreateReader(lit)
	if err != nil {
		return im, err
	}

	var bodyParts []string
	for {
		p, err := mr.NextPart()
		if err == io.EOF {
			break
		} else if err != nil {
			break
		}
		switch h := p.Header.(type) {
		case *mail.InlineHeader:
			if ct, _, _ := h.ContentType(); strings.HasPrefix(ct, "text/plain") {
				b, _ := io.ReadAll(p.Body)
				bodyParts = append(bodyParts, string(b))
			}
		case *mail.AttachmentHeader:
			filename, _ := h.Filename()
			// Leer con tope: si excede, no cargamos el contenido en memoria.
			data, _ := io.ReadAll(io.LimitReader(p.Body, maxAttachmentBytes+1))
			if len(data) > maxAttachmentBytes {
				im.Attachments = append(im.Attachments, Attachment{Filename: filename, Oversized: true})
			} else if len(data) > 0 {
				im.Attachments = append(im.Attachments, Attachment{Filename: filename, Data: data})
			}
		}
	}
	im.Body = strings.Join(bodyParts, "\n")
	return im, nil
}
