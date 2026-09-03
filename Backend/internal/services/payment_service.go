package services

import (
	"context"
	"errors"
	"log"
	"path/filepath"
	"time"

	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"
	"sge-london-eye/internal/storage"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PaymentService struct {
	pool    *pgxpool.Pool
	storage storage.Storage
}

func NewPaymentService(pool *pgxpool.Pool, s storage.Storage) *PaymentService {
	return &PaymentService{pool: pool, storage: s}
}

// paymentSortColumns — columnas por las que la UI puede ordenar (headers
// clickeables). Es una whitelist: cualquier otro valor se descarta y la query
// cae a su orden por defecto (periodo desc).
var paymentSortColumns = map[string]bool{
	"student":  true,
	"course":   true,
	"status":   true,
	"type":     true,
	"due_date": true,
	"amount":   true,
	"period":   true, // cronologico: anio + mes
}

// normalizePaymentSort valida el pedido de orden de la UI.
func normalizePaymentSort(sortBy, orderDir string) (string, string) {
	if !paymentSortColumns[sortBy] {
		return "", "" // sin orden explicito -> default de la query
	}
	if orderDir != "asc" && orderDir != "desc" {
		orderDir = "asc"
	}
	return sortBy, orderDir
}

func (s *PaymentService) List(ctx context.Context, studentID, courseID, status, paymentType, search, sortBy, orderDir string, month, year, page, pageSize int) (*dto.PaginatedResponse[dto.PaymentListItem], error) {
	q := dbsqlc.New(s.pool)

	sortBy, orderDir = normalizePaymentSort(sortBy, orderDir)

	rows, err := q.ListPayments(ctx, dbsqlc.ListPaymentsParams{
		StudentID:  studentID,
		CourseID:   courseID,
		Status:     status,
		Type:       paymentType,
		Month:      int32(month),
		Year:       int32(year),
		Search:     search,
		SortBy:     sortBy,
		OrderDir:   orderDir,
		PageLimit:  int32(pageSize),
		PageOffset: int32((page - 1) * pageSize),
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	total, err := q.CountPayments(ctx, dbsqlc.CountPaymentsParams{
		Column1: studentID,
		Column2: courseID,
		Column3: status,
		Column4: paymentType,
		Column5: int32(month),
		Column6: int32(year),
		Column7: search,
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.PaymentListItem, len(rows))
	for i, r := range rows {
		amount := numericToString(r.Amount)
		lateFee := numericToString(r.LateFeeApplied)
		items[i] = dto.PaymentListItem{
			ID:             uuidToString(r.ID),
			StudentID:      uuidToString(r.StudentID),
			FirstName:      r.FirstName,
			LastName:       r.LastName,
			DNI:            r.Dni,
			CourseID:       uuidToString(r.CourseID),
			CourseName:     r.CourseName,
			Type:           string(r.Type),
			Month:          int4ToIntPtr(r.Month),
			Year:           r.Year,
			Amount:         amount,
			LateFeeApplied: lateFee,
			Total:          addMoney(amount, lateFee),
			DueDate:        r.DueDate.Time.Format("2006-01-02"),
			Status:         string(r.Status),
			PaymentMethod:  r.PaymentMethod.String,
			ReceiptURL:     r.ReceiptUrl.String,
			CreatedAt:      r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		}
	}

	return &dto.PaginatedResponse[dto.PaymentListItem]{
		Data:     items,
		Total:    int(total),
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// ListReviewed devuelve el historial de revisiones (pagos con reviewed_at),
// filtrable por mes/año de la revisión. year/month = 0 → sin filtro.
func (s *PaymentService) ListReviewed(ctx context.Context, year, month int) ([]dto.ReviewedPaymentItem, error) {
	q := dbsqlc.New(s.pool)

	rows, err := q.ListReviewedPayments(ctx, dbsqlc.ListReviewedPaymentsParams{
		Column1: int32(year),
		Column2: int32(month),
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.ReviewedPaymentItem, len(rows))
	for i, r := range rows {
		amount := numericToString(r.Amount)
		lateFee := numericToString(r.LateFeeApplied)
		items[i] = dto.ReviewedPaymentItem{
			ID:              uuidToString(r.ID),
			StudentID:       uuidToString(r.StudentID),
			StudentName:     r.FirstName + " " + r.LastName,
			DNI:             r.Dni,
			CourseName:      r.CourseName,
			Type:            string(r.Type),
			Month:           int4ToIntPtr(r.Month),
			Year:            r.Year,
			Amount:          amount,
			LateFeeApplied:  lateFee,
			Total:           addMoney(amount, lateFee),
			Status:          string(r.Status),
			PaymentMethod:   r.PaymentMethod.String,
			ReviewedAt:      r.ReviewedAt.Time.Format("2006-01-02T15:04:05Z"),
			RejectionReason: r.RejectionReason.String,
		}
	}
	return items, nil
}

func (s *PaymentService) ListPending(ctx context.Context) ([]dto.PaymentListItem, error) {
	q := dbsqlc.New(s.pool)

	rows, err := q.ListPendingReceipts(ctx)
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.PaymentListItem, len(rows))
	for i, r := range rows {
		amount := numericToString(r.Amount)
		lateFee := numericToString(r.LateFeeApplied)
		items[i] = dto.PaymentListItem{
			ID:             uuidToString(r.ID),
			StudentID:      uuidToString(r.StudentID),
			FirstName:      r.FirstName,
			LastName:       r.LastName,
			DNI:            r.Dni,
			CourseID:       uuidToString(r.CourseID),
			CourseName:     r.CourseName,
			Type:           string(r.Type),
			Month:          int4ToIntPtr(r.Month),
			Year:           r.Year,
			Amount:         amount,
			LateFeeApplied: lateFee,
			Total:          addMoney(amount, lateFee),
			DueDate:        r.DueDate.Time.Format("2006-01-02"),
			Status:         string(r.Status),
			ReceiptURL:     r.ReceiptUrl.String,
			CreatedAt:      r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		}
		if r.ReceiptUploadedAt.Valid {
			items[i].ReceiptUploadedAt = r.ReceiptUploadedAt.Time.Format("2006-01-02T15:04:05Z")
		}
	}

	return items, nil
}

func (s *PaymentService) GetByStudent(ctx context.Context, studentID string) ([]dto.StudentPaymentItem, error) {
	q := dbsqlc.New(s.pool)

	var sid pgtype.UUID
	if err := sid.Scan(studentID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	rows, err := q.ListPaymentsByStudent(ctx, sid)
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.StudentPaymentItem, len(rows))
	for i, r := range rows {
		amount := numericToString(r.Amount)
		lateFee := numericToString(r.LateFeeApplied)
		items[i] = dto.StudentPaymentItem{
			ID:              uuidToString(r.ID),
			CourseID:        uuidToString(r.CourseID),
			CourseName:      r.CourseName,
			Type:            string(r.Type),
			Month:           int4ToIntPtr(r.Month),
			Year:            r.Year,
			Amount:          amount,
			LateFeeApplied:  lateFee,
			Total:           addMoney(amount, lateFee),
			DueDate:         r.DueDate.Time.Format("2006-01-02"),
			Status:          string(r.Status),
			ReceiptURL:      r.ReceiptUrl.String,
			RejectionReason: r.RejectionReason.String,
			CreatedAt:       r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		}
	}

	return items, nil
}

func (s *PaymentService) GetByID(ctx context.Context, id string) (*dto.PaymentDetail, error) {
	q := dbsqlc.New(s.pool)

	var pid pgtype.UUID
	if err := pid.Scan(id); err != nil {
		return nil, apperror.ErrBadRequest
	}

	r, err := q.GetPaymentDetail(ctx, pid)
	if err != nil {
		return nil, apperror.ErrNotFound
	}

	amount := numericToString(r.Amount)
	lateFee := numericToString(r.LateFeeApplied)

	detail := &dto.PaymentDetail{
		ID:              uuidToString(r.ID),
		StudentID:       uuidToString(r.StudentID),
		FirstName:       r.FirstName,
		LastName:        r.LastName,
		DNI:             r.Dni,
		CourseID:        uuidToString(r.CourseID),
		CourseName:      r.CourseName,
		Type:            string(r.Type),
		Month:           int4ToIntPtr(r.Month),
		Year:            r.Year,
		Amount:          amount,
		LateFeeApplied:  lateFee,
		Total:           addMoney(amount, lateFee),
		DueDate:         r.DueDate.Time.Format("2006-01-02"),
		Status:          string(r.Status),
		PaymentMethod:   r.PaymentMethod.String,
		Observation:     r.Observation.String,
		ReceiptURL:      r.ReceiptUrl.String,
		RejectionReason: r.RejectionReason.String,
		CreatedAt:       r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:       r.UpdatedAt.Time.Format("2006-01-02T15:04:05Z"),
	}
	if r.ReceiptUploadedAt.Valid {
		detail.ReceiptUploadedAt = r.ReceiptUploadedAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if r.ReviewedAt.Valid {
		detail.ReviewedAt = r.ReviewedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	return detail, nil
}

// GetReceipt devuelve el contenido del comprobante de un pago. Si requireOwnerID
// no está vacío (caso alumno), valida que el pago le pertenezca; vacío = admin
// (la autorización por rol la resuelve el middleware de la ruta).
func (s *PaymentService) GetReceipt(ctx context.Context, id, requireOwnerID string) (data []byte, filename string, err error) {
	q := dbsqlc.New(s.pool)

	var pid pgtype.UUID
	if err := pid.Scan(id); err != nil {
		return nil, "", apperror.ErrBadRequest
	}

	payment, err := q.GetPaymentByID(ctx, pid)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", apperror.New(apperror.ErrNotFound, "pago no encontrado", "PAYMENT_NOT_FOUND")
		}
		return nil, "", apperror.ErrInternal
	}

	if requireOwnerID != "" {
		if err := ensureOwnership(payment.StudentID, requireOwnerID); err != nil {
			return nil, "", err
		}
	}

	if !payment.ReceiptUrl.Valid || payment.ReceiptUrl.String == "" {
		return nil, "", apperror.New(apperror.ErrNotFound, "el pago no tiene comprobante", "RECEIPT_NOT_FOUND")
	}

	data, err = s.storage.Read(ctx, payment.ReceiptUrl.String)
	if err != nil {
		return nil, "", apperror.New(apperror.ErrNotFound, "comprobante no encontrado", "RECEIPT_NOT_FOUND")
	}

	return data, filepath.Base(payment.ReceiptUrl.String), nil
}

func (s *PaymentService) CreateAdditionalCharge(ctx context.Context, req dto.CreateAdditionalChargeRequest, adminID string) (string, error) {
	q := dbsqlc.New(s.pool)

	var studentID, courseID pgtype.UUID
	if err := studentID.Scan(req.StudentID); err != nil {
		return "", apperror.New(apperror.ErrBadRequest, "student_id inválido", "INVALID_STUDENT_ID")
	}
	if err := courseID.Scan(req.CourseID); err != nil {
		return "", apperror.New(apperror.ErrBadRequest, "course_id inválido", "INVALID_COURSE_ID")
	}

	if !isPositiveMoney(req.Amount) {
		return "", apperror.New(apperror.ErrBadRequest, "el monto debe ser mayor a 0", "INVALID_AMOUNT")
	}
	amount, err := parseNumeric(req.Amount)
	if err != nil {
		return "", apperror.New(apperror.ErrBadRequest, "monto inválido", "INVALID_AMOUNT")
	}

	dueDate := parseDate(req.DueDate)
	if !dueDate.Valid {
		return "", apperror.New(apperror.ErrBadRequest, "fecha inválida (formato: YYYY-MM-DD)", "INVALID_DATE")
	}

	// Regla (c): debe existir alguna inscripción (activa o dada de baja) del
	// alumno en el curso. Permite cobrar deudas a bajas, bloquea cobrar a
	// alguien que nunca estuvo en el curso.
	if _, err := q.GetAnyEnrollment(ctx, dbsqlc.GetAnyEnrollmentParams{
		StudentID: studentID,
		CourseID:  courseID,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", apperror.New(apperror.ErrBadRequest,
				"el estudiante no tiene inscripción en este curso", "NOT_ENROLLED")
		}
		return "", apperror.New(apperror.ErrInternal, "error al verificar inscripción", "DB_ERROR")
	}

	id, err := q.InsertAdditionalCharge(ctx, dbsqlc.InsertAdditionalChargeParams{
		StudentID:   studentID,
		CourseID:    courseID,
		Year:        int32(dueDate.Time.Year()),
		Amount:      amount,
		DueDate:     dueDate,
		Observation: pgtype.Text{String: req.Observation, Valid: true},
	})
	if err != nil {
		return "", apperror.New(apperror.ErrInternal, "error al crear el cargo", "CREATE_CHARGE_ERROR")
	}

	// Pagado en el momento → se aprueba de una (queda registrado como pagado).
	if req.Paid {
		pm, err := paymentMethodText(req.PaymentMethod)
		if err != nil {
			return "", err
		}
		var rid pgtype.UUID
		if err := rid.Scan(adminID); err != nil {
			return "", apperror.ErrBadRequest
		}
		if _, err := q.ApprovePayment(ctx, dbsqlc.ApprovePaymentParams{ID: id, ReviewedBy: rid, PaymentMethod: pm}); err != nil {
			return "", apperror.New(apperror.ErrInternal, "error al registrar el pago", "APPROVE_ERROR")
		}
	}

	return uuidToString(id), nil
}

// CreateCourseCharge crea un derecho (inscripción/examen) 'pending' para cada
// inscripción activa del curso. Devuelve la cantidad de cobros creados.
func (s *PaymentService) CreateCourseCharge(ctx context.Context, req dto.CreateCourseChargeRequest) (int, error) {
	q := dbsqlc.New(s.pool)

	var courseID pgtype.UUID
	if err := courseID.Scan(req.CourseID); err != nil {
		return 0, apperror.New(apperror.ErrBadRequest, "course_id inválido", "INVALID_COURSE_ID")
	}
	if req.Type != "derecho_inscripcion" && req.Type != "derecho_examen" {
		return 0, apperror.New(apperror.ErrBadRequest, "tipo de derecho inválido", "INVALID_TYPE")
	}
	if !isPositiveMoney(req.Amount) {
		return 0, apperror.New(apperror.ErrBadRequest, "el monto debe ser mayor a 0", "INVALID_AMOUNT")
	}
	amount, err := parseNumeric(req.Amount)
	if err != nil {
		return 0, apperror.New(apperror.ErrBadRequest, "monto inválido", "INVALID_AMOUNT")
	}
	dueDate := parseDate(req.DueDate)
	if !dueDate.Valid {
		return 0, apperror.New(apperror.ErrBadRequest, "fecha inválida (formato: YYYY-MM-DD)", "INVALID_DATE")
	}

	observation := req.Observation
	if observation == "" {
		if req.Type == "derecho_inscripcion" {
			observation = "Derecho de inscripción"
		} else {
			observation = "Derecho de examen"
		}
	}

	n, err := q.InsertCourseCharge(ctx, dbsqlc.InsertCourseChargeParams{
		CourseID:    courseID,
		ChargeType:  dbsqlc.PaymentType(req.Type),
		Year:        int32(dueDate.Time.Year()),
		Amount:      amount,
		DueDate:     dueDate,
		Observation: pgtype.Text{String: observation, Valid: true},
	})
	if err != nil {
		return 0, apperror.New(apperror.ErrInternal, "error al crear los cobros", "CREATE_CHARGE_ERROR")
	}
	return int(n), nil
}

// paymentMethodText valida el medio de pago opcional y lo arma como pgtype.Text
// (vacío = NULL). Solo se aceptan transferencia / efectivo.
func paymentMethodText(method string) (pgtype.Text, error) {
	if method == "" {
		return pgtype.Text{}, nil
	}
	if method != "transferencia" && method != "efectivo" {
		return pgtype.Text{}, apperror.New(apperror.ErrBadRequest, "medio de pago inválido", "INVALID_METHOD")
	}
	return pgtype.Text{String: method, Valid: true}, nil
}

// CreateAdvancePayments crea N cuotas mensuales consecutivas (desde
// start_month/start_year) ya marcadas como pagadas, usando el precio mensual del
// curso. Idempotente por mes (si la cuota ya existía, la marca pagada).
func (s *PaymentService) CreateAdvancePayments(ctx context.Context, req dto.CreateAdvancePaymentRequest, adminID string) (int, error) {
	q := dbsqlc.New(s.pool)

	var studentID, courseID, rid pgtype.UUID
	if err := studentID.Scan(req.StudentID); err != nil {
		return 0, apperror.New(apperror.ErrBadRequest, "student_id inválido", "INVALID_STUDENT_ID")
	}
	if err := courseID.Scan(req.CourseID); err != nil {
		return 0, apperror.New(apperror.ErrBadRequest, "course_id inválido", "INVALID_COURSE_ID")
	}
	if err := rid.Scan(adminID); err != nil {
		return 0, apperror.ErrBadRequest
	}

	pm, err := paymentMethodText(req.PaymentMethod)
	if err != nil {
		return 0, err
	}

	// Debe existir inscripción (activa o de baja) del alumno en el curso.
	if _, err := q.GetAnyEnrollment(ctx, dbsqlc.GetAnyEnrollmentParams{StudentID: studentID, CourseID: courseID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, apperror.New(apperror.ErrBadRequest, "el estudiante no tiene inscripción en este curso", "NOT_ENROLLED")
		}
		return 0, apperror.ErrInternal
	}

	price, err := q.GetCoursePriceMonthly(ctx, courseID)
	if err != nil {
		return 0, apperror.New(apperror.ErrInternal, "error al leer el precio del curso", "DB_ERROR")
	}

	settings, err := q.GetSettings(ctx)
	if err != nil {
		return 0, apperror.New(apperror.ErrInternal, "error al leer configuración", "SETTINGS_ERROR")
	}

	month, year := req.StartMonth, req.StartYear
	created := 0
	for i := 0; i < req.Months; i++ {
		dueDate := buildDueDate(year, time.Month(month), int(settings.MonthlyDueDay))
		if err := q.UpsertPaidMonthlyPayment(ctx, dbsqlc.UpsertPaidMonthlyPaymentParams{
			StudentID:     studentID,
			CourseID:      courseID,
			Month:         pgtype.Int4{Int32: int32(month), Valid: true},
			Year:          int32(year),
			Amount:        price,
			DueDate:       pgtype.Date{Time: dueDate, Valid: true},
			ReviewedBy:    rid,
			PaymentMethod: pm,
		}); err != nil {
			return 0, apperror.New(apperror.ErrInternal, "error al registrar el pago adelantado", "ADVANCE_ERROR")
		}
		created++
		if month++; month > 12 {
			month = 1
			year++
		}
	}
	return created, nil
}

func (s *PaymentService) Approve(ctx context.Context, id, reviewerID, method string) error {
	q := dbsqlc.New(s.pool)

	pm, err := paymentMethodText(method)
	if err != nil {
		return err
	}

	var pid, rid pgtype.UUID
	if err := pid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}
	if err := rid.Scan(reviewerID); err != nil {
		return apperror.ErrBadRequest
	}

	rows, err := q.ApprovePayment(ctx, dbsqlc.ApprovePaymentParams{ID: pid, ReviewedBy: rid, PaymentMethod: pm})
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al aprobar el pago", "APPROVE_ERROR")
	}
	if rows == 0 {
		return s.explainNoRows(ctx, q, pid, "el pago no está pendiente de aprobación")
	}
	return nil
}

func (s *PaymentService) Reject(ctx context.Context, id, reviewerID, reason string) error {
	q := dbsqlc.New(s.pool)

	var pid, rid pgtype.UUID
	if err := pid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}
	if err := rid.Scan(reviewerID); err != nil {
		return apperror.ErrBadRequest
	}

	rows, err := q.RejectPayment(ctx, dbsqlc.RejectPaymentParams{
		ID:              pid,
		RejectionReason: pgtype.Text{String: reason, Valid: true},
		ReviewedBy:      rid,
	})
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al rechazar el pago", "REJECT_ERROR")
	}
	if rows == 0 {
		return s.explainNoRows(ctx, q, pid, "solo se pueden rechazar comprobantes enviados")
	}
	return nil
}

// Annul — anula un pago (cuota/cargo) creado por error o de un alumno dado de
// baja. No se puede anular un pago aprobado ni uno ya anulado. Conserva el
// registro y deja de contar como deuda / para la elegibilidad de certificados.
func (s *PaymentService) Annul(ctx context.Context, id string) error {
	q := dbsqlc.New(s.pool)

	var pid pgtype.UUID
	if err := pid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}

	rows, err := q.AnnulPayment(ctx, pid)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al anular el pago", "ANNUL_ERROR")
	}
	if rows == 0 {
		return s.explainNoRows(ctx, q, pid, "no se puede anular un pago aprobado o ya anulado")
	}
	return nil
}

// SubmitReceipt — el alumno sube un comprobante a su propio pago.
// Permitido sobre pending / overdue / rejected. Borra el comprobante anterior
// del disco (caso re-subida tras rechazo).
func (s *PaymentService) SubmitReceipt(ctx context.Context, paymentID, studentID string, data []byte, filename string) error {
	q := dbsqlc.New(s.pool)

	var pid pgtype.UUID
	if err := pid.Scan(paymentID); err != nil {
		return apperror.ErrBadRequest
	}

	payment, err := q.GetPaymentByID(ctx, pid)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperror.New(apperror.ErrNotFound, "pago no encontrado", "PAYMENT_NOT_FOUND")
		}
		return apperror.ErrInternal
	}

	// El alumno solo puede operar sobre SUS pagos
	if err := ensureOwnership(payment.StudentID, studentID); err != nil {
		return err
	}

	st := string(payment.Status)
	if st != "pending" && st != "overdue" && st != "rejected" {
		return apperror.New(apperror.ErrPaymentNotPending,
			"no se puede subir comprobante en el estado actual", "PAYMENT_INVALID_STATE")
	}

	// Borrar comprobante anterior (re-subida tras rechazo) — evita archivos huérfanos
	if payment.ReceiptUrl.Valid && payment.ReceiptUrl.String != "" {
		if err := s.storage.Delete(ctx, payment.ReceiptUrl.String); err != nil {
			log.Printf("warning: no se pudo borrar comprobante anterior (pago %s): %v", paymentID, err)
		}
	}

	destName := paymentID + filepath.Ext(filename)
	url, err := s.storage.Save(ctx, "receipts", destName, data)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al guardar el comprobante", "STORAGE_ERROR")
	}

	rows, err := q.SubmitReceipt(ctx, dbsqlc.SubmitReceiptParams{
		ID:         pid,
		ReceiptUrl: pgtype.Text{String: url, Valid: true},
	})
	if err != nil {
		return apperror.ErrInternal
	}
	if rows == 0 {
		// el estado cambió entre el GET y el UPDATE (race)
		return apperror.New(apperror.ErrPaymentNotPending,
			"no se puede subir comprobante en el estado actual", "PAYMENT_INVALID_STATE")
	}
	return nil
}

// ── jobs (cron + trigger manual) ──────────────────────────────────

// GenerateMonthlyInvoices genera la cuota del mes en curso para cada inscripción
// activa, respetando no_payment_months. Idempotente (ON CONFLICT DO NOTHING).
func (s *PaymentService) GenerateMonthlyInvoices(ctx context.Context) (map[string]any, error) {
	q := dbsqlc.New(s.pool)

	settings, err := q.GetSettings(ctx)
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al leer configuración", "SETTINGS_ERROR")
	}

	now := time.Now()
	month := int(now.Month())

	if isNoPaymentMonth(month, settings.NoPaymentMonths) {
		return map[string]any{"invoices_created": 0, "skipped_no_payment_month": true}, nil
	}

	dueDate := buildDueDate(now.Year(), now.Month(), int(settings.MonthlyDueDay))

	n, err := q.GenerateMonthlyInvoices(ctx, dbsqlc.GenerateMonthlyInvoicesParams{
		Column1: int32(month),
		Column2: int32(now.Year()),
		Column3: pgtype.Date{Time: dueDate, Valid: true},
	})
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al generar cuotas", "GENERATE_ERROR")
	}

	return map[string]any{"invoices_created": n, "skipped_no_payment_month": false}, nil
}

// GenerateDerechos genera los derechos del instituto según el mes en curso, para
// los cursos que tengan el precio cargado (inscripción / examen). Solo actúa en
// febrero (inscripción), julio y noviembre (examen); el resto no hace nada.
// Idempotente (ON CONFLICT DO NOTHING sobre el índice parcial de derechos).
func (s *PaymentService) GenerateDerechos(ctx context.Context) (map[string]any, error) {
	q := dbsqlc.New(s.pool)

	settings, err := q.GetSettings(ctx)
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al leer configuración", "SETTINGS_ERROR")
	}

	now := time.Now()
	month := int(now.Month())
	year := int32(now.Year())
	dueDate := pgtype.Date{Time: buildDueDate(now.Year(), now.Month(), int(settings.MonthlyDueDay)), Valid: true}

	switch month {
	case 2: // febrero → derecho de inscripción
		n, err := q.GenerateInscripcionDerechos(ctx, dbsqlc.GenerateInscripcionDerechosParams{
			PeriodMonth: int32(month), Year: year, DueDate: dueDate,
		})
		if err != nil {
			return nil, apperror.New(apperror.ErrInternal, "error al generar derechos de inscripción", "DERECHO_ERROR")
		}
		return map[string]any{"derecho": "inscripcion", "month": month, "created": n}, nil
	case 7, 11: // julio y noviembre → derecho de examen
		n, err := q.GenerateExamenDerechos(ctx, dbsqlc.GenerateExamenDerechosParams{
			PeriodMonth: int32(month), Year: year, DueDate: dueDate,
		})
		if err != nil {
			return nil, apperror.New(apperror.ErrInternal, "error al generar derechos de examen", "DERECHO_ERROR")
		}
		return map[string]any{"derecho": "examen", "month": month, "created": n}, nil
	default:
		return map[string]any{"created": 0, "skipped_not_a_derecho_month": true}, nil
	}
}

// MarkOverduePayments marca como overdue las cuotas/cargos pending vencidos
// (due_date + grace_days < hoy) y aplica el recargo. Idempotente: solo toca pending.
func (s *PaymentService) MarkOverduePayments(ctx context.Context) (map[string]any, error) {
	q := dbsqlc.New(s.pool)

	n, err := q.MarkOverduePayments(ctx)
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al marcar vencidas", "OVERDUE_ERROR")
	}

	return map[string]any{"marked_overdue": n}, nil
}

// explainNoRows distingue "no existe" (404) de "estado inválido" (400)
// cuando un UPDATE condicional afectó 0 filas.
func (s *PaymentService) explainNoRows(ctx context.Context, q *dbsqlc.Queries, pid pgtype.UUID, stateMsg string) error {
	if _, err := q.GetPaymentByID(ctx, pid); errors.Is(err, pgx.ErrNoRows) {
		return apperror.New(apperror.ErrNotFound, "pago no encontrado", "PAYMENT_NOT_FOUND")
	}
	return apperror.New(apperror.ErrPaymentNotPending, stateMsg, "PAYMENT_INVALID_STATE")
}

// IsAutoBillingEnabled indica si el cobro automático está activo. Lo consulta el
// scheduler antes de correr los jobs de cobro (cuotas y derechos). El interruptor
// se maneja desde bash sobre institute_settings:
//
//	make billing-status | make billing-off | make billing-on
//
// El disparo MANUAL de los jobs no pasa por acá: es una acción explícita.
func (s *PaymentService) IsAutoBillingEnabled(ctx context.Context) (bool, error) {
	settings, err := dbsqlc.New(s.pool).GetSettings(ctx)
	if err != nil {
		return false, err
	}
	return settings.AutoBillingEnabled, nil
}
