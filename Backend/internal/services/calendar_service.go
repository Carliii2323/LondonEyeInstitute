package services

import (
	"context"

	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CalendarService struct {
	pool *pgxpool.Pool
}

func NewCalendarService(pool *pgxpool.Pool) *CalendarService {
	return &CalendarService{pool: pool}
}

func (s *CalendarService) List(ctx context.Context, month, year int, userID, role string) ([]dto.CalendarEventItem, error) {
	q := dbsqlc.New(s.pool)

	if role == "admin" {
		rows, err := q.ListEventsByMonth(ctx, dbsqlc.ListEventsByMonthParams{
			Column1: int32(year),
			Column2: int32(month),
		})
		if err != nil {
			return nil, apperror.ErrInternal
		}
		items := make([]dto.CalendarEventItem, len(rows))
		for i, r := range rows {
			items[i] = eventToDTO(r.ID, r.Title, r.Type, r.Date, r.StartTime, r.EndTime, r.Message, r.CourseID, r.CreatedBy, r.CreatedAt, r.CourseName)
		}
		return items, nil
	}

	// docente / alumno: eventos generales + los de sus cursos
	courseIDs, err := userCourseIDs(ctx, q, userID, role)
	if err != nil {
		return nil, err
	}

	rows, err := q.ListEventsByMonthForCourses(ctx, dbsqlc.ListEventsByMonthForCoursesParams{
		Column1: int32(year),
		Column2: int32(month),
		Column3: courseIDs,
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}
	items := make([]dto.CalendarEventItem, len(rows))
	for i, r := range rows {
		items[i] = eventToDTO(r.ID, r.Title, r.Type, r.Date, r.StartTime, r.EndTime, r.Message, r.CourseID, r.CreatedBy, r.CreatedAt, r.CourseName)
	}
	return items, nil
}

func (s *CalendarService) Create(ctx context.Context, req dto.CreateEventRequest, createdBy string) (string, error) {
	q := dbsqlc.New(s.pool)

	date := parseDate(req.Date)
	if !date.Valid {
		return "", apperror.New(apperror.ErrBadRequest, "fecha inválida (formato: YYYY-MM-DD)", "INVALID_DATE")
	}

	courseID, err := parseOptionalUUID(req.CourseID)
	if err != nil {
		return "", apperror.New(apperror.ErrBadRequest, "course_id inválido", "INVALID_COURSE_ID")
	}

	var createdByUUID pgtype.UUID
	if err := createdByUUID.Scan(createdBy); err != nil {
		return "", apperror.ErrBadRequest
	}

	id, err := q.InsertEvent(ctx, dbsqlc.InsertEventParams{
		Title:     req.Title,
		Type:      dbsqlc.EventType(req.Type),
		Date:      date,
		StartTime: parseTimeOfDay(req.StartTime),
		EndTime:   parseTimeOfDay(req.EndTime),
		Message:   pgtype.Text{String: req.Message, Valid: req.Message != ""},
		CourseID:  courseID,
		CreatedBy: createdByUUID,
	})
	if err != nil {
		return "", apperror.New(apperror.ErrInternal, "error al crear el evento", "CREATE_EVENT_ERROR")
	}

	return uuidToString(id), nil
}

func (s *CalendarService) Update(ctx context.Context, id string, req dto.UpdateEventRequest) error {
	q := dbsqlc.New(s.pool)

	var eid pgtype.UUID
	if err := eid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}

	date := parseDate(req.Date)
	if !date.Valid {
		return apperror.New(apperror.ErrBadRequest, "fecha inválida (formato: YYYY-MM-DD)", "INVALID_DATE")
	}

	courseID, err := parseOptionalUUID(req.CourseID)
	if err != nil {
		return apperror.New(apperror.ErrBadRequest, "course_id inválido", "INVALID_COURSE_ID")
	}

	rows, err := q.UpdateEvent(ctx, dbsqlc.UpdateEventParams{
		ID:        eid,
		Title:     req.Title,
		Type:      dbsqlc.EventType(req.Type),
		Date:      date,
		StartTime: parseTimeOfDay(req.StartTime),
		EndTime:   parseTimeOfDay(req.EndTime),
		Message:   pgtype.Text{String: req.Message, Valid: req.Message != ""},
		CourseID:  courseID,
	})
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al actualizar el evento", "UPDATE_EVENT_ERROR")
	}
	if rows == 0 {
		return apperror.New(apperror.ErrNotFound, "evento no encontrado", "EVENT_NOT_FOUND")
	}
	return nil
}

func (s *CalendarService) Delete(ctx context.Context, id string) error {
	q := dbsqlc.New(s.pool)

	var eid pgtype.UUID
	if err := eid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}

	rows, err := q.DeleteEvent(ctx, eid)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al eliminar el evento", "DELETE_EVENT_ERROR")
	}
	if rows == 0 {
		return apperror.New(apperror.ErrNotFound, "evento no encontrado", "EVENT_NOT_FOUND")
	}
	return nil
}

// ── Profesor: solo eventos de SUS cursos, y solo los que él creó ──────

func (s *CalendarService) CreateForTeacher(ctx context.Context, req dto.CreateEventRequest, teacherID string) (string, error) {
	if req.CourseID == "" {
		return "", apperror.New(apperror.ErrBadRequest, "el evento debe estar asociado a uno de tus cursos", "COURSE_REQUIRED")
	}
	courseID, err := parseOptionalUUID(req.CourseID)
	if err != nil {
		return "", apperror.New(apperror.ErrBadRequest, "course_id inválido", "INVALID_COURSE_ID")
	}
	q := dbsqlc.New(s.pool)
	if err := verifyCourseOwnership(ctx, q, courseID, teacherID); err != nil {
		return "", err
	}
	return s.Create(ctx, req, teacherID)
}

func (s *CalendarService) UpdateForTeacher(ctx context.Context, id string, req dto.UpdateEventRequest, teacherID string) error {
	if err := s.assertTeacherOwnsEvent(ctx, id, teacherID); err != nil {
		return err
	}
	if req.CourseID == "" {
		return apperror.New(apperror.ErrBadRequest, "el evento debe estar asociado a uno de tus cursos", "COURSE_REQUIRED")
	}
	courseID, err := parseOptionalUUID(req.CourseID)
	if err != nil {
		return apperror.New(apperror.ErrBadRequest, "course_id inválido", "INVALID_COURSE_ID")
	}
	q := dbsqlc.New(s.pool)
	if err := verifyCourseOwnership(ctx, q, courseID, teacherID); err != nil {
		return err
	}
	return s.Update(ctx, id, req)
}

func (s *CalendarService) DeleteForTeacher(ctx context.Context, id, teacherID string) error {
	if err := s.assertTeacherOwnsEvent(ctx, id, teacherID); err != nil {
		return err
	}
	return s.Delete(ctx, id)
}

// assertTeacherOwnsEvent verifica que el evento exista y lo haya creado el profe.
func (s *CalendarService) assertTeacherOwnsEvent(ctx context.Context, id, teacherID string) error {
	var eid, tid pgtype.UUID
	if err := eid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}
	if err := tid.Scan(teacherID); err != nil {
		return apperror.ErrForbidden
	}
	q := dbsqlc.New(s.pool)
	ev, err := q.GetEventByID(ctx, eid)
	if err != nil {
		return apperror.New(apperror.ErrNotFound, "evento no encontrado", "EVENT_NOT_FOUND")
	}
	if ev.CreatedBy != tid {
		return apperror.New(apperror.ErrForbidden, "solo podés modificar los eventos que vos creaste", "NOT_YOUR_EVENT")
	}
	return nil
}

// ── helpers privados ──────────────────────────────────────────────

func eventToDTO(id pgtype.UUID, title string, etype dbsqlc.EventType, date pgtype.Date,
	start, end pgtype.Time, msg pgtype.Text, courseID, createdBy pgtype.UUID,
	createdAt pgtype.Timestamptz, courseName pgtype.Text) dto.CalendarEventItem {

	item := dto.CalendarEventItem{
		ID:        uuidToString(id),
		Title:     title,
		Type:      string(etype),
		Date:      date.Time.Format("2006-01-02"),
		StartTime: timeToString(start),
		EndTime:   timeToString(end),
		Message:   msg.String,
		CreatedBy: uuidToString(createdBy),
		CreatedAt: createdAt.Time.Format("2006-01-02T15:04:05Z"),
	}
	if courseID.Valid {
		item.CourseID = uuidToString(courseID)
		item.CourseName = courseName.String
	}
	return item
}
