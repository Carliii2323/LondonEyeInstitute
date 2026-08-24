-- name: SetUserEmailVerified :exec
UPDATE users
SET email_verified = true, updated_at = NOW()
WHERE id = $1;

-- name: GetUserVerificationByEmail :one
SELECT id, first_name, email_verified
FROM users
WHERE email = $1 LIMIT 1;

-- name: CreateEmailVerificationToken :exec
INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
VALUES ($1, $2, $3);

-- name: GetEmailVerificationToken :one
SELECT id, user_id, token_hash, expires_at, used_at, created_at
FROM email_verification_tokens
WHERE token_hash = $1 LIMIT 1;

-- name: MarkEmailVerificationUsed :execrows
UPDATE email_verification_tokens
SET used_at = NOW()
WHERE token_hash = $1 AND used_at IS NULL;

-- name: DeleteUnusedEmailVerificationTokens :exec
DELETE FROM email_verification_tokens
WHERE user_id = $1 AND used_at IS NULL;
