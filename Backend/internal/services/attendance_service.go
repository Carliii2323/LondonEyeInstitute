package services

import (
	"context"
	"time"

	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AttendanceService struct {
	pool *pgxpool.Pool
}

func NewAttendanceService(pool *pgxpool.Pool) *AttendanceService {
	return &AttendanceService{pool: pool}
}

func (s *AttendanceService) GetSession(ctx context.Context, courseID, date, requesterID, role string) (*dto.AttendanceSessionResponse, error) {
	q := dbsqlc.New(s.pool)

	var cid pgtype.UUID
	if err := cid.Scan(courseID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	if role == "teacher" {
		if err := verifyCourseOwnership(ctx, q, cid, requesterID); err != nil {
			return nil, err
		}
	}

	parsedDate := parseDate(date)
	if !parsedDate.Valid {
		return nil, apperror.New(apperror.ErrBadRequest, "fecha inválida (formato: YYYY-MM-DD)", "INVALID_DATE")
	}

	session, err := q.GetSessionByCourseAndDate(ctx, dbsqlc.GetSessionByCourseAndDateParams{
		CourseID: cid,
		Date:     parsedDate,
	})
	if err != nil {
		if err == pgx.ErrNoRows {
			return &dto.AttendanceSessionResponse{
				SessionID: "",
				CourseID:  courseID,
				Date:      date,
				Records:   []dto.AttendanceRecord{},
			}, nil
		}
		return nil, apperror.ErrInternal
	}

	records, err := q.GetSessionRecords(ctx, session.ID)
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.AttendanceRecord, len(records))
	for i, r := range records {
		items[i] = dto.AttendanceRecord{
			StudentID:   uuidToString(r.StudentID),
			FirstName:   r.FirstName,
			LastName:    r.LastName,
			DNI:         r.Dni,
			Status:      string(r.Status),
			Observation: r.Observation.String,
		}
	}

	return &dto.AttendanceSessionResponse{
		SessionID: uuidToString(session.ID),
		CourseID:  courseID,
		Date:      date,
		Records:   items,
	}, nil
}

func (s *AttendanceService) SaveAttendance(ctx context.Context, req dto.SaveAttendanceRequest, requesterID, role string) error {
	q := dbsqlc.New(s.pool)

	var cid pgtype.UUID
	if err := cid.Scan(req.CourseID); err != nil {
		return apperror.New(apperror.ErrBadRequest, "course_id inválido", "INVALID_COURSE_ID")
	}

	parsedDate := parseDate(req.Date)
	if !parsedDate.Valid {
		return apperror.New(apperror.ErrBadRequest, "fecha inválida (formato: YYYY-MM-DD)", "INVALID_DATE")
	}

	if role == "teacher" {
		if err := verifyCourseOwnership(ctx, q, cid, requesterID); err != nil {
			return err
		}
		if !isWithinAttendanceWindow(parsedDate.Time) {
			return apperror.New(apperror.ErrForbidden, "solo se puede editar asistencia de los últimos 2 meses", "OUTSIDE_EDITABLE_WINDOW")
		}
	}

	var createdBy pgtype.UUID
	if err := createdBy.Scan(requesterID); err != nil {
		return apperror.ErrBadRequest
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error interno", "TX_ERROR")
	}
	defer tx.Rollback(ctx)

	qtx := dbsqlc.New(tx)

	session, err := qtx.UpsertSession(ctx, dbsqlc.UpsertSessionParams{
		CourseID:  cid,
		Date:      parsedDate,
		CreatedBy: createdBy,
	})
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al crear sesión", "SESSION_ERROR")
	}

	for _, r := range req.Records {
		var sid pgtype.UUID
		if err := sid.Scan(r.StudentID); err != nil {
			return apperror.New(apperror.ErrBadRequest, "student_id inválido", "INVALID_STUDENT_ID")
		}

		if err := qtx.UpsertAttendanceRecord(ctx, dbsqlc.UpsertAttendanceRecordParams{
			SessionID:   session.ID,
			StudentID:   sid,
			Status:      dbsqlc.AttendanceStatus(r.Status),
			Observation: pgtype.Text{String: r.Observation, Valid: r.Observation != ""},
		}); err != nil {
			return apperror.New(apperror.ErrInternal, "error al guardar asistencia", "RECORD_ERROR")
		}
	}

	return tx.Commit(ctx)
}

func (s *AttendanceService) GetHistory(ctx context.Context, studentID, courseID, requesterID, role string) ([]dto.AttendanceHistoryItem, error) {
	q := dbsqlc.New(s.pool)

	var sid pgtype.UUID
	if err := sid.Scan(studentID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	// Para un docente, course_id es OBLIGATORIO y debe ser un curso suyo. Sin
	// esta exigencia, omitir course_id salteaba la verificación de propiedad y
	// devolvía el historial completo del alumno (IDOR).
	if role == "teacher" {
		if courseID == "" {
			return nil, apperror.New(apperror.ErrBadRequest, "course_id es obligatorio", "COURSE_ID_REQUIRED")
		}
		var cid pgtype.UUID
		if err := cid.Scan(courseID); err != nil {
			return nil, apperror.ErrBadRequest
		}
		if err := verifyCourseOwnership(ctx, q, cid, requesterID); err != nil {
			return nil, err
		}
	}

	rows, err := q.GetAttendanceHistory(ctx, dbsqlc.GetAttendanceHistoryParams{
		StudentID: sid,
		Column2:   courseID,
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.AttendanceHistoryItem, len(rows))
	for i, r := range rows {
		items[i] = dto.AttendanceHistoryItem{
			Date:        r.Date.Time.Format("2006-01-02"),
			CourseID:    uuidToString(r.CourseID),
			CourseName:  r.CourseName,
			Status:      string(r.Status),
			Observation: r.Observation.String,
		}
	}

	return items, nil
}

func (s *AttendanceService) GetAnnual(ctx context.Context, courseID string, year int, requesterID, role string) ([]dto.AnnualAttendanceRow, error) {
	q := dbsqlc.New(s.pool)

	var cid pgtype.UUID
	if err := cid.Scan(courseID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	if role == "teacher" {
		if err := verifyCourseOwnership(ctx, q, cid, requesterID); err != nil {
			return nil, err
		}
	}

	rows, err := q.GetAnnualAttendance(ctx, dbsqlc.GetAnnualAttendanceParams{
		CourseID: cid,
		Column2:  int32(year),
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.AnnualAttendanceRow, len(rows))
	for i, r := range rows {
		items[i] = dto.AnnualAttendanceRow{
			StudentID: uuidToString(r.StudentID),
			FirstName: r.FirstName,
			LastName:  r.LastName,
			DNI:       r.Dni,
			Date:      r.Date.Time.Format("2006-01-02"),
			Status:    string(r.Status),
		}
	}

	return items, nil
}

func (s *AttendanceService) GetMyAttendance(ctx context.Context, studentID, courseID string) ([]dto.AttendanceHistoryItem, error) {
	return s.GetHistory(ctx, studentID, courseID, studentID, "student")
}

// ── helpers privados ──────────────────────────────────────────────

func isWithinAttendanceWindow(date time.Time) bool {
	return isWithinAttendanceWindowAt(time.Now(), date)
}

// isWithinAttendanceWindowAt — versión testeable con el "now" inyectado.
func isWithinAttendanceWindowAt(now, date time.Time) bool {
	windowStart := time.Date(now.Year(), now.Month()-time.Month(editableWindowMonths-1), 1, 0, 0, 0, 0, time.UTC)
	return !date.Before(windowStart)
}
