package services

import (
	"context"
	"errors"

	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NotEligibleError lleva el detalle de por qué un alumno no puede recibir
// certificado (cuotas impagas), para que el handler devuelva el breakdown.
type NotEligibleError struct {
	UnpaidCount int            `json:"unpaid_count"`
	ByStatus    map[string]int `json:"by_status"`
}

func (e *NotEligibleError) Error() string { return "no elegible para certificado" }

type CertificateService struct {
	pool *pgxpool.Pool
}

func NewCertificateService(pool *pgxpool.Pool) *CertificateService {
	return &CertificateService{pool: pool}
}

func (s *CertificateService) Issue(ctx context.Context, req dto.IssueCertificateRequest, adminID string) (*dto.CertificateDetail, error) {
	q := dbsqlc.New(s.pool)

	var studentID, courseID pgtype.UUID
	if err := studentID.Scan(req.StudentID); err != nil {
		return nil, apperror.New(apperror.ErrBadRequest, "student_id inválido", "INVALID_STUDENT_ID")
	}
	if err := courseID.Scan(req.CourseID); err != nil {
		return nil, apperror.New(apperror.ErrBadRequest, "course_id inválido", "INVALID_COURSE_ID")
	}

	// El alumno debe haber cursado (inscripción activa o dada de baja)
	if _, err := q.GetAnyEnrollment(ctx, dbsqlc.GetAnyEnrollmentParams{
		StudentID: studentID,
		CourseID:  courseID,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.New(apperror.ErrBadRequest, "el estudiante no tiene inscripción en este curso", "NOT_ENROLLED")
		}
		return nil, apperror.ErrInternal
	}

	// Elegibilidad: todas las cuotas mensuales existentes del año deben estar approved
	unpaid, err := q.GetUnpaidMonthlyByStatus(ctx, dbsqlc.GetUnpaidMonthlyByStatusParams{
		StudentID: studentID,
		CourseID:  courseID,
		Year:      int32(req.Year),
	})
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al verificar elegibilidad", "ELIGIBILITY_ERROR")
	}
	if len(unpaid) > 0 {
		byStatus := make(map[string]int, len(unpaid))
		total := 0
		for _, u := range unpaid {
			byStatus[string(u.Status)] = int(u.Count)
			total += int(u.Count)
		}
		return nil, &NotEligibleError{UnpaidCount: total, ByStatus: byStatus}
	}

	id, err := q.InsertCertificate(ctx, dbsqlc.InsertCertificateParams{
		StudentID:       studentID,
		CourseID:        courseID,
		Year:            int32(req.Year),
		AvgGrade:        float64PtrToNumeric(req.AvgGrade),
		AttendancePct:   float64PtrToNumeric(req.AttendancePct),
		PresentialHours: intPtrToInt4(req.PresentialHours),
	})
	if err != nil {
		if isUniqueViolation(err) {
			return nil, apperror.New(apperror.ErrConflict, "ya existe un certificado para este alumno, curso y año", "ALREADY_ISSUED")
		}
		return nil, apperror.New(apperror.ErrInternal, "error al emitir el certificado", "ISSUE_ERROR")
	}

	return s.GetByID(ctx, uuidToString(id), adminID, "admin")
}

func (s *CertificateService) List(ctx context.Context) ([]dto.CertificateItem, error) {
	q := dbsqlc.New(s.pool)

	rows, err := q.ListCertificates(ctx)
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.CertificateItem, len(rows))
	for i, r := range rows {
		items[i] = dto.CertificateItem{
			ID:              uuidToString(r.ID),
			StudentID:       uuidToString(r.StudentID),
			FirstName:       r.FirstName,
			LastName:        r.LastName,
			DNI:             r.Dni,
			CourseID:        uuidToString(r.CourseID),
			CourseName:      r.CourseName,
			Year:            r.Year,
			IssuedAt:        r.IssuedAt.Time.Format("2006-01-02"),
			AvgGrade:        numericToFloat64Ptr(r.AvgGrade),
			AttendancePct:   numericToFloat64Ptr(r.AttendancePct),
			PresentialHours: int4ToIntPtr(r.PresentialHours),
			Status:          string(r.Status),
		}
	}
	return items, nil
}

func (s *CertificateService) ListByStudent(ctx context.Context, studentID string) ([]dto.StudentCertificateItem, error) {
	q := dbsqlc.New(s.pool)

	var sid pgtype.UUID
	if err := sid.Scan(studentID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	rows, err := q.ListCertificatesByStudent(ctx, sid)
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.StudentCertificateItem, len(rows))
	for i, r := range rows {
		items[i] = dto.StudentCertificateItem{
			ID:              uuidToString(r.ID),
			CourseID:        uuidToString(r.CourseID),
			CourseName:      r.CourseName,
			Year:            r.Year,
			IssuedAt:        r.IssuedAt.Time.Format("2006-01-02"),
			AvgGrade:        numericToFloat64Ptr(r.AvgGrade),
			AttendancePct:   numericToFloat64Ptr(r.AttendancePct),
			PresentialHours: int4ToIntPtr(r.PresentialHours),
			Status:          string(r.Status),
		}
	}
	return items, nil
}

func (s *CertificateService) GetByID(ctx context.Context, id, requesterID, role string) (*dto.CertificateDetail, error) {
	q := dbsqlc.New(s.pool)

	var cid pgtype.UUID
	if err := cid.Scan(id); err != nil {
		return nil, apperror.ErrBadRequest
	}

	r, err := q.GetCertificateByID(ctx, cid)
	if err != nil {
		return nil, apperror.ErrNotFound
	}

	// El alumno solo puede ver SUS certificados
	if role == "student" {
		if err := ensureOwnership(r.StudentID, requesterID); err != nil {
			return nil, err
		}
	}

	return &dto.CertificateDetail{
		ID:              uuidToString(r.ID),
		StudentID:       uuidToString(r.StudentID),
		FirstName:       r.FirstName,
		LastName:        r.LastName,
		DNI:             r.Dni,
		CourseID:        uuidToString(r.CourseID),
		CourseName:      r.CourseName,
		CourseLevel:     string(r.CourseLevel),
		Year:            r.Year,
		IssuedAt:        r.IssuedAt.Time.Format("2006-01-02"),
		AvgGrade:        numericToFloat64Ptr(r.AvgGrade),
		AttendancePct:   numericToFloat64Ptr(r.AttendancePct),
		PresentialHours: int4ToIntPtr(r.PresentialHours),
		Status:          string(r.Status),
	}, nil
}
