-- name: GetUserByEmail :one
SELECT id, email, password_hash, role, first_name, last_name, phone, avatar_url, status, created_at, updated_at, email_verified
FROM users
WHERE email = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT id, email, password_hash, role, first_name, last_name, phone, avatar_url, status, created_at, updated_at, email_verified
FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserRole :one
SELECT role FROM users WHERE id = $1;

-- name: CreateUser :one
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, status)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdateUserStatus :exec
UPDATE users
SET status = $2, updated_at = NOW()
WHERE id = $1;

-- name: UpdateUserProfile :one
UPDATE users
SET first_name = $2, last_name = $3, phone = $4, updated_at = NOW()
WHERE id = $1
RETURNING id, email, password_hash, role, first_name, last_name, phone, avatar_url, status, created_at, updated_at, email_verified;

-- name: UpdateUserPassword :exec
UPDATE users
SET password_hash = $2, updated_at = NOW()
WHERE id = $1;

-- name: UpdateUserAvatar :one
UPDATE users
SET avatar_url = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, email, password_hash, role, first_name, last_name, phone, avatar_url, status, created_at, updated_at, email_verified;
