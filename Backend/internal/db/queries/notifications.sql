-- name: ListAllNotifications :many
-- Admin: ve todas las notificaciones (las gestiona).
SELECT
    n.id, n.title, n.message, n.type, n.audience_type,
    n.audience_course_id, n.audience_user_id, n.created_at,
    c.name AS course_name
FROM notifications n
LEFT JOIN courses c ON n.audience_course_id = c.id
ORDER BY n.created_at DESC;

-- name: ListNotificationsForUser :many
-- Docente/alumno: ve las de su audiencia.
--   $1 = rol ('teacher' | 'student'), $2 = sus course_ids, $3 = su user_id
SELECT
    n.id, n.title, n.message, n.type, n.audience_type,
    n.audience_course_id, n.audience_user_id, n.created_at,
    c.name AS course_name
FROM notifications n
LEFT JOIN courses c ON n.audience_course_id = c.id
WHERE
    n.audience_type = 'todos'
    OR ($1 = 'teacher' AND n.audience_type = 'docentes')
    OR ($1 = 'student' AND n.audience_type = 'estudiantes')
    OR (n.audience_type = 'curso' AND n.audience_course_id = ANY($2::uuid[]))
    OR (n.audience_type IN ('estudiante_especifico', 'docente_especifico')
        AND n.audience_user_id = $3)
ORDER BY n.created_at DESC;

-- name: GetNotificationByID :one
SELECT id FROM notifications WHERE id = $1;

-- name: InsertNotification :one
INSERT INTO notifications (title, message, type, audience_type, audience_course_id, audience_user_id, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id;

-- name: UpdateNotification :execrows
UPDATE notifications
SET title = $2, message = $3, type = $4, audience_type = $5,
    audience_course_id = $6, audience_user_id = $7, updated_at = NOW()
WHERE id = $1;

-- name: DeleteNotification :execrows
DELETE FROM notifications WHERE id = $1;
