package services

import (
	"context"
	"errors"
	"math"

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

	// Promedio automático: se calcula de las notas del año (no se carga a mano).
	// Ante error de base, abortar la emisión: mejor no emitir que emitir con un
	// promedio mal calculado en un documento oficial.
	avgGrade, err := s.computeAverage(ctx, q, studentID, courseID, int32(req.Year))
	if err != nil {
		return nil, err
	}

	id, err := q.InsertCertificate(ctx, dbsqlc.InsertCertificateParams{
		StudentID:       studentID,
		CourseID:        courseID,
		Year:            int32(req.Year),
		AvgGrade:        float64PtrToNumeric(avgGrade),
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

// computeAverage calcula el promedio del certificado con la convención de la
// planilla (gradeCalc): nota de término = promedio de R/L/S/W (el recuperatorio
// del término lo reemplaza), TOTAL = promedio de las notas de término, todo
// redondeado a entero (0-10). Se devuelve como porcentaje (x10) para el
// certificado. (nil, nil) si el alumno genuinamente no tiene notas ese año;
// (nil, error) si falla la consulta — para no confundir "sin notas" con "falló".
func (s *CertificateService) computeAverage(ctx context.Context, q *dbsqlc.Queries, studentID, courseID pgtype.UUID, year int32) (*float64, error) {
	grades, err := q.GetGradesForCertificate(ctx, dbsqlc.GetGradesForCertificateParams{
		StudentID: studentID, CourseID: courseID, Year: year,
	})
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al calcular el promedio", "AVG_ERROR")
	}
	makeups, err := q.GetMakeupsForCertificate(ctx, dbsqlc.GetMakeupsForCertificateParams{
		StudentID: studentID, CourseID: courseID, Year: year,
	})
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al calcular el promedio", "AVG_ERROR")
	}

	makeupByTerm := make(map[int32]float64)
	for _, m := range makeups {
		if v, ok := numericToFloat(m.Score); ok {
			makeupByTerm[m.Term] = v
		}
	}
	gradesByTerm := make(map[int32]dbsqlc.GetGradesForCertificateRow)
	for _, g := range grades {
		gradesByTerm[g.Term] = g
	}

	var termGrades []float64
	for _, term := range []int32{1, 2} {
		if mv, ok := makeupByTerm[term]; ok {
			termGrades = append(termGrades, math.Round(mv)) // el recuperatorio reemplaza el término
			continue
		}
		g, ok := gradesByTerm[term]
		if !ok {
			continue
		}
		var sum float64
		var n int
		for _, sk := range []pgtype.Numeric{g.Reading, g.Listening, g.Speaking, g.Writing} {
			if v, ok := numericToFloat(sk); ok {
				sum += v
				n++
			}
		}
		if n > 0 {
			termGrades = append(termGrades, math.Round(sum/float64(n)))
		}
	}

	if len(termGrades) == 0 {
		return nil, nil // sin notas cargadas: certificado sin promedio (caso legítimo)
	}
	var total float64
	for _, tg := range termGrades {
		total += tg
	}
	pct := math.Round(total/float64(len(termGrades))) * 10 // TOTAL (0-10) -> % del certificado
	return &pct, nil
}

func numericToFloat(n pgtype.Numeric) (float64, bool) {
	if !n.Valid {
		return 0, false
	}
	f, err := n.Float64Value()
	if err != nil || !f.Valid {
		return 0, false
	}
	return f.Float64, true
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

// Delete elimina un certificado emitido (borrado FÍSICO). Pensado para los
// emitidos por error; la UI confirma con una advertencia antes de llamar.
func (s *CertificateService) Delete(ctx context.Context, id string) error {
	var cid pgtype.UUID
	if err := cid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}
	n, err := dbsqlc.New(s.pool).DeleteCertificate(ctx, cid)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al eliminar el certificado", "DELETE_ERROR")
	}
	if n == 0 {
		return apperror.ErrNotFound
	}
	return nil
}
