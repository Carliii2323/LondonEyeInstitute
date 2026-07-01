package services

import (
	"context"
	"time"

	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type GradeService struct {
	pool *pgxpool.Pool
}

func NewGradeService(pool *pgxpool.Pool) *GradeService {
	return &GradeService{pool: pool}
}

func (s *GradeService) GetByCourseAndYear(ctx context.Context, courseID string, year int, requesterID, requesterRole string) (*dto.GradesResponse, error) {
	q := dbsqlc.New(s.pool)

	var cid pgtype.UUID
	if err := cid.Scan(courseID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	if requesterRole == "teacher" {
		if err := verifyCourseOwnership(ctx, q, cid, requesterID); err != nil {
			return nil, err
		}
	}

	gradeRows, err := q.GetGradesByCourseAndYear(ctx, dbsqlc.GetGradesByCourseAndYearParams{
		CourseID: cid,
		Year:     int32(year),
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	makeupRows, err := q.GetMakeupByCourseAndYear(ctx, dbsqlc.GetMakeupByCourseAndYearParams{
		CourseID: cid,
		Year:     int32(year),
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	grades := make([]dto.GradeRowDTO, len(gradeRows))
	for i, r := range gradeRows {
		grades[i] = gradeRowToDTO(r.StudentID, r.FirstName, r.LastName, r.Dni, r.Year, r.Term,
			r.Reading, r.Listening, r.Speaking, r.Writing)
	}

	makeups := make([]dto.MakeupRowDTO, len(makeupRows))
	for i, r := range makeupRows {
		takenAt := ""
		if r.TakenAt.Valid {
			takenAt = r.TakenAt.Time.Format("2006-01-02")
		}
		makeups[i] = dto.MakeupRowDTO{
			StudentID: uuidToString(r.StudentID),
			FirstName: r.FirstName,
			LastName:  r.LastName,
			DNI:       r.Dni,
			Year:      r.Year,
			Term:      r.Term,
			Score:     numericToFloat64(r.Score),
			TakenAt:   takenAt,
		}
	}

	return &dto.GradesResponse{Grades: grades, Makeups: makeups}, nil
}

func (s *GradeService) Save(ctx context.Context, req dto.SaveGradesRequest, requesterID, requesterRole string) error {
	q := dbsqlc.New(s.pool)

	var cid pgtype.UUID
	if err := cid.Scan(req.CourseID); err != nil {
		return apperror.New(apperror.ErrBadRequest, "course_id inválido", "INVALID_COURSE_ID")
	}

	if requesterRole == "teacher" {
		if err := verifyCourseOwnership(ctx, q, cid, requesterID); err != nil {
			return err
		}
		settings, err := q.GetSettings(ctx)
		if err != nil {
			return apperror.New(apperror.ErrInternal, "error al leer configuración", "SETTINGS_ERROR")
		}
		if !isEditableYear(req.Year, int(settings.GradeGraceDaysJanuary)) {
			return apperror.New(apperror.ErrForbidden, "solo se pueden editar notas del año en curso (o del anterior durante la gracia de enero)", "OUTSIDE_EDITABLE_WINDOW")
		}
	}

	for _, g := range req.Grades {
		if err := validateGradeScores(g); err != nil {
			return err
		}
	}

	// Recolectar student_ids únicos (grades + makeups) y validar inscripción
	// activa en UNA sola query (en vez de N round-trips dentro del loop).
	idSet := make(map[string]struct{})
	var requestedIDs []pgtype.UUID
	collect := func(raw string) error {
		var sid pgtype.UUID
		if err := sid.Scan(raw); err != nil {
			return apperror.New(apperror.ErrBadRequest, "student_id inválido", "INVALID_STUDENT_ID")
		}
		key := uuidToString(sid)
		if _, ok := idSet[key]; !ok {
			idSet[key] = struct{}{}
			requestedIDs = append(requestedIDs, sid)
		}
		return nil
	}
	for _, g := range req.Grades {
		if err := collect(g.StudentID); err != nil {
			return err
		}
	}
	for _, m := range req.Makeups {
		if err := collect(m.StudentID); err != nil {
			return err
		}
	}

	if len(requestedIDs) > 0 {
		enrolled, err := q.GetActiveEnrolledStudentIDs(ctx, dbsqlc.GetActiveEnrolledStudentIDsParams{
			CourseID: cid,
			Column2:  requestedIDs,
		})
		if err != nil {
			return apperror.New(apperror.ErrInternal, "error al verificar inscripciones", "DB_ERROR")
		}
		enrolledSet := make(map[string]struct{}, len(enrolled))
		for _, e := range enrolled {
			enrolledSet[uuidToString(e)] = struct{}{}
		}
		for key := range idSet {
			if _, ok := enrolledSet[key]; !ok {
				return apperror.New(apperror.ErrBadRequest,
					"hay estudiantes no inscriptos activamente en este curso", "NOT_ENROLLED")
			}
		}
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error interno", "TX_ERROR")
	}
	defer tx.Rollback(ctx)

	qtx := dbsqlc.New(tx)

	for _, g := range req.Grades {
		var sid pgtype.UUID
		_ = sid.Scan(g.StudentID)

		if err := qtx.UpsertGrade(ctx, dbsqlc.UpsertGradeParams{
			StudentID: sid,
			CourseID:  cid,
			Year:      int32(req.Year),
			Term:      int32(g.Term),
			Reading:   float64PtrToNumeric(g.Reading),
			Listening: float64PtrToNumeric(g.Listening),
			Speaking:  float64PtrToNumeric(g.Speaking),
			Writing:   float64PtrToNumeric(g.Writing),
		}); err != nil {
			return apperror.New(apperror.ErrInternal, "error al guardar notas", "UPSERT_GRADE_ERROR")
		}
	}

	for _, m := range req.Makeups {
		var sid pgtype.UUID
		_ = sid.Scan(m.StudentID)

		if err := qtx.UpsertGradeMakeup(ctx, dbsqlc.UpsertGradeMakeupParams{
			StudentID: sid,
			CourseID:  cid,
			Year:      int32(req.Year),
			Term:      int32(m.Term),
			Score:     float64PtrToNumeric(&m.Score),
			TakenAt:   parseDate(m.TakenAt),
		}); err != nil {
			return apperror.New(apperror.ErrInternal, "error al guardar recuperatorio", "UPSERT_MAKEUP_ERROR")
		}
	}

	return tx.Commit(ctx)
}

func (s *GradeService) GetMyGrades(ctx context.Context, studentID string) (*dto.StudentGradesResponse, error) {
	q := dbsqlc.New(s.pool)

	var sid pgtype.UUID
	if err := sid.Scan(studentID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	enrollmentRows, err := q.ListEnrollments(ctx, dbsqlc.ListEnrollmentsParams{
		Column1: studentID,
		Column2: "",
		Column3: "active",
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	grades := []dto.StudentGradeRowDTO{}
	makeups := []dto.MakeupRowDTO{}

	for _, e := range enrollmentRows {
		gradeRows, err := q.GetGradesByStudentAndCourse(ctx, dbsqlc.GetGradesByStudentAndCourseParams{
			StudentID: sid,
			CourseID:  e.CourseID,
		})
		if err != nil {
			return nil, apperror.ErrInternal
		}
		for _, g := range gradeRows {
			grades = append(grades, dto.StudentGradeRowDTO{
				CourseID:   uuidToString(g.CourseID),
				CourseName: e.CourseName,
				Year:       g.Year,
				Term:       g.Term,
				Reading:    numericToFloat64Ptr(g.Reading),
				Listening:  numericToFloat64Ptr(g.Listening),
				Speaking:   numericToFloat64Ptr(g.Speaking),
				Writing:    numericToFloat64Ptr(g.Writing),
			})
		}
	}

	// Makeups fuera del loop — se llama una sola vez para todos los cursos del alumno
	makeupRows, err := q.GetMakeupByStudent(ctx, sid)
	if err != nil {
		return nil, apperror.ErrInternal
	}
	for _, m := range makeupRows {
		takenAt := ""
		if m.TakenAt.Valid {
			takenAt = m.TakenAt.Time.Format("2006-01-02")
		}
		makeups = append(makeups, dto.MakeupRowDTO{
			StudentID:  uuidToString(m.StudentID),
			CourseName: m.CourseName,
			Year:       m.Year,
			Term:       m.Term,
			Score:      numericToFloat64(m.Score),
			TakenAt:    takenAt,
		})
	}

	return &dto.StudentGradesResponse{Grades: grades, Makeups: makeups}, nil
}

// ── helpers privados ──────────────────────────────────────────────

// isEditableYear permite editar notas del año en curso siempre, y del año
// anterior solo durante los primeros graceDaysJanuary días de enero
// (para cerrar notas pendientes del ciclo que terminó).
func isEditableYear(year, graceDaysJanuary int) bool {
	return isEditableYearAt(time.Now(), year, graceDaysJanuary)
}

// isEditableYearAt — versión testeable con el "now" inyectado.
func isEditableYearAt(now time.Time, year, graceDaysJanuary int) bool {
	if year == now.Year() {
		return true
	}
	if year == now.Year()-1 && now.Month() == time.January && now.Day() <= graceDaysJanuary {
		return true
	}
	return false
}

func validateGradeScores(g dto.UpsertGradeItem) error {
	scores := []*float64{g.Reading, g.Listening, g.Speaking, g.Writing}
	for _, s := range scores {
		if s != nil && (*s < 0 || *s > 10) {
			return apperror.New(apperror.ErrBadRequest, "las notas deben estar entre 0 y 10", "INVALID_SCORE")
		}
	}
	return nil
}

func gradeRowToDTO(sid pgtype.UUID, firstName, lastName, dni string, year, term int32,
	reading, listening, speaking, writing pgtype.Numeric) dto.GradeRowDTO {
	return dto.GradeRowDTO{
		StudentID: uuidToString(sid),
		FirstName: firstName,
		LastName:  lastName,
		DNI:       dni,
		Year:      year,
		Term:      term,
		Reading:   numericToFloat64Ptr(reading),
		Listening: numericToFloat64Ptr(listening),
		Speaking:  numericToFloat64Ptr(speaking),
		Writing:   numericToFloat64Ptr(writing),
	}
}
