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

type StudentService struct {
	pool *pgxpool.Pool
}

func NewStudentService(pool *pgxpool.Pool) *StudentService {
	return &StudentService{pool: pool}
}

func (s *StudentService) List(ctx context.Context, search, status string, page, pageSize int) (*dto.PaginatedResponse[dto.StudentListItem], error) {
	q := dbsqlc.New(s.pool)

	offset := int32((page - 1) * pageSize)

	rows, err := q.ListStudents(ctx, dbsqlc.ListStudentsParams{
		Column1: search,
		Column2: status,
		Limit:   int32(pageSize),
		Offset:  offset,
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	total, err := q.CountStudents(ctx, dbsqlc.CountStudentsParams{
		Column1: search,
		Column2: status,
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.StudentListItem, len(rows))
	for i, r := range rows {
		items[i] = dto.StudentListItem{
			ID:        uuidToString(r.ID),
			FirstName: r.FirstName,
			LastName:  r.LastName,
			Email:     r.Email,
			DNI:       r.Dni,
			Phone:     r.Phone.String,
			Status:    string(r.Status),
			CreatedAt: r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		}
	}

	return &dto.PaginatedResponse[dto.StudentListItem]{
		Data:     items,
		Total:    int(total),
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (s *StudentService) GetByID(ctx context.Context, id string) (*dto.StudentDetail, error) {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(id); err != nil {
		return nil, apperror.ErrBadRequest
	}

	row, err := q.GetStudentByID(ctx, uid)
	if err != nil {
		return nil, apperror.ErrNotFound
	}

	return studentRowToDetail(row), nil
}

func (s *StudentService) Create(ctx context.Context, req dto.CreateStudentRequest) (*dto.StudentDetail, error) {
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
		Role:         dbsqlc.UserRoleStudent,
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

	if err := q.CreateStudent(ctx, dbsqlc.CreateStudentParams{
		ID:         user.ID,
		Dni:        req.DNI,
		Address:    pgtype.Text{String: req.Address, Valid: req.Address != ""},
		TutorName:  pgtype.Text{String: req.TutorName, Valid: req.TutorName != ""},
		TutorPhone: pgtype.Text{String: req.TutorPhone, Valid: req.TutorPhone != ""},
	}); err != nil {
		if isUniqueViolation(err) {
			return nil, apperror.New(apperror.ErrConflict, "el DNI ya está registrado", "DNI_TAKEN")
		}
		return nil, apperror.New(apperror.ErrInternal, "error al crear el estudiante", "CREATE_STUDENT_ERROR")
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error interno", "TX_COMMIT_ERROR")
	}

	return s.GetByID(ctx, uuidToString(user.ID))
}

func (s *StudentService) Update(ctx context.Context, id string, req dto.UpdateStudentRequest) (*dto.StudentDetail, error) {
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

	if err := q.UpdateStudentData(ctx, dbsqlc.UpdateStudentDataParams{
		ID:         uid,
		Dni:        req.DNI,
		Address:    pgtype.Text{String: req.Address, Valid: req.Address != ""},
		TutorName:  pgtype.Text{String: req.TutorName, Valid: req.TutorName != ""},
		TutorPhone: pgtype.Text{String: req.TutorPhone, Valid: req.TutorPhone != ""},
	}); err != nil {
		if isUniqueViolation(err) {
			return nil, apperror.New(apperror.ErrConflict, "el DNI ya está registrado", "DNI_TAKEN")
		}
		return nil, apperror.New(apperror.ErrInternal, "error al actualizar el estudiante", "UPDATE_STUDENT_ERROR")
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error interno", "TX_COMMIT_ERROR")
	}

	return s.GetByID(ctx, id)
}

func (s *StudentService) UpdateStatus(ctx context.Context, id, status string) error {
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

func (s *StudentService) Approve(ctx context.Context, id string) error {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}

	return q.UpdateUserStatus(ctx, dbsqlc.UpdateUserStatusParams{
		ID:     uid,
		Status: dbsqlc.UserStatusActive,
	})
}

// ── helpers privados ──────────────────────────────────────────────

func studentRowToDetail(r dbsqlc.GetStudentByIDRow) *dto.StudentDetail {
	return &dto.StudentDetail{
		ID:         uuidToString(r.ID),
		FirstName:  r.FirstName,
		LastName:   r.LastName,
		Email:      r.Email,
		DNI:        r.Dni,
		Phone:      r.Phone.String,
		AvatarURL:  r.AvatarUrl.String,
		Status:     string(r.Status),
		Address:    r.Address.String,
		TutorName:  r.TutorName.String,
		TutorPhone: r.TutorPhone.String,
		CreatedAt:  r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:  r.UpdatedAt.Time.Format("2006-01-02T15:04:05Z"),
	}
}
