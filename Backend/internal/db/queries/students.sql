-- name: CreateStudent :exec
INSERT INTO students (id, dni, address, tutor_name, tutor_phone, birth_date)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: GetStudentByID :one
SELECT
    u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.status,
    u.email_verified, u.created_at, u.updated_at,
    s.dni, s.address, s.tutor_name, s.tutor_phone, s.birth_date,
    s.dni_front_url, s.dni_back_url
FROM students s
JOIN users u ON s.id = u.id
WHERE s.id = $1
LIMIT 1;

-- name: ListStudents :many
-- Incluye el tutor y los cursos activos (nombres) del alumno.
SELECT
    u.id, u.email, u.first_name, u.last_name, u.phone, u.status, u.email_verified, u.created_at,
    s.dni, s.tutor_name,
    COALESCE(string_agg(DISTINCT c.name, ', '), '')::text AS courses
FROM students s
JOIN users u ON s.id = u.id
LEFT JOIN enrollments e ON e.student_id = s.id AND e.status = 'active'
LEFT JOIN courses c ON c.id = e.course_id
WHERE
    ($1 = '' OR u.first_name ILIKE '%' || $1 || '%'
        OR u.last_name ILIKE '%' || $1 || '%'
        OR u.email ILIKE '%' || $1 || '%'
        OR s.dni ILIKE '%' || $1 || '%')
    AND ($2 = '' OR u.status::text = $2)
GROUP BY u.id, s.dni, s.tutor_name
ORDER BY u.created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountStudents :one
SELECT COUNT(*)
FROM students s
JOIN users u ON s.id = u.id
WHERE
    ($1 = '' OR u.first_name ILIKE '%' || $1 || '%'
        OR u.last_name ILIKE '%' || $1 || '%'
        OR u.email ILIKE '%' || $1 || '%'
        OR s.dni ILIKE '%' || $1 || '%')
    AND ($2 = '' OR u.status::text = $2);

-- name: UpdateStudentData :exec
UPDATE students
SET dni = $2, address = $3, tutor_name = $4, tutor_phone = $5, birth_date = $6, updated_at = NOW()
WHERE id = $1;

-- name: UpdateStudentAddress :exec
UPDATE students
SET address = $2, updated_at = NOW()
WHERE id = $1;

-- name: GetStudentByDNI :one
SELECT u.id, u.first_name, u.last_name, s.dni
FROM students s
JOIN users u ON u.id = s.id
WHERE s.dni = $1 LIMIT 1;

-- name: SetStudentDniFront :exec
UPDATE students SET dni_front_url = $2, updated_at = NOW() WHERE id = $1;

-- name: SetStudentDniBack :exec
UPDATE students SET dni_back_url = $2, updated_at = NOW() WHERE id = $1;

-- name: GetStudentDniUrls :one
SELECT dni_front_url, dni_back_url FROM students WHERE id = $1;
