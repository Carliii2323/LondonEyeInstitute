-- name: CreateTeacher :exec
INSERT INTO teachers (id, dni, join_date, notes)
VALUES ($1, $2, $3, $4);

-- name: GetTeacherByID :one
SELECT
    u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.status,
    u.created_at, u.updated_at,
    t.dni, t.join_date, t.notes
FROM teachers t
JOIN users u ON t.id = u.id
WHERE t.id = $1
LIMIT 1;

-- name: ListTeachers :many
SELECT
    u.id, u.email, u.first_name, u.last_name, u.phone, u.status, u.created_at,
    t.dni
FROM teachers t
JOIN users u ON t.id = u.id
WHERE
    ($1 = '' OR u.first_name ILIKE '%' || $1 || '%'
        OR u.last_name ILIKE '%' || $1 || '%'
        OR u.email ILIKE '%' || $1 || '%'
        OR t.dni ILIKE '%' || $1 || '%')
    AND ($2 = '' OR u.status::text = $2)
ORDER BY u.created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountTeachers :one
SELECT COUNT(*)
FROM teachers t
JOIN users u ON t.id = u.id
WHERE
    ($1 = '' OR u.first_name ILIKE '%' || $1 || '%'
        OR u.last_name ILIKE '%' || $1 || '%'
        OR u.email ILIKE '%' || $1 || '%'
        OR t.dni ILIKE '%' || $1 || '%')
    AND ($2 = '' OR u.status::text = $2);

-- name: UpdateTeacherData :exec
UPDATE teachers
SET dni = $2, join_date = $3, notes = $4, updated_at = NOW()
WHERE id = $1;
