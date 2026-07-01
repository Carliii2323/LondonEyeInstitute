-- name: ListLibretaRequestsByStudent :many
-- Todas las filas del alumno; el front computa el estado por libreta.
SELECT id, course_id, year, status, created_at
FROM libreta_requests
WHERE student_id = $1
ORDER BY created_at DESC;

-- name: CountConsumedLibreta :one
-- Descargas ya usadas de una libreta (si es 0 → la 1ra es libre).
SELECT COUNT(*) FROM libreta_requests
WHERE student_id = $1 AND course_id = $2 AND year = $3 AND status = 'consumed';

-- name: GetApprovedLibreta :one
-- Autorización aprobada sin consumir para esta libreta (la más antigua).
SELECT id FROM libreta_requests
WHERE student_id = $1 AND course_id = $2 AND year = $3 AND status = 'approved'
ORDER BY created_at ASC
LIMIT 1;

-- name: GetPendingLibreta :one
SELECT id FROM libreta_requests
WHERE student_id = $1 AND course_id = $2 AND year = $3 AND status = 'pending'
LIMIT 1;

-- name: InsertConsumedLibreta :exec
-- Registra una descarga usada (caso 1ra descarga libre).
INSERT INTO libreta_requests (student_id, course_id, year, status, reviewed_at)
VALUES ($1, $2, $3, 'consumed', NOW());

-- name: ConsumeLibretaApproval :exec
-- Gasta una autorización aprobada (la marca como consumida).
UPDATE libreta_requests SET status = 'consumed', reviewed_at = NOW()
WHERE id = $1;

-- name: InsertLibretaRequest :one
INSERT INTO libreta_requests (student_id, course_id, year, status)
VALUES ($1, $2, $3, 'pending')
RETURNING id;

-- name: ListPendingLibretaRequests :many
-- Para el admin: solicitudes pendientes con nombre de alumno y curso.
SELECT
    lr.id, lr.student_id, lr.course_id, lr.year, lr.status, lr.created_at,
    u.first_name, u.last_name, c.name AS course_name
FROM libreta_requests lr
JOIN students s ON lr.student_id = s.id
JOIN users u ON s.id = u.id
JOIN courses c ON lr.course_id = c.id
WHERE lr.status = 'pending'
ORDER BY lr.created_at ASC;

-- name: GetLibretaRequestStatus :one
SELECT status FROM libreta_requests WHERE id = $1 LIMIT 1;

-- name: ApproveLibretaRequest :execrows
UPDATE libreta_requests
SET status = 'approved', reviewed_at = NOW(), reviewed_by = $2
WHERE id = $1 AND status = 'pending';

-- name: RejectLibretaRequest :execrows
UPDATE libreta_requests
SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $2
WHERE id = $1 AND status = 'pending';
