package services

import (
	"context"
	"path/filepath"

	"sge-london-eye/internal/auth"
	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"
	"sge-london-eye/internal/storage"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StudentService struct {
	pool    *pgxpool.Pool
	storage storage.Storage
}

func NewStudentService(pool *pgxpool.Pool, s storage.Storage) *StudentService {
	return &StudentService{pool: pool, storage: s}
}

// List lista alumnos con filtros opcionales. courseID vacio y year 0 = sin filtrar.
func (s *StudentService) List(ctx context.Context, search, status, courseID string, year, page, pageSize int) (*dto.PaginatedResponse[dto.StudentListItem], error) {
	q := dbsqlc.New(s.pool)

	offset := int32((page - 1) * pageSize)

	rows, err := q.ListStudents(ctx, dbsqlc.ListStudentsParams{
		Search:     search,
		Status:     status,
		CourseID:   courseID,
		Year:       int32(year),
		PageLimit:  int32(pageSize),
		PageOffset: offset,
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	total, err := q.CountStudents(ctx, dbsqlc.CountStudentsParams{
		Search:   search,
		Status:   status,
		CourseID: courseID,
		Year:     int32(year),
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.StudentListItem, len(rows))
	for i, r := range rows {
		items[i] = dto.StudentListItem{
			ID:            uuidToString(r.ID),
			FirstName:     r.FirstName,
			LastName:      r.LastName,
			Email:         r.Email,
			DNI:           r.Dni,
			Phone:         r.Phone.String,
			TutorName:     r.TutorName.String,
			Courses:       r.Courses,
			Status:        string(r.Status),
			EmailVerified: r.EmailVerified,
			CreatedAt:     r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
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
		BirthDate:  parseDate(req.BirthDate),
	}); err != nil {
		if isUniqueViolation(err) {
			return nil, apperror.New(apperror.ErrConflict, "el DNI ya está registrado", "DNI_TAKEN")
		}
		return nil, apperror.New(apperror.ErrInternal, "error al crear el estudiante", "CREATE_STUDENT_ERROR")
	}

	// Alta por admin: cuenta de confianza, no pasa por verificación de email.
	if err := q.SetUserEmailVerified(ctx, user.ID); err != nil {
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
		BirthDate:  parseDate(req.BirthDate),
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

// UpdateMyAddress — el alumno autenticado actualiza solo su propia dirección (F9).
func (s *StudentService) UpdateMyAddress(ctx context.Context, id, address string) (*dto.StudentDetail, error) {
	var uid pgtype.UUID
	if err := uid.Scan(id); err != nil {
		return nil, apperror.ErrBadRequest
	}

	q := dbsqlc.New(s.pool)
	if err := q.UpdateStudentAddress(ctx, dbsqlc.UpdateStudentAddressParams{
		ID:      uid,
		Address: pgtype.Text{String: address, Valid: address != ""},
	}); err != nil {
		return nil, apperror.ErrInternal
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

// UploadDni guarda un archivo del DNI (side = "front" | "back") del alumno.
func (s *StudentService) UploadDni(ctx context.Context, id, side string, data []byte, filename string) error {
	if side != "front" && side != "back" {
		return apperror.New(apperror.ErrBadRequest, "lado inválido (front|back)", "INVALID_SIDE")
	}
	var uid pgtype.UUID
	if err := uid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}

	urls, err := s.dniURLs(ctx, uid)
	if err != nil {
		return apperror.ErrNotFound
	}

	url, err := s.storage.Save(ctx, "dni", id+"-"+side+filepath.Ext(filename), data)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al guardar el archivo", "STORAGE_ERROR")
	}
	// Borrar el anterior si cambió el nombre (evita huérfanos).
	if prev := urls[side]; prev != "" && prev != url {
		_ = s.storage.Delete(ctx, prev)
	}

	q := dbsqlc.New(s.pool)
	if side == "front" {
		err = q.SetStudentDniFront(ctx, dbsqlc.SetStudentDniFrontParams{ID: uid, DniFrontUrl: pgtype.Text{String: url, Valid: true}})
	} else {
		err = q.SetStudentDniBack(ctx, dbsqlc.SetStudentDniBackParams{ID: uid, DniBackUrl: pgtype.Text{String: url, Valid: true}})
	}
	if err != nil {
		return apperror.ErrInternal
	}
	return nil
}

// GetDni lee un archivo del DNI del alumno para servirlo (endpoint autenticado).
func (s *StudentService) GetDni(ctx context.Context, id, side string) (data []byte, filename string, err error) {
	if side != "front" && side != "back" {
		return nil, "", apperror.New(apperror.ErrBadRequest, "lado inválido (front|back)", "INVALID_SIDE")
	}
	var uid pgtype.UUID
	if err := uid.Scan(id); err != nil {
		return nil, "", apperror.ErrBadRequest
	}
	urls, err := s.dniURLs(ctx, uid)
	if err != nil {
		return nil, "", apperror.ErrNotFound
	}
	url := urls[side]
	if url == "" {
		return nil, "", apperror.New(apperror.ErrNotFound, "no hay archivo cargado", "DNI_FILE_NOT_FOUND")
	}
	data, err = s.storage.Read(ctx, url)
	if err != nil {
		return nil, "", apperror.New(apperror.ErrInternal, "error al leer el archivo", "STORAGE_READ_ERROR")
	}
	return data, "dni-" + side + filepath.Ext(url), nil
}

// dniURLs devuelve las urls de los archivos del DNI del alumno {front, back}.
func (s *StudentService) dniURLs(ctx context.Context, uid pgtype.UUID) (map[string]string, error) {
	q := dbsqlc.New(s.pool)
	r, err := q.GetStudentDniUrls(ctx, uid)
	if err != nil {
		return nil, err
	}
	return map[string]string{"front": r.DniFrontUrl.String, "back": r.DniBackUrl.String}, nil
}

// ── helpers privados ──────────────────────────────────────────────

func studentRowToDetail(r dbsqlc.GetStudentByIDRow) *dto.StudentDetail {
	return &dto.StudentDetail{
		ID:            uuidToString(r.ID),
		FirstName:     r.FirstName,
		LastName:      r.LastName,
		Email:         r.Email,
		DNI:           r.Dni,
		Phone:         r.Phone.String,
		AvatarURL:     r.AvatarUrl.String,
		Status:        string(r.Status),
		EmailVerified: r.EmailVerified,
		Address:       r.Address.String,
		TutorName:     r.TutorName.String,
		TutorPhone:    r.TutorPhone.String,
		BirthDate:     formatDatePtr(r.BirthDate),
		HasDniFront:   r.DniFrontUrl.Valid && r.DniFrontUrl.String != "",
		HasDniBack:    r.DniBackUrl.Valid && r.DniBackUrl.String != "",
		CreatedAt:     r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:     r.UpdatedAt.Time.Format("2006-01-02T15:04:05Z"),
	}
}

// formatDatePtr — pgtype.Date → "YYYY-MM-DD" ("" si NULL).
func formatDatePtr(d pgtype.Date) string {
	if !d.Valid {
		return ""
	}
	return d.Time.Format("2006-01-02")
}
