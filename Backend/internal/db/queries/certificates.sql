-- name: GetUnpaidMonthlyByStatus :many
-- Cuotas mensuales EXISTENTES del año que NO están approved, agrupadas por estado.
-- Si devuelve 0 filas → el alumno es elegible. Las cuotas inexistentes
-- (ej. inscripto a mitad de año) no aparecen, así que no bloquean.
SELECT status, COUNT(*) AS count
FROM payments
WHERE student_id = $1 AND course_id = $2 AND type = 'cuota_mensual'
  AND year = $3 AND status NOT IN ('approved', 'anulado')
GROUP BY status;

-- name: InsertCertificate :one
INSERT INTO certificates (student_id, course_id, year, avg_grade, attendance_pct, presential_hours)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- name: ListCertificates :many
SELECT
    cert.id, cert.student_id, cert.course_id, cert.year, cert.issued_at,
    cert.avg_grade, cert.attendance_pct, cert.presential_hours, cert.status,
    u.first_name, u.last_name, s.dni,
    c.name AS course_name
FROM certificates cert
JOIN students s ON cert.student_id = s.id
JOIN users u ON s.id = u.id
JOIN courses c ON cert.course_id = c.id
ORDER BY cert.issued_at DESC;

-- name: ListCertificatesByStudent :many
SELECT
    cert.id, cert.course_id, cert.year, cert.issued_at,
    cert.avg_grade, cert.attendance_pct, cert.presential_hours, cert.status,
    c.name AS course_name
FROM certificates cert
JOIN courses c ON cert.course_id = c.id
WHERE cert.student_id = $1
ORDER BY cert.year DESC;

-- name: GetCertificateByID :one
SELECT
    cert.id, cert.student_id, cert.course_id, cert.year, cert.issued_at,
    cert.avg_grade, cert.attendance_pct, cert.presential_hours, cert.status,
    u.first_name, u.last_name, s.dni,
    c.name AS course_name, c.level AS course_level
FROM certificates cert
JOIN students s ON cert.student_id = s.id
JOIN users u ON s.id = u.id
JOIN courses c ON cert.course_id = c.id
WHERE cert.id = $1 LIMIT 1;

-- name: DeleteCertificate :execrows
-- Borrado FISICO. Se usa para certificados emitidos por error: si no, se
-- acumulan y ocupan lugar. La UI pide confirmacion antes de llamar.
DELETE FROM certificates WHERE id = $1;
