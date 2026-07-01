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

type NotificationService struct {
	pool *pgxpool.Pool
}

func NewNotificationService(pool *pgxpool.Pool) *NotificationService {
	return &NotificationService{pool: pool}
}

func (s *NotificationService) List(ctx context.Context, userID, role string) ([]dto.NotificationItem, error) {
	q := dbsqlc.New(s.pool)

	if role == "admin" {
		rows, err := q.ListAllNotifications(ctx)
		if err != nil {
			return nil, apperror.ErrInternal
		}
		items := make([]dto.NotificationItem, len(rows))
		for i, r := range rows {
			items[i] = notificationToDTO(r.ID, r.Title, r.Message, r.Type, r.AudienceType, r.AudienceCourseID, r.CourseName, r.AudienceUserID, r.CreatedAt)
		}
		return items, nil
	}

	courseIDs, err := userCourseIDs(ctx, q, userID, role)
	if err != nil {
		return nil, err
	}

	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	rows, err := q.ListNotificationsForUser(ctx, dbsqlc.ListNotificationsForUserParams{
		Column1:        role,
		Column2:        courseIDs,
		AudienceUserID: uid,
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}
	items := make([]dto.NotificationItem, len(rows))
	for i, r := range rows {
		items[i] = notificationToDTO(r.ID, r.Title, r.Message, r.Type, r.AudienceType, r.AudienceCourseID, r.CourseName, r.AudienceUserID, r.CreatedAt)
	}
	return items, nil
}

func (s *NotificationService) Create(ctx context.Context, req dto.CreateNotificationRequest, createdBy string) (string, error) {
	q := dbsqlc.New(s.pool)

	courseID, userID, err := s.resolveAudience(ctx, q, req.AudienceType, req.AudienceCourseID, req.AudienceUserID)
	if err != nil {
		return "", err
	}

	var createdByUUID pgtype.UUID
	if err := createdByUUID.Scan(createdBy); err != nil {
		return "", apperror.ErrBadRequest
	}

	id, err := q.InsertNotification(ctx, dbsqlc.InsertNotificationParams{
		Title:            req.Title,
		Message:          req.Message,
		Type:             dbsqlc.NotificationType(req.Type),
		AudienceType:     dbsqlc.NotificationAudience(req.AudienceType),
		AudienceCourseID: courseID,
		AudienceUserID:   userID,
		CreatedBy:        createdByUUID,
	})
	if err != nil {
		return "", apperror.New(apperror.ErrInternal, "error al crear la notificación", "CREATE_NOTIFICATION_ERROR")
	}

	return uuidToString(id), nil
}

func (s *NotificationService) Update(ctx context.Context, id string, req dto.UpdateNotificationRequest) error {
	q := dbsqlc.New(s.pool)

	var nid pgtype.UUID
	if err := nid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}

	// 404 antes de validar el body: si la notificación no existe, la validación
	// de audiencia es irrelevante.
	if _, err := q.GetNotificationByID(ctx, nid); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperror.New(apperror.ErrNotFound, "notificación no encontrada", "NOTIFICATION_NOT_FOUND")
		}
		return apperror.ErrInternal
	}

	courseID, userID, err := s.resolveAudience(ctx, q, req.AudienceType, req.AudienceCourseID, req.AudienceUserID)
	if err != nil {
		return err
	}

	rows, err := q.UpdateNotification(ctx, dbsqlc.UpdateNotificationParams{
		ID:               nid,
		Title:            req.Title,
		Message:          req.Message,
		Type:             dbsqlc.NotificationType(req.Type),
		AudienceType:     dbsqlc.NotificationAudience(req.AudienceType),
		AudienceCourseID: courseID,
		AudienceUserID:   userID,
	})
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al actualizar la notificación", "UPDATE_NOTIFICATION_ERROR")
	}
	if rows == 0 {
		return apperror.New(apperror.ErrNotFound, "notificación no encontrada", "NOTIFICATION_NOT_FOUND")
	}
	return nil
}

func (s *NotificationService) Delete(ctx context.Context, id string) error {
	q := dbsqlc.New(s.pool)

	var nid pgtype.UUID
	if err := nid.Scan(id); err != nil {
		return apperror.ErrBadRequest
	}

	rows, err := q.DeleteNotification(ctx, nid)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al eliminar la notificación", "DELETE_NOTIFICATION_ERROR")
	}
	if rows == 0 {
		return apperror.New(apperror.ErrNotFound, "notificación no encontrada", "NOTIFICATION_NOT_FOUND")
	}
	return nil
}

// ── helpers privados ──────────────────────────────────────────────

// resolveAudience valida la coherencia audience_type / course_id / user_id
// (replica el CHECK de la BD para dar un error claro antes de llegar a ella)
// y devuelve los UUID parseados (NULL donde corresponde).
func (s *NotificationService) resolveAudience(ctx context.Context, q *dbsqlc.Queries, audienceType, courseIDStr, userIDStr string) (pgtype.UUID, pgtype.UUID, error) {
	var courseID, userID pgtype.UUID
	badReq := func(msg string) (pgtype.UUID, pgtype.UUID, error) {
		return pgtype.UUID{}, pgtype.UUID{}, apperror.New(apperror.ErrBadRequest, msg, "INVALID_AUDIENCE")
	}

	switch audienceType {
	case "todos", "docentes", "estudiantes":
		if courseIDStr != "" || userIDStr != "" {
			return badReq("esta audiencia no admite course_id ni user_id")
		}
	case "curso":
		if courseIDStr == "" {
			return badReq("audiencia 'curso' requiere audience_course_id")
		}
		if userIDStr != "" {
			return badReq("audiencia 'curso' no admite audience_user_id")
		}
		if err := courseID.Scan(courseIDStr); err != nil {
			return badReq("audience_course_id inválido")
		}
	case "estudiante_especifico", "docente_especifico":
		if userIDStr == "" {
			return badReq("esta audiencia requiere audience_user_id")
		}
		if courseIDStr != "" {
			return badReq("esta audiencia no admite audience_course_id")
		}
		if err := userID.Scan(userIDStr); err != nil {
			return badReq("audience_user_id inválido")
		}
		// El user_id debe corresponder al rol de la audiencia (evita que un admin
		// distraído dirija una notificación de alumno a un docente y viceversa).
		role, err := q.GetUserRole(ctx, userID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return badReq("el usuario indicado no existe")
			}
			return pgtype.UUID{}, pgtype.UUID{}, apperror.ErrInternal
		}
		if audienceType == "estudiante_especifico" && role != dbsqlc.UserRoleStudent {
			return badReq("audience_user_id no corresponde a un estudiante")
		}
		if audienceType == "docente_especifico" && role != dbsqlc.UserRoleTeacher {
			return badReq("audience_user_id no corresponde a un docente")
		}
	}

	return courseID, userID, nil
}

func notificationToDTO(id pgtype.UUID, title, message string, ntype dbsqlc.NotificationType,
	audienceType dbsqlc.NotificationAudience, courseID pgtype.UUID, courseName pgtype.Text,
	userID pgtype.UUID, createdAt pgtype.Timestamptz) dto.NotificationItem {

	item := dto.NotificationItem{
		ID:           uuidToString(id),
		Title:        title,
		Message:      message,
		Type:         string(ntype),
		AudienceType: string(audienceType),
		CreatedAt:    createdAt.Time.Format("2006-01-02T15:04:05Z"),
	}
	if courseID.Valid {
		item.AudienceCourseID = uuidToString(courseID)
		item.CourseName = courseName.String
	}
	if userID.Valid {
		item.AudienceUserID = uuidToString(userID)
	}
	return item
}
