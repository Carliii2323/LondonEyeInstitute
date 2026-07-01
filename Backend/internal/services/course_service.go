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

type CourseService struct {
	pool *pgxpool.Pool
}

func NewCourseService(pool *pgxpool.Pool) *CourseService {
	return &CourseService{pool: pool}
}

func (s *CourseService) List(ctx context.Context, search, status string, page, pageSize int) (*dto.PaginatedResponse[dto.CourseListItem], error) {
	q := dbsqlc.New(s.pool)

	rows, err := q.ListCourses(ctx, dbsqlc.ListCoursesParams{
		Column1: search,
		Column2: status,
		Limit:   int32(pageSize),
		Offset:  int32((page - 1) * pageSize),
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	total, err := q.CountCourses(ctx, dbsqlc.CountCoursesParams{
		Column1: search,
		Column2: status,
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.CourseListItem, len(rows))
	for i, r := range rows {
		items[i] = dto.CourseListItem{
			ID:               uuidToString(r.ID),
			Name:             r.Name,
			Level:            string(r.Level),
			Schedule:         r.Schedule,
			PriceMonthly:     numericToString(r.PriceMonthly),
			InscripcionPrice: numericToStringPtr(r.InscripcionPrice),
			ExamenPrice:      numericToStringPtr(r.ExamenPrice),
			ClassroomCode:    r.ClassroomCode.String,
			Capacity:         r.Capacity,
			EnrolledCount:    r.EnrolledCount,
			Status:           string(r.Status),
			TeacherID:        uuidToString(r.TeacherID),
			TeacherFirstName: r.TeacherFirstName.String,
			TeacherLastName:  r.TeacherLastName.String,
			CreatedAt:        r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		}
	}

	return &dto.PaginatedResponse[dto.CourseListItem]{
		Data:     items,
		Total:    int(total),
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (s *CourseService) GetByID(ctx context.Context, id string) (*dto.CourseDetail, error) {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(id); err != nil {
		return nil, apperror.ErrBadRequest
	}

	row, err := q.GetCourseByID(ctx, uid)
	if err != nil {
		return nil, apperror.ErrNotFound
	}

	return courseRowToDetail(row), nil
}

func (s *CourseService) Create(ctx context.Context, req dto.CreateCourseRequest) (*dto.CourseDetail, error) {
	q := dbsqlc.New(s.pool)

	price, err := parseNumeric(req.PriceMonthly)
	if err != nil {
		return nil, apperror.New(apperror.ErrBadRequest, "precio inválido", "INVALID_PRICE")
	}

	teacherID, err := parseOptionalUUID(req.TeacherID)
	if err != nil {
		return nil, apperror.New(apperror.ErrBadRequest, "teacher_id inválido", "INVALID_TEACHER_ID")
	}

	insPrice, err := parseOptionalNumeric(req.InscripcionPrice)
	if err != nil {
		return nil, apperror.New(apperror.ErrBadRequest, "precio de inscripción inválido", "INVALID_PRICE")
	}
	examPrice, err := parseOptionalNumeric(req.ExamenPrice)
	if err != nil {
		return nil, apperror.New(apperror.ErrBadRequest, "precio de examen inválido", "INVALID_PRICE")
	}

	course, err := q.CreateCourse(ctx, dbsqlc.CreateCourseParams{
		Name:             req.Name,
		Level:            dbsqlc.CourseLevel(req.Level),
		Schedule:         req.Schedule,
		PriceMonthly:     price,
		Capacity:         req.Capacity,
		TeacherID:        teacherID,
		Status:           dbsqlc.CourseStatusActivo,
		InscripcionPrice: insPrice,
		ExamenPrice:      examPrice,
		ClassroomCode:    pgtype.Text{String: req.ClassroomCode, Valid: req.ClassroomCode != ""},
	})
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al crear el curso", "CREATE_COURSE_ERROR")
	}

	return s.GetByID(ctx, uuidToString(course.ID))
}

func (s *CourseService) Update(ctx context.Context, id string, req dto.UpdateCourseRequest) (*dto.CourseDetail, error) {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(id); err != nil {
		return nil, apperror.ErrBadRequest
	}

	price, err := parseNumeric(req.PriceMonthly)
	if err != nil {
		return nil, apperror.New(apperror.ErrBadRequest, "precio inválido", "INVALID_PRICE")
	}

	teacherID, err := parseOptionalUUID(req.TeacherID)
	if err != nil {
		return nil, apperror.New(apperror.ErrBadRequest, "teacher_id inválido", "INVALID_TEACHER_ID")
	}

	insPrice, err := parseOptionalNumeric(req.InscripcionPrice)
	if err != nil {
		return nil, apperror.New(apperror.ErrBadRequest, "precio de inscripción inválido", "INVALID_PRICE")
	}
	examPrice, err := parseOptionalNumeric(req.ExamenPrice)
	if err != nil {
		return nil, apperror.New(apperror.ErrBadRequest, "precio de examen inválido", "INVALID_PRICE")
	}

	if _, err := q.UpdateCourse(ctx, dbsqlc.UpdateCourseParams{
		ID:               uid,
		Name:             req.Name,
		Level:            dbsqlc.CourseLevel(req.Level),
		Schedule:         req.Schedule,
		PriceMonthly:     price,
		Capacity:         req.Capacity,
		TeacherID:        teacherID,
		InscripcionPrice: insPrice,
		ExamenPrice:      examPrice,
		ClassroomCode:    pgtype.Text{String: req.ClassroomCode, Valid: req.ClassroomCode != ""},
	}); err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al actualizar el curso", "UPDATE_COURSE_ERROR")
	}

	if err := s.recalcStatus(ctx, q, uid, req.Capacity); err != nil {
		return nil, apperror.ErrInternal
	}

	return s.GetByID(ctx, id)
}

func (s *CourseService) UpdateStatus(ctx context.Context, id, status string) error {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}

	return q.UpdateCourseStatus(ctx, dbsqlc.UpdateCourseStatusParams{
		ID:     uid,
		Status: dbsqlc.CourseStatus(status),
	})
}

func (s *CourseService) ListByTeacher(ctx context.Context, teacherID string) ([]dto.CourseListItem, error) {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(teacherID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	rows, err := q.ListCoursesByTeacher(ctx, uid)
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.CourseListItem, len(rows))
	for i, r := range rows {
		items[i] = dto.CourseListItem{
			ID:               uuidToString(r.ID),
			Name:             r.Name,
			Level:            string(r.Level),
			Schedule:         r.Schedule,
			PriceMonthly:     numericToString(r.PriceMonthly),
			InscripcionPrice: numericToStringPtr(r.InscripcionPrice),
			ExamenPrice:      numericToStringPtr(r.ExamenPrice),
			ClassroomCode:    r.ClassroomCode.String,
			Capacity:         r.Capacity,
			EnrolledCount:    r.EnrolledCount,
			Status:           string(r.Status),
			TeacherID:        uuidToString(r.TeacherID),
			TeacherFirstName: r.TeacherFirstName.String,
			TeacherLastName:  r.TeacherLastName.String,
			CreatedAt:        r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		}
	}

	return items, nil
}

// ListByStudent — cursos activos del alumno ("Mis Cursos" del Home).
func (s *CourseService) ListByStudent(ctx context.Context, studentID string) ([]dto.StudentCourse, error) {
	q := dbsqlc.New(s.pool)

	var sid pgtype.UUID
	if err := sid.Scan(studentID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	rows, err := q.ListStudentCourses(ctx, sid)
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.StudentCourse, len(rows))
	for i, r := range rows {
		teacherName := ""
		if r.TeacherFirstName.Valid {
			teacherName = r.TeacherFirstName.String + " " + r.TeacherLastName.String
		}
		items[i] = dto.StudentCourse{
			ID:            uuidToString(r.ID),
			Name:          r.Name,
			Level:         string(r.Level),
			Schedule:      r.Schedule,
			ClassroomCode: r.ClassroomCode.String,
			TeacherName:   teacherName,
		}
	}
	return items, nil
}

func (s *CourseService) ListStudents(ctx context.Context, courseID string) ([]dto.CourseStudent, error) {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(courseID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	now := time.Now()
	rows, err := q.ListCourseStudents(ctx, dbsqlc.ListCourseStudentsParams{
		CourseID: uid,
		Column2:  int32(now.Month()),
		Column3:  int32(now.Year()),
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	students := make([]dto.CourseStudent, len(rows))
	for i, r := range rows {
		paymentStatus := ""
		if r.PaymentStatus.Valid {
			paymentStatus = string(r.PaymentStatus.PaymentStatus)
		}
		students[i] = dto.CourseStudent{
			ID:            uuidToString(r.ID),
			FirstName:     r.FirstName,
			LastName:      r.LastName,
			Email:         r.Email,
			DNI:           r.Dni,
			Phone:         r.Phone.String,
			Status:        string(r.Status),
			EnrolledAt:    r.EnrolledAt.Time.Format("2006-01-02T15:04:05Z"),
			PaymentStatus: paymentStatus,
		}
	}

	return students, nil
}

// ListStudentsForTeacher devuelve el roster de un curso validando que el
// curso pertenezca al docente (mismo listado que el admin, con ownership).
func (s *CourseService) ListStudentsForTeacher(ctx context.Context, courseID, teacherID string) ([]dto.CourseStudent, error) {
	q := dbsqlc.New(s.pool)

	var cid pgtype.UUID
	if err := cid.Scan(courseID); err != nil {
		return nil, apperror.ErrBadRequest
	}
	if err := verifyCourseOwnership(ctx, q, cid, teacherID); err != nil {
		return nil, err
	}
	return s.ListStudents(ctx, courseID)
}

// RecalcStatus se llama también desde EnrollmentService en Sprint 3.
func (s *CourseService) RecalcStatus(ctx context.Context, courseID pgtype.UUID, capacity int32) error {
	return s.recalcStatus(ctx, dbsqlc.New(s.pool), courseID, capacity)
}

// ── helpers privados ──────────────────────────────────────────────

func (s *CourseService) recalcStatus(ctx context.Context, q *dbsqlc.Queries, courseID pgtype.UUID, capacity int32) error {
	count, err := q.GetEnrolledCount(ctx, courseID)
	if err != nil {
		return err
	}

	newStatus := dbsqlc.CourseStatusActivo
	if count >= int64(capacity) {
		newStatus = dbsqlc.CourseStatusCupoCompleto
	}

	return q.UpdateCourseStatus(ctx, dbsqlc.UpdateCourseStatusParams{
		ID:     courseID,
		Status: newStatus,
	})
}

func courseRowToDetail(r dbsqlc.GetCourseByIDRow) *dto.CourseDetail {
	return &dto.CourseDetail{
		CourseListItem: dto.CourseListItem{
			ID:               uuidToString(r.ID),
			Name:             r.Name,
			Level:            string(r.Level),
			Schedule:         r.Schedule,
			PriceMonthly:     numericToString(r.PriceMonthly),
			InscripcionPrice: numericToStringPtr(r.InscripcionPrice),
			ExamenPrice:      numericToStringPtr(r.ExamenPrice),
			ClassroomCode:    r.ClassroomCode.String,
			Capacity:         r.Capacity,
			EnrolledCount:    r.EnrolledCount,
			Status:           string(r.Status),
			TeacherID:        uuidToString(r.TeacherID),
			TeacherFirstName: r.TeacherFirstName.String,
			TeacherLastName:  r.TeacherLastName.String,
			CreatedAt:        r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		},
		UpdatedAt: r.UpdatedAt.Time.Format("2006-01-02T15:04:05Z"),
	}
}
