package services

import (
	"context"
	"fmt"
	"log"
	"math"
	"path/filepath"
	"strings"

	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"
	"sge-london-eye/internal/storage"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// InboundReceiptService — bandeja de comprobantes recibidos por mail.
// El admin revisa cada entrante y lo vincula a un pago (pasa a revisión
// normal) o lo descarta. La ingesta (IMAP) es un paso aparte (B.3).
type InboundReceiptService struct {
	pool    *pgxpool.Pool
	storage storage.Storage
}

func NewInboundReceiptService(pool *pgxpool.Pool, s storage.Storage) *InboundReceiptService {
	return &InboundReceiptService{pool: pool, storage: s}
}

// List devuelve la bandeja, opcionalmente filtrada por estado ("" = todos).
func (s *InboundReceiptService) List(ctx context.Context, status string) ([]dto.InboundReceiptItem, error) {
	q := dbsqlc.New(s.pool)
	rows, err := q.ListInboundReceipts(ctx, status)
	if err != nil {
		return nil, apperror.ErrInternal
	}
	items := make([]dto.InboundReceiptItem, len(rows))
	for i, r := range rows {
		items[i] = dto.InboundReceiptItem{
			ID:                 uuidToString(r.ID),
			FromEmail:          r.FromEmail,
			Subject:            r.Subject,
			BodyExcerpt:        r.BodyExcerpt,
			AttachmentFilename: r.AttachmentFilename,
			Status:             r.Status,
			ReceivedAt:         r.ReceivedAt.Time.Format("2006-01-02T15:04:05Z"),
			StudentID:          uuidOrEmpty(r.StudentID),
			StudentName:        strings.TrimSpace(r.FirstName + " " + r.LastName),
			StudentEmail:       r.StudentEmail,
			LinkedPaymentID:    uuidOrEmpty(r.LinkedPaymentID),
			DetectedDNI:        r.DetectedDni,
			DetectedAmount:     numericOrEmpty(r.DetectedAmount),
		}
	}
	return items, nil
}

// Candidates devuelve la sugerencia para resolver un comprobante entrante:
// el alumno sugerido (por remitente o por DNI del cuerpo) y sus cuotas
// abiertas, resaltando la que coincide con el monto detectado.
func (s *InboundReceiptService) Candidates(ctx context.Context, receiptID, overrideStudentID string) (*dto.InboundSuggestion, error) {
	q := dbsqlc.New(s.pool)

	var rid pgtype.UUID
	if err := rid.Scan(receiptID); err != nil {
		return nil, apperror.ErrBadRequest
	}
	rec, err := q.GetInboundReceiptByID(ctx, rid)
	if err != nil {
		return nil, apperror.New(apperror.ErrNotFound, "comprobante no encontrado", "RECEIPT_NOT_FOUND")
	}

	sug := &dto.InboundSuggestion{
		ReceiptID:      receiptID,
		DetectedDNI:    rec.DetectedDni,
		DetectedAmount: numericOrEmpty(rec.DetectedAmount),
		Payments:       []dto.InboundCandidatePayment{},
	}

	// Resolver alumno: si el admin fuerza uno (búsqueda manual), gana; si no,
	// se sugiere por remitente (confirmado) y luego por DNI del cuerpo.
	var studentID pgtype.UUID
	if overrideStudentID != "" {
		if err := studentID.Scan(overrideStudentID); err != nil {
			return nil, apperror.ErrBadRequest
		}
		sug.MatchSource = "manual"
		if st, err := q.GetStudentByID(ctx, studentID); err == nil {
			sug.SuggestedStudentName = strings.TrimSpace(st.FirstName + " " + st.LastName)
		}
	} else if rec.StudentID.Valid {
		studentID = rec.StudentID
		sug.MatchSource = "email"
		if st, err := q.GetStudentByID(ctx, studentID); err == nil {
			sug.SuggestedStudentName = strings.TrimSpace(st.FirstName + " " + st.LastName)
		}
	} else if rec.DetectedDni != "" {
		if st, err := q.GetStudentByDNI(ctx, rec.DetectedDni); err == nil {
			studentID = st.ID
			sug.MatchSource = "dni"
			sug.SuggestedStudentName = strings.TrimSpace(st.FirstName + " " + st.LastName)
		}
	}
	if !studentID.Valid {
		return sug, nil // sin alumno sugerido: el admin lo busca a mano
	}
	sug.SuggestedStudentID = uuidToString(studentID)

	// Cuotas abiertas del alumno; resaltar la que coincide con el monto.
	rows, err := q.ListOpenPaymentsByStudent(ctx, studentID)
	if err != nil {
		return nil, apperror.ErrInternal
	}
	detected := rec.DetectedAmount
	for _, p := range rows {
		total := numericToString(p.Total)
		sug.Payments = append(sug.Payments, dto.InboundCandidatePayment{
			ID:            uuidToString(p.ID),
			Label:         paymentLabel(p.CourseName, p.Month, p.Year),
			Total:         total,
			Status:        string(p.Status),
			MatchesAmount: detected.Valid && numericsEqual(detected, p.Total),
		})
	}
	return sug, nil
}

// GetAttachment lee el adjunto para servirlo al admin.
func (s *InboundReceiptService) GetAttachment(ctx context.Context, receiptID string) (data []byte, filename string, err error) {
	q := dbsqlc.New(s.pool)
	var rid pgtype.UUID
	if err := rid.Scan(receiptID); err != nil {
		return nil, "", apperror.ErrBadRequest
	}
	rec, err := q.GetInboundReceiptByID(ctx, rid)
	if err != nil {
		return nil, "", apperror.New(apperror.ErrNotFound, "comprobante no encontrado", "RECEIPT_NOT_FOUND")
	}
	data, err = s.storage.Read(ctx, rec.AttachmentUrl)
	if err != nil {
		return nil, "", apperror.New(apperror.ErrInternal, "no se pudo leer el adjunto", "STORAGE_READ_ERROR")
	}
	name := rec.AttachmentFilename
	if name == "" {
		name = "comprobante" + filepath.Ext(rec.AttachmentUrl)
	}
	return data, name, nil
}

// Link vincula un comprobante entrante a un pago: copia el adjunto como
// comprobante del pago (lo pasa a 'submitted', revisión normal) y marca el
// entrante como 'vinculado'.
func (s *InboundReceiptService) Link(ctx context.Context, receiptID, paymentID, adminID string, approve bool, method string) error {
	q := dbsqlc.New(s.pool)

	var rid pgtype.UUID
	if err := rid.Scan(receiptID); err != nil {
		return apperror.ErrBadRequest
	}
	rec, err := q.GetInboundReceiptByID(ctx, rid)
	if err != nil {
		return apperror.New(apperror.ErrNotFound, "comprobante no encontrado", "RECEIPT_NOT_FOUND")
	}
	if rec.Status == "vinculado" || rec.Status == "descartado" {
		return apperror.New(apperror.ErrBadRequest, "el comprobante ya fue procesado", "RECEIPT_ALREADY_PROCESSED")
	}

	var pid pgtype.UUID
	if err := pid.Scan(paymentID); err != nil {
		return apperror.ErrBadRequest
	}
	pay, err := q.GetPaymentByID(ctx, pid)
	if err != nil {
		return apperror.New(apperror.ErrNotFound, "pago no encontrado", "PAYMENT_NOT_FOUND")
	}
	st := string(pay.Status)
	if st != "pending" && st != "overdue" && st != "rejected" {
		return apperror.New(apperror.ErrPaymentNotPending, "el pago no admite comprobante en su estado actual", "PAYMENT_INVALID_STATE")
	}
	// Si el entrante ya está identificado a un alumno, el pago debe ser de él.
	if rec.StudentID.Valid && uuidToString(rec.StudentID) != uuidToString(pay.StudentID) {
		return apperror.New(apperror.ErrBadRequest, "el pago pertenece a otro alumno", "STUDENT_MISMATCH")
	}

	// Copiar el adjunto de la bandeja al comprobante del pago.
	data, err := s.storage.Read(ctx, rec.AttachmentUrl)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "no se pudo leer el adjunto", "STORAGE_READ_ERROR")
	}
	ext := filepath.Ext(rec.AttachmentFilename)
	if ext == "" {
		ext = filepath.Ext(rec.AttachmentUrl)
	}
	url, err := s.storage.Save(ctx, "receipts", paymentID+ext, data)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "no se pudo guardar el comprobante", "STORAGE_ERROR")
	}
	// Borrar comprobante anterior del pago si cambió el nombre (evita huérfanos).
	if pay.ReceiptUrl.Valid && pay.ReceiptUrl.String != "" && pay.ReceiptUrl.String != url {
		if err := s.storage.Delete(ctx, pay.ReceiptUrl.String); err != nil {
			log.Printf("warning: no se pudo borrar comprobante anterior (pago %s): %v", paymentID, err)
		}
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return apperror.ErrInternal
	}
	defer tx.Rollback(ctx)
	qtx := dbsqlc.New(tx)

	rows, err := qtx.SubmitReceipt(ctx, dbsqlc.SubmitReceiptParams{
		ID:         pid,
		ReceiptUrl: pgtype.Text{String: url, Valid: true},
	})
	if err != nil {
		return apperror.ErrInternal
	}
	if rows == 0 {
		return apperror.New(apperror.ErrPaymentNotPending, "el pago no admite comprobante en su estado actual", "PAYMENT_INVALID_STATE")
	}

	// Atajo "vincular y aprobar": el admin da el pago por aprobado en el acto.
	if approve {
		var aid pgtype.UUID
		if err := aid.Scan(adminID); err != nil {
			return apperror.ErrBadRequest
		}
		pm, err := paymentMethodText(method)
		if err != nil {
			return err
		}
		if _, err := qtx.ApprovePayment(ctx, dbsqlc.ApprovePaymentParams{
			ID:            pid,
			ReviewedBy:    aid,
			PaymentMethod: pm,
		}); err != nil {
			return apperror.New(apperror.ErrInternal, "error al aprobar el pago", "APPROVE_ERROR")
		}
	}

	if err := qtx.SetInboundReceiptLinked(ctx, dbsqlc.SetInboundReceiptLinkedParams{
		ID:              rid,
		LinkedPaymentID: pid,
		StudentID:       pay.StudentID,
	}); err != nil {
		return apperror.ErrInternal
	}
	return tx.Commit(ctx)
}

// Discard marca un entrante como descartado (spam, ilegible, duplicado).
func (s *InboundReceiptService) Discard(ctx context.Context, receiptID string) error {
	q := dbsqlc.New(s.pool)
	var rid pgtype.UUID
	if err := rid.Scan(receiptID); err != nil {
		return apperror.ErrBadRequest
	}
	rec, err := q.GetInboundReceiptByID(ctx, rid)
	if err != nil {
		return apperror.New(apperror.ErrNotFound, "comprobante no encontrado", "RECEIPT_NOT_FOUND")
	}
	if rec.Status == "vinculado" {
		return apperror.New(apperror.ErrBadRequest, "el comprobante ya fue vinculado a un pago", "RECEIPT_ALREADY_LINKED")
	}
	return q.SetInboundReceiptDiscarded(ctx, rid)
}

// uuidOrEmpty — pgtype.UUID → string, o "" si es NULL.
func uuidOrEmpty(id pgtype.UUID) string {
	if !id.Valid {
		return ""
	}
	return uuidToString(id)
}

// numericOrEmpty — pgtype.Numeric → string exacto, o "" si es NULL.
func numericOrEmpty(n pgtype.Numeric) string {
	if !n.Valid {
		return ""
	}
	return numericToString(n)
}

// numericsEqual compara dos montos con tolerancia de centavo.
func numericsEqual(a, b pgtype.Numeric) bool {
	fa, err := a.Float64Value()
	if err != nil || !fa.Valid {
		return false
	}
	fb, err := b.Float64Value()
	if err != nil || !fb.Valid {
		return false
	}
	return math.Abs(fa.Float64-fb.Float64) < 0.01
}

// paymentLabel — etiqueta legible de una cuota/cargo para la sugerencia.
func paymentLabel(courseName string, month pgtype.Int4, year int32) string {
	if month.Valid {
		return fmt.Sprintf("Cuota %02d/%d - %s", month.Int32, year, courseName)
	}
	return fmt.Sprintf("Cargo %d - %s", year, courseName)
}
