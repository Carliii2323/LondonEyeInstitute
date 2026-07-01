package services

import (
	"context"
	"errors"
	"time"

	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type EnrollmentService struct {
	pool *pgxpool.Pool
}

func NewEnrollmentService(pool *pgxpool.Pool) *EnrollmentService {
	return &EnrollmentService{pool: pool}
}

func (s *EnrollmentService) List(ctx context.Context, studentID, courseID, status string) ([]dto.EnrollmentListItem, error) {
	q := dbsqlc.New(s.pool)

	rows, err := q.ListEnrollments(ctx, dbsqlc.ListEnrollmentsParams{
		Column1: studentID,
		Column2: courseID,
		Column3: status,
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.EnrollmentListItem, len(rows))
	for i, r := range rows {
		items[i] = dto.EnrollmentListItem{
			ID:          uuidToString(r.ID),
			EnrolledAt:  r.EnrolledAt.Time.Format("2006-01-02T15:04:05Z"),
			Status:      string(r.Status),
			StudentID:   uuidToString(r.StudentID),
			FirstName:   r.FirstName,
			LastName:    r.LastName,
			Email:       r.Email,
			DNI:         r.Dni,
			CourseID:    uuidToString(r.CourseID),
			CourseName:  r.CourseName,
			CourseLevel: string(r.CourseLevel),
		}
	}

	return items, nil
}

func (s *EnrollmentService) Enroll(ctx context.Context, req dto.EnrollRequest) (*dto.EnrollmentResponse, error) {
	var studentID, courseID pgtype.UUID
	if err := studentID.Scan(req.StudentID); err != nil {
		return nil, apperror.New(apperror.ErrBadRequest, "student_id inválido", "INVALID_STUDENT_ID")
	}
	if err := courseID.Scan(req.CourseID); err != nil {
		return nil, apperror.New(apperror.ErrBadRequest, "course_id inválido", "INVALID_COURSE_ID")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error interno", "TX_ERROR")
	}
	defer tx.Rollback(ctx)

	q := dbsqlc.New(tx)

	// 1. Lockear curso (FOR UPDATE — previene race condition de cupo)
	course, err := q.LockCourse(ctx, courseID)
	if err != nil {
		return nil, apperror.New(apperror.ErrNotFound, "curso no encontrado", "COURSE_NOT_FOUND")
	}

	// 2. Verificar que no esté ya inscripto — distinguir ErrNoRows de error real
	_, err = q.GetActiveEnrollment(ctx, dbsqlc.GetActiveEnrollmentParams{
		StudentID: studentID,
		CourseID:  courseID,
	})
	if err == nil {
		return nil, apperror.New(apperror.ErrConflict, "el estudiante ya está inscripto en este curso", "ALREADY_ENROLLED")
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, apperror.New(apperror.ErrInternal, "error al verificar inscripción", "DB_ERROR")
	}

	// 3. Verificar cupo
	enrolled, err := q.GetEnrolledCount(ctx, courseID)
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al verificar cupo", "ENROLL_CHECK_ERROR")
	}
	if enrolled >= int64(course.Capacity) {
		return nil, apperror.New(apperror.ErrCourseFull, "el curso no tiene cupo disponible", "COURSE_FULL")
	}

	// 4. Insertar inscripción
	enrollment, err := q.InsertEnrollment(ctx, dbsqlc.InsertEnrollmentParams{
		StudentID: studentID,
		CourseID:  courseID,
	})
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al inscribir al estudiante", "ENROLL_ERROR")
	}

	// 5. Leer configuración
	settings, err := q.GetSettings(ctx)
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al leer configuración", "SETTINGS_ERROR")
	}

	// 6. Generar cuota si el mes no está en no_payment_months
	now := time.Now()
	paymentGenerated := false

	if !isNoPaymentMonth(int(now.Month()), settings.NoPaymentMonths) {
		dueDate := buildDueDate(now.Year(), now.Month(), int(settings.MonthlyDueDay))

		err = q.InsertMonthlyPayment(ctx, dbsqlc.InsertMonthlyPaymentParams{
			StudentID: studentID,
			CourseID:  courseID,
			Month:     pgtype.Int4{Int32: int32(now.Month()), Valid: true},
			Year:      int32(now.Year()),
			Amount:    course.PriceMonthly,
			DueDate:   pgtype.Date{Time: dueDate, Valid: true},
		})
		if err != nil {
			return nil, apperror.New(apperror.ErrInternal, "error al generar la cuota", "PAYMENT_ERROR")
		}
		paymentGenerated = true
	}

	// 7. Recalcular status del curso
	newEnrolled := enrolled + 1
	newStatus := dbsqlc.CourseStatusActivo
	if newEnrolled >= int64(course.Capacity) {
		newStatus = dbsqlc.CourseStatusCupoCompleto
	}
	if err := q.UpdateCourseStatus(ctx, dbsqlc.UpdateCourseStatusParams{
		ID:     courseID,
		Status: newStatus,
	}); err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al actualizar estado del curso", "COURSE_STATUS_ERROR")
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error interno", "TX_COMMIT_ERROR")
	}

	return &dto.EnrollmentResponse{
		ID:               uuidToString(enrollment.ID),
		StudentID:        uuidToString(enrollment.StudentID),
		CourseID:         uuidToString(enrollment.CourseID),
		EnrolledAt:       enrollment.EnrolledAt.Time.Format("2006-01-02T15:04:05Z"),
		Status:           string(enrollment.Status),
		PaymentGenerated: paymentGenerated,
	}, nil
}

func (s *EnrollmentService) Drop(ctx context.Context, enrollmentID string) error {
	var eid pgtype.UUID
	if err := eid.Scan(enrollmentID); err != nil {
		return apperror.ErrBadRequest
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error interno", "TX_ERROR")
	}
	defer tx.Rollback(ctx)

	q := dbsqlc.New(tx)

	// 1. Obtener course_id SIN modificar nada (mismo orden de locks que Enroll)
	courseID, err := q.GetEnrollmentCourseID(ctx, eid)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperror.New(apperror.ErrNotFound, "inscripción no encontrada o ya dada de baja", "ENROLLMENT_NOT_FOUND")
		}
		return apperror.New(apperror.ErrInternal, "error al obtener inscripción", "DB_ERROR")
	}

	// 2. Lockear curso primero (mismo orden que Enroll: curso → enrollments)
	course, err := q.LockCourse(ctx, courseID)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al lockear curso", "COURSE_LOCK_ERROR")
	}

	// 3. Dar de baja la inscripción
	if err := q.DropEnrollment(ctx, eid); err != nil {
		return apperror.New(apperror.ErrInternal, "error al dar de baja", "DROP_ERROR")
	}

	// 4. Recalcular status del curso
	count, err := q.GetEnrolledCount(ctx, courseID)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al contar inscripciones", "COUNT_ERROR")
	}

	newStatus := dbsqlc.CourseStatusActivo
	if count >= int64(course.Capacity) {
		newStatus = dbsqlc.CourseStatusCupoCompleto
	}
	if err := q.UpdateCourseStatus(ctx, dbsqlc.UpdateCourseStatusParams{
		ID:     courseID,
		Status: newStatus,
	}); err != nil {
		return apperror.New(apperror.ErrInternal, "error al actualizar estado del curso", "COURSE_STATUS_ERROR")
	}

	return tx.Commit(ctx)
}

// ── helpers privados ──────────────────────────────────────────────

// buildDueDate capa el día al último del mes para evitar fechas inválidas
// (ej: monthly_due_day=31 en febrero genera marzo, no febrero).
// El mismo helper se reutiliza en el cron mensual de Sprint 3.
func buildDueDate(year int, month time.Month, dueDay int) time.Time {
	lastDay := time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
	if dueDay > lastDay {
		dueDay = lastDay
	}
	return time.Date(year, month, dueDay, 0, 0, 0, 0, time.UTC)
}

func isNoPaymentMonth(month int, noPaymentMonths []int32) bool {
	for _, m := range noPaymentMonths {
		if int(m) == month {
			return true
		}
	}
	return false
}
