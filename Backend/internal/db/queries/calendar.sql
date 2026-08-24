-- name: GetActiveCourseIDsForStudent :many
SELECT course_id FROM enrollments
WHERE student_id = $1 AND status = 'active';

-- name: GetCourseIDsForTeacher :many
SELECT id FROM courses
WHERE teacher_id = $1;

-- name: ListEventsByMonth :many
SELECT
    e.id, e.title, e.type, e.date, e.start_time, e.end_time, e.message,
    e.course_id, e.created_by, e.created_at,
    c.name AS course_name
FROM calendar_events e
LEFT JOIN courses c ON e.course_id = c.id
WHERE EXTRACT(YEAR FROM e.date) = $1::int
  AND EXTRACT(MONTH FROM e.date) = $2::int
ORDER BY e.date, e.start_time NULLS FIRST;

-- name: ListEventsByMonthForCourses :many
SELECT
    e.id, e.title, e.type, e.date, e.start_time, e.end_time, e.message,
    e.course_id, e.created_by, e.created_at,
    c.name AS course_name
FROM calendar_events e
LEFT JOIN courses c ON e.course_id = c.id
WHERE EXTRACT(YEAR FROM e.date) = $1::int
  AND EXTRACT(MONTH FROM e.date) = $2::int
  AND (e.course_id IS NULL OR e.course_id = ANY($3::uuid[]))
ORDER BY e.date, e.start_time NULLS FIRST;

-- name: InsertEvent :one
INSERT INTO calendar_events (title, type, date, start_time, end_time, message, course_id, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id;

-- name: UpdateEvent :execrows
UPDATE calendar_events
SET title = $2, type = $3, date = $4, start_time = $5, end_time = $6,
    message = $7, course_id = $8, updated_at = NOW()
WHERE id = $1;

-- name: DeleteEvent :execrows
DELETE FROM calendar_events WHERE id = $1;

-- name: GetEventByID :one
SELECT id, created_by, course_id FROM calendar_events WHERE id = $1 LIMIT 1;
