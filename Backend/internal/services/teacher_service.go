package services

import (
	"context"

	"sge-london-eye/internal/auth"
	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TeacherService struct {
	pool *pgxpool.Pool
}

func NewTeacherService(pool *pgxpool.Pool) *TeacherService {
	return &TeacherService{pool: pool}
}

func (s *TeacherService) List(ctx context.Context, search, status string, page, pageSize int) (*dto.PaginatedResponse[dto.TeacherListItem], error) {
	q := dbsqlc.New(s.pool)

	offset := int32((page - 1) * pageSize)

	rows, err := q.ListTeachers(ctx, dbsqlc.ListTeachersParams{
		Column1: search,
		Column2: status,
		Limit:   int32(pageSize),
		Offset:  offset,
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	total, err := q.CountTeachers(ctx, dbsqlc.CountTeachersParams{
		Column1: search,
		Column2: status,
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.TeacherListItem, len(rows))
	for i, r := range rows {
		items[i] = dto.TeacherListItem{
			ID:           uuidToString(r.ID),
			FirstName:    r.FirstName,
			LastName:     r.LastName,
			Email:        r.Email,
			DNI:          r.Dni,
			Phone:        r.Phone.String,
			CoursesCount: r.CoursesCount,
			Status:       string(r.Status),
			CreatedAt:    r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		}
	}

	return &dto.PaginatedResponse[dto.TeacherListItem]{
		Data:     items,
		Total:    int(total),
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (s *TeacherService) GetByID(ctx context.Context, id string) (*dto.TeacherDetail, error) {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(id); err != nil {
		return nil, apperror.ErrBadRequest
	}

	row, err := q.GetTeacherByID(ctx, uid)
	if err != nil {
		return nil, apperror.ErrNotFound
	}

	return teacherRowToDetail(row), nil
}

func (s *TeacherService) Create(ctx context.Context, req dto.CreateTeacherRequest) (*dto.TeacherDetail, error) {
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al procesar la contraseña", "HASH_ERROR")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error interno", "TX_ERROR")
	}
	defer tx.Rollback(ctx)

	q := dbsqlc.New(tx)

	user, err := q.CreateUser(ctx, dbsqlc.CreateUserParams{
		Email:        req.Email,
		PasswordHash: hash,
		Role:         dbsqlc.UserRoleTeacher,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Phone:        pgtype.Text{String: req.Phone, Valid: req.Phone != ""},
		Status:       dbsqlc.UserStatusActive,
	})
	if err != nil {
		if isUniqueViolation(err) {
			return nil, apperror.New(apperror.ErrConflict, "el email ya está registrado", "EMAIL_TAKEN")
		}
		return nil, apperror.New(apperror.ErrInternal, "error al crear el usuario", "CREATE_USER_ERROR")
	}

	if err := q.CreateTeacher(ctx, dbsqlc.CreateTeacherParams{
		ID:       user.ID,
		Dni:      req.DNI,
		JoinDate: parseDate(req.JoinDate),
		Notes:    pgtype.Text{String: req.Notes, Valid: req.Notes != ""},
	}); err != nil {
		if isUniqueViolation(err) {
			return nil, apperror.New(apperror.ErrConflict, "el DNI ya está registrado", "DNI_TAKEN")
		}
		return nil, apperror.New(apperror.ErrInternal, "error al crear el docente", "CREATE_TEACHER_ERROR")
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error interno", "TX_COMMIT_ERROR")
	}

	return s.GetByID(ctx, uuidToString(user.ID))
}

func (s *TeacherService) Update(ctx context.Context, id string, req dto.UpdateTeacherRequest) (*dto.TeacherDetail, error) {
	var uid pgtype.UUID
	if err := uid.Scan(id); err != nil {
		return nil, apperror.ErrBadRequest
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error interno", "TX_ERROR")
	}
	defer tx.Rollback(ctx)

	q := dbsqlc.New(tx)

	if _, err := q.UpdateUserProfile(ctx, dbsqlc.UpdateUserProfileParams{
		ID:        uid,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Phone:     pgtype.Text{String: req.Phone, Valid: req.Phone != ""},
	}); err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al actualizar el usuario", "UPDATE_USER_ERROR")
	}

	if err := q.UpdateTeacherData(ctx, dbsqlc.UpdateTeacherDataParams{
		ID:       uid,
		Dni:      req.DNI,
		JoinDate: parseDate(req.JoinDate),
		Notes:    pgtype.Text{String: req.Notes, Valid: req.Notes != ""},
	}); err != nil {
		if isUniqueViolation(err) {
			return nil, apperror.New(apperror.ErrConflict, "el DNI ya está registrado", "DNI_TAKEN")
		}
		return nil, apperror.New(apperror.ErrInternal, "error al actualizar el docente", "UPDATE_TEACHER_ERROR")
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error interno", "TX_COMMIT_ERROR")
	}

	return s.GetByID(ctx, id)
}

func (s *TeacherService) UpdateStatus(ctx context.Context, id, status string) error {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}

	return q.UpdateUserStatus(ctx, dbsqlc.UpdateUserStatusParams{
		ID:     uid,
		Status: dbsqlc.UserStatus(status),
	})
}

// ── helpers privados ──────────────────────────────────────────────

func teacherRowToDetail(r dbsqlc.GetTeacherByIDRow) *dto.TeacherDetail {
	joinDate := ""
	if r.JoinDate.Valid {
		joinDate = r.JoinDate.Time.Format("2006-01-02")
	}
	return &dto.TeacherDetail{
		ID:        uuidToString(r.ID),
		FirstName: r.FirstName,
		LastName:  r.LastName,
		Email:     r.Email,
		DNI:       r.Dni,
		Phone:     r.Phone.String,
		AvatarURL: r.AvatarUrl.String,
		Status:    string(r.Status),
		JoinDate:  joinDate,
		Notes:     r.Notes.String,
		CreatedAt: r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		UpdatedAt: r.UpdatedAt.Time.Format("2006-01-02T15:04:05Z"),
	}
}
