-- name: InsertEnrollment :one
INSERT INTO enrollments (student_id, course_id)
VALUES ($1, $2)
RETURNING id, student_id, course_id, enrolled_at, status;

-- name: GetActiveEnrollment :one
SELECT id FROM enrollments
WHERE student_id = $1 AND course_id = $2 AND status = 'active'
LIMIT 1;

-- name: GetActiveEnrolledStudentIDs :many
SELECT student_id FROM enrollments
WHERE course_id = $1 AND status = 'active'
  AND student_id = ANY($2::uuid[]);

-- name: GetAnyEnrollment :one
SELECT id FROM enrollments
WHERE student_id = $1 AND course_id = $2
LIMIT 1;

-- name: GetEnrollmentCourseID :one
SELECT course_id FROM enrollments
WHERE id = $1 AND status = 'active'
LIMIT 1;

-- name: ListEnrollments :many
SELECT
    e.id, e.enrolled_at, e.status,
    u.id AS student_id, u.first_name, u.last_name, u.email,
    s.dni,
    c.id AS course_id, c.name AS course_name, c.level AS course_level
FROM enrollments e
JOIN students s ON e.student_id = s.id
JOIN users u ON s.id = u.id
JOIN courses c ON e.course_id = c.id
WHERE
    ($1 = '' OR e.student_id::text = $1)
    AND ($2 = '' OR e.course_id::text = $2)
    AND ($3 = 'all' OR e.status::text = $3)
ORDER BY e.enrolled_at DESC;

-- name: DropEnrollment :exec
UPDATE enrollments
SET status = 'dropped', dropped_at = NOW()
WHERE id = $1 AND status = 'active';
