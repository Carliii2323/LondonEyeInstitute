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

// LibretaService — descarga de la libreta (REPORT CARD) con autorización.
// La 1ra descarga de cada libreta es libre; las siguientes requieren que el
// admin apruebe una solicitud, que habilita una única descarga.
type LibretaService struct {
	pool *pgxpool.Pool
}

func NewLibretaService(pool *pgxpool.Pool) *LibretaService {
	return &LibretaService{pool: pool}
}

// parseLibreta valida student_id y course_id y verifica que el alumno haya
// cursado (inscripción activa o dada de baja). Devuelve los UUID parseados.
func (s *LibretaService) parseLibreta(ctx context.Context, q *dbsqlc.Queries, studentID, courseID string) (pgtype.UUID, pgtype.UUID, error) {
	var sid, cid pgtype.UUID
	if err := sid.Scan(studentID); err != nil {
		return sid, cid, apperror.ErrBadRequest
	}
	if err := cid.Scan(courseID); err != nil {
		return sid, cid, apperror.New(apperror.ErrBadRequest, "course_id inválido", "INVALID_COURSE_ID")
	}
	if _, err := q.GetAnyEnrollment(ctx, dbsqlc.GetAnyEnrollmentParams{StudentID: sid, CourseID: cid}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return sid, cid, apperror.New(apperror.ErrBadRequest, "no tenés una libreta de este curso", "NOT_ENROLLED")
		}
		return sid, cid, apperror.ErrInternal
	}
	return sid, cid, nil
}

// ListByStudent — todas las filas de solicitudes del alumno (el front computa
// el estado por libreta: 1ra libre, pendiente, autorizada).
func (s *LibretaService) ListByStudent(ctx context.Context, studentID string) ([]dto.LibretaRequestItem, error) {
	q := dbsqlc.New(s.pool)

	var sid pgtype.UUID
	if err := sid.Scan(studentID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	rows, err := q.ListLibretaRequestsByStudent(ctx, sid)
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.LibretaRequestItem, len(rows))
	for i, r := range rows {
		items[i] = dto.LibretaRequestItem{
			ID:        uuidToString(r.ID),
			CourseID:  uuidToString(r.CourseID),
			Year:      r.Year,
			Status:    r.Status,
			CreatedAt: r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		}
	}
	return items, nil
}

// Download — registra/consume una descarga. La 1ra es libre; si ya hubo
// descargas, gasta una autorización aprobada o devuelve 403 (necesita solicitar).
func (s *LibretaService) Download(ctx context.Context, studentID string, req dto.LibretaActionRequest) error {
	q := dbsqlc.New(s.pool)

	sid, cid, err := s.parseLibreta(ctx, q, studentID, req.CourseID)
	if err != nil {
		return err
	}

	count, err := q.CountConsumedLibreta(ctx, dbsqlc.CountConsumedLibretaParams{StudentID: sid, CourseID: cid, Year: int32(req.Year)})
	if err != nil {
		return apperror.ErrInternal
	}

	// 1ra descarga libre.
	if count == 0 {
		if err := q.InsertConsumedLibreta(ctx, dbsqlc.InsertConsumedLibretaParams{StudentID: sid, CourseID: cid, Year: int32(req.Year)}); err != nil {
			return apperror.ErrInternal
		}
		return nil
	}

	// Si no, requiere una autorización aprobada sin usar.
	approvedID, err := q.GetApprovedLibreta(ctx, dbsqlc.GetApprovedLibretaParams{StudentID: sid, CourseID: cid, Year: int32(req.Year)})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperror.New(apperror.ErrForbidden, "necesitás autorización del administrador para volver a descargar la libreta", "LIBRETA_NOT_AUTHORIZED")
		}
		return apperror.ErrInternal
	}
	if err := q.ConsumeLibretaApproval(ctx, approvedID); err != nil {
		return apperror.ErrInternal
	}
	return nil
}

// RequestDownload — el alumno solicita autorización para volver a descargar.
func (s *LibretaService) RequestDownload(ctx context.Context, studentID string, req dto.LibretaActionRequest) error {
	q := dbsqlc.New(s.pool)

	sid, cid, err := s.parseLibreta(ctx, q, studentID, req.CourseID)
	if err != nil {
		return err
	}

	count, err := q.CountConsumedLibreta(ctx, dbsqlc.CountConsumedLibretaParams{StudentID: sid, CourseID: cid, Year: int32(req.Year)})
	if err != nil {
		return apperror.ErrInternal
	}
	if count == 0 {
		return apperror.New(apperror.ErrBadRequest, "la primera descarga es libre, no necesitás solicitarla", "LIBRETA_FIRST_FREE")
	}

	// ¿Ya tiene una autorización sin usar?
	if _, err := q.GetApprovedLibreta(ctx, dbsqlc.GetApprovedLibretaParams{StudentID: sid, CourseID: cid, Year: int32(req.Year)}); err == nil {
		return apperror.New(apperror.ErrConflict, "ya tenés una descarga autorizada disponible", "LIBRETA_ALREADY_APPROVED")
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return apperror.ErrInternal
	}

	// ¿Ya tiene una solicitud pendiente?
	if _, err := q.GetPendingLibreta(ctx, dbsqlc.GetPendingLibretaParams{StudentID: sid, CourseID: cid, Year: int32(req.Year)}); err == nil {
		return apperror.New(apperror.ErrConflict, "ya tenés una solicitud pendiente para esta libreta", "LIBRETA_ALREADY_PENDING")
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return apperror.ErrInternal
	}

	if _, err := q.InsertLibretaRequest(ctx, dbsqlc.InsertLibretaRequestParams{StudentID: sid, CourseID: cid, Year: int32(req.Year)}); err != nil {
		if isUniqueViolation(err) {
			return apperror.New(apperror.ErrConflict, "ya tenés una solicitud pendiente para esta libreta", "LIBRETA_ALREADY_PENDING")
		}
		return apperror.ErrInternal
	}
	return nil
}

// ListPending — solicitudes pendientes para el admin.
func (s *LibretaService) ListPending(ctx context.Context) ([]dto.AdminLibretaRequestItem, error) {
	q := dbsqlc.New(s.pool)

	rows, err := q.ListPendingLibretaRequests(ctx)
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.AdminLibretaRequestItem, len(rows))
	for i, r := range rows {
		items[i] = dto.AdminLibretaRequestItem{
			ID:          uuidToString(r.ID),
			StudentID:   uuidToString(r.StudentID),
			StudentName: r.FirstName + " " + r.LastName,
			CourseID:    uuidToString(r.CourseID),
			CourseName:  r.CourseName,
			Year:        r.Year,
			Status:      r.Status,
			CreatedAt:   r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		}
	}
	return items, nil
}

// Approve — autoriza una solicitud pendiente (habilita una descarga).
func (s *LibretaService) Approve(ctx context.Context, id, adminID string) error {
	return s.review(ctx, id, adminID, true)
}

// Reject — rechaza una solicitud pendiente.
func (s *LibretaService) Reject(ctx context.Context, id, adminID string) error {
	return s.review(ctx, id, adminID, false)
}

func (s *LibretaService) review(ctx context.Context, id, adminID string, approve bool) error {
	q := dbsqlc.New(s.pool)

	var rid, aid pgtype.UUID
	if err := rid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}
	if err := aid.Scan(adminID); err != nil {
		return apperror.ErrBadRequest
	}

	var rows int64
	var err error
	if approve {
		rows, err = q.ApproveLibretaRequest(ctx, dbsqlc.ApproveLibretaRequestParams{ID: rid, ReviewedBy: aid})
	} else {
		rows, err = q.RejectLibretaRequest(ctx, dbsqlc.RejectLibretaRequestParams{ID: rid, ReviewedBy: aid})
	}
	if err != nil {
		return apperror.ErrInternal
	}
	if rows == 0 {
		return apperror.New(apperror.ErrNotFound, "la solicitud no existe o ya fue revisada", "LIBRETA_REQUEST_NOT_PENDING")
	}
	return nil
}
