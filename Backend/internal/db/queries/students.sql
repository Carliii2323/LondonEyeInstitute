-- name: CreateStudent :exec
INSERT INTO students (id, dni, address, tutor_name, tutor_phone)
VALUES ($1, $2, $3, $4, $5);

-- name: GetStudentByID :one
SELECT
    u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.status,
    u.created_at, u.updated_at,
    s.dni, s.address, s.tutor_name, s.tutor_phone
FROM students s
JOIN users u ON s.id = u.id
WHERE s.id = $1
LIMIT 1;

-- name: ListStudents :many
SELECT
    u.id, u.email, u.first_name, u.last_name, u.phone, u.status, u.created_at,
    s.dni
FROM students s
JOIN users u ON s.id = u.id
WHERE
    ($1 = '' OR u.first_name ILIKE '%' || $1 || '%'
        OR u.last_name ILIKE '%' || $1 || '%'
        OR u.email ILIKE '%' || $1 || '%'
        OR s.dni ILIKE '%' || $1 || '%')
    AND ($2 = '' OR u.status::text = $2)
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
SET dni = $2, address = $3, tutor_name = $4, tutor_phone = $5, updated_at = NOW()
WHERE id = $1;
