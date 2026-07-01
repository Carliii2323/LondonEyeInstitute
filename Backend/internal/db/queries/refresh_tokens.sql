-- name: CreateRefreshToken :exec
INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
VALUES ($1, $2, $3);

-- name: GetRefreshToken :one
SELECT id, user_id, expires_at, revoked_at
FROM refresh_tokens
WHERE token_hash = $1 LIMIT 1;

-- name: RevokeRefreshToken :execrows
UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE token_hash = $1;

-- name: RevokeAllUserTokens :exec
UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE user_id = $1 AND revoked_at IS NULL;

-- name: DeleteExpiredTokens :execrows
DELETE FROM refresh_tokens
WHERE expires_at < NOW() OR revoked_at IS NOT NULL;

-- name: RevokeExcessUserTokens :exec
UPDATE refresh_tokens AS rt
SET revoked_at = NOW()
WHERE rt.user_id = $1
  AND rt.revoked_at IS NULL
  AND rt.id NOT IN (
    SELECT sub.id FROM refresh_tokens AS sub
    WHERE sub.user_id = $1
      AND sub.revoked_at IS NULL
    ORDER BY sub.created_at DESC
    LIMIT $2
  );
