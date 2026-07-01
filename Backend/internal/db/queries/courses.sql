-- name: CreateCourse :one
INSERT INTO courses (name, level, schedule, price_monthly, capacity, teacher_id, status, inscripcion_price, examen_price, classroom_code)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetCourseByID :one
SELECT
    c.id, c.name, c.level, c.schedule, c.price_monthly, c.capacity, c.status,
    c.teacher_id, c.inscripcion_price, c.examen_price, c.classroom_code, c.created_at, c.updated_at,
    u.first_name AS teacher_first_name,
    u.last_name  AS teacher_last_name,
    COUNT(e.id) FILTER (WHERE e.status = 'active') AS enrolled_count
FROM courses c
LEFT JOIN teachers t ON c.teacher_id = t.id
LEFT JOIN users u ON t.id = u.id
LEFT JOIN enrollments e ON c.id = e.course_id
WHERE c.id = $1
GROUP BY c.id, u.first_name, u.last_name;

-- name: ListCourses :many
SELECT
    c.id, c.name, c.level, c.schedule, c.price_monthly, c.capacity, c.status,
    c.teacher_id, c.inscripcion_price, c.examen_price, c.classroom_code, c.created_at,
    u.first_name AS teacher_first_name,
    u.last_name  AS teacher_last_name,
    COUNT(e.id) FILTER (WHERE e.status = 'active') AS enrolled_count
FROM courses c
LEFT JOIN teachers t ON c.teacher_id = t.id
LEFT JOIN users u ON t.id = u.id
LEFT JOIN enrollments e ON c.id = e.course_id
WHERE
    ($1 = '' OR c.name ILIKE '%' || $1 || '%')
    AND ($2 = '' OR c.status::text = $2)
GROUP BY c.id, u.first_name, u.last_name
ORDER BY c.created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountCourses :one
SELECT COUNT(DISTINCT c.id)
FROM courses c
WHERE
    ($1 = '' OR c.name ILIKE '%' || $1 || '%')
    AND ($2 = '' OR c.status::text = $2);

-- name: UpdateCourse :one
UPDATE courses
SET name = $2, level = $3, schedule = $4, price_monthly = $5,
    capacity = $6, teacher_id = $7, inscripcion_price = $8, examen_price = $9,
    classroom_code = $10, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateCourseStatus :exec
UPDATE courses
SET status = $2, updated_at = NOW()
WHERE id = $1;

-- name: GetEnrolledCount :one
SELECT COUNT(*) FROM enrollments
WHERE course_id = $1 AND status = 'active';

-- name: ListCoursesByTeacher :many
SELECT
    c.id, c.name, c.level, c.schedule, c.price_monthly, c.capacity, c.status,
    c.teacher_id, c.inscripcion_price, c.examen_price, c.classroom_code, c.created_at,
    u.first_name AS teacher_first_name,
    u.last_name  AS teacher_last_name,
    COUNT(e.id) FILTER (WHERE e.status = 'active') AS enrolled_count
FROM courses c
LEFT JOIN teachers t ON c.teacher_id = t.id
LEFT JOIN users u ON t.id = u.id
LEFT JOIN enrollments e ON c.id = e.course_id
WHERE c.teacher_id = $1
GROUP BY c.id, u.first_name, u.last_name
ORDER BY c.created_at DESC;

-- name: ListStudentCourses :many
-- Cursos activos del alumno (para "Mis Cursos" del Home): horario, docente y
-- clave de Classroom.
SELECT
    c.id, c.name, c.level, c.schedule, c.classroom_code,
    u.first_name AS teacher_first_name,
    u.last_name  AS teacher_last_name
FROM enrollments e
JOIN courses c ON e.course_id = c.id
LEFT JOIN teachers t ON c.teacher_id = t.id
LEFT JOIN users u ON t.id = u.id
WHERE e.student_id = $1 AND e.status = 'active'
ORDER BY c.name;

-- name: GetCourseTeacherID :one
SELECT teacher_id FROM courses WHERE id = $1;

-- name: LockCourse :one
SELECT id, capacity, price_monthly FROM courses
WHERE id = $1
FOR UPDATE;

-- name: ListCourseStudents :many
-- Roster del curso + estado de la cuota mensual del período indicado ($2 mes,
-- $3 año). payment_status NULL = no tiene cuota generada para ese mes.
SELECT
    u.id, u.first_name, u.last_name, u.email, u.phone, u.status,
    s.dni,
    e.enrolled_at,
    pay.status AS payment_status
FROM enrollments e
JOIN students s ON e.student_id = s.id
JOIN users u ON s.id = u.id
LEFT JOIN payments pay ON pay.student_id = e.student_id
    AND pay.course_id = e.course_id
    AND pay.type = 'cuota_mensual'
    AND pay.month = $2::int
    AND pay.year = $3::int
WHERE e.course_id = $1 AND e.status = 'active'
ORDER BY u.last_name, u.first_name;
