-- name: InsertMonthlyPayment :exec
INSERT INTO payments (student_id, course_id, type, month, year, amount, due_date, status)
VALUES ($1, $2, 'cuota_mensual', $3, $4, $5, $6, 'pending')
ON CONFLICT (student_id, course_id, month, year) WHERE type = 'cuota_mensual' DO NOTHING;

-- name: ListPayments :many
SELECT
    p.id, p.student_id, p.course_id, p.type, p.month, p.year,
    p.amount, p.due_date, p.status, p.late_fee_applied,
    p.receipt_url, p.payment_method, p.created_at,
    u.first_name, u.last_name, s.dni,
    c.name AS course_name
FROM payments p
JOIN students s ON p.student_id = s.id
JOIN users u ON s.id = u.id
JOIN courses c ON p.course_id = c.id
WHERE
    ($1 = '' OR p.student_id::text = $1)
    AND ($2 = '' OR p.course_id::text = $2)
    AND ($3 = '' OR p.status::text = $3)
    AND ($4 = '' OR p.type::text = $4)
    AND ($5::int = 0 OR p.month = $5::int)
    AND ($6::int = 0 OR p.year = $6::int)
    AND ($7 = '' OR (u.first_name || ' ' || u.last_name) ILIKE '%' || $7 || '%' OR s.dni ILIKE '%' || $7 || '%')
ORDER BY p.year DESC, p.month DESC NULLS LAST, p.created_at DESC
LIMIT $8 OFFSET $9;

-- name: CountPayments :one
SELECT COUNT(*)
FROM payments p
JOIN students s ON p.student_id = s.id
JOIN users u ON s.id = u.id
WHERE
    ($1 = '' OR p.student_id::text = $1)
    AND ($2 = '' OR p.course_id::text = $2)
    AND ($3 = '' OR p.status::text = $3)
    AND ($4 = '' OR p.type::text = $4)
    AND ($5::int = 0 OR p.month = $5::int)
    AND ($6::int = 0 OR p.year = $6::int)
    AND ($7 = '' OR (u.first_name || ' ' || u.last_name) ILIKE '%' || $7 || '%' OR s.dni ILIKE '%' || $7 || '%');

-- name: ListReviewedPayments :many
-- Historial de revisiones: pagos que el admin revisó/registró (reviewed_at set),
-- filtrable por mes/año de la revisión. Muestra de quién viene (alumno).
SELECT
    p.id, p.student_id, p.course_id, p.type, p.month, p.year,
    p.amount, p.late_fee_applied, p.status, p.payment_method,
    p.reviewed_at, p.rejection_reason,
    u.first_name, u.last_name, s.dni,
    c.name AS course_name
FROM payments p
JOIN students s ON p.student_id = s.id
JOIN users u ON s.id = u.id
JOIN courses c ON p.course_id = c.id
WHERE p.reviewed_at IS NOT NULL
    AND ($1::int = 0 OR EXTRACT(YEAR FROM p.reviewed_at) = $1::int)
    AND ($2::int = 0 OR EXTRACT(MONTH FROM p.reviewed_at) = $2::int)
ORDER BY p.reviewed_at DESC;

-- name: ListPendingReceipts :many
SELECT
    p.id, p.student_id, p.course_id, p.type, p.month, p.year,
    p.amount, p.due_date, p.status, p.late_fee_applied,
    p.receipt_url, p.receipt_uploaded_at, p.created_at,
    u.first_name, u.last_name, s.dni,
    c.name AS course_name
FROM payments p
JOIN students s ON p.student_id = s.id
JOIN users u ON s.id = u.id
JOIN courses c ON p.course_id = c.id
WHERE p.status = 'submitted'
ORDER BY p.receipt_uploaded_at ASC;

-- name: GetPaymentByID :one
SELECT id, student_id, course_id, type, month, year, amount, due_date,
    status, observation, receipt_url, receipt_uploaded_at,
    reviewed_by, reviewed_at, rejection_reason, late_fee_applied,
    created_at, updated_at
FROM payments
WHERE id = $1 LIMIT 1;

-- name: GetPaymentDetail :one
SELECT
    p.id, p.student_id, p.course_id, p.type, p.month, p.year,
    p.amount, p.due_date, p.status, p.observation,
    p.receipt_url, p.receipt_uploaded_at,
    p.reviewed_by, p.reviewed_at, p.rejection_reason, p.late_fee_applied,
    p.payment_method, p.created_at, p.updated_at,
    u.first_name, u.last_name, s.dni,
    c.name AS course_name
FROM payments p
JOIN students s ON p.student_id = s.id
JOIN users u ON s.id = u.id
JOIN courses c ON p.course_id = c.id
WHERE p.id = $1 LIMIT 1;

-- name: ListPaymentsByStudent :many
SELECT
    p.id, p.course_id, p.type, p.month, p.year,
    p.amount, p.due_date, p.status, p.late_fee_applied,
    p.receipt_url, p.rejection_reason, p.created_at,
    c.name AS course_name
FROM payments p
JOIN courses c ON p.course_id = c.id
WHERE p.student_id = $1
ORDER BY p.year DESC, p.month DESC NULLS LAST, p.created_at DESC;

-- name: UpsertPaidMonthlyPayment :exec
-- Crea (o marca pagada si ya existía) la cuota mensual de un mes/año, para el
-- pago adelantado. No pisa el monto de una cuota preexistente.
INSERT INTO payments (student_id, course_id, type, month, year, amount, due_date, status, reviewed_by, reviewed_at, payment_method)
VALUES ($1, $2, 'cuota_mensual', $3, $4, $5, $6, 'approved', $7, NOW(), $8)
ON CONFLICT (student_id, course_id, month, year) WHERE type = 'cuota_mensual'
DO UPDATE SET status = 'approved', reviewed_by = $7, reviewed_at = NOW(),
              payment_method = $8, updated_at = NOW();

-- name: GetCoursePriceMonthly :one
SELECT price_monthly FROM courses WHERE id = $1;

-- name: InsertAdditionalCharge :one
INSERT INTO payments (student_id, course_id, type, year, amount, due_date, status, observation)
VALUES ($1, $2, 'cargo_adicional', $3, $4, $5, 'pending', $6)
RETURNING id;

-- name: InsertCourseCharge :execrows
-- Crea un cobro (derecho) 'pending' para CADA inscripción activa del curso.
-- Devuelve la cantidad de cobros creados.
INSERT INTO payments (student_id, course_id, type, year, amount, due_date, status, observation)
SELECT e.student_id, sqlc.arg(course_id), sqlc.arg(charge_type), sqlc.arg(year),
       sqlc.arg(amount), sqlc.arg(due_date), 'pending', sqlc.arg(observation)
FROM enrollments e
WHERE e.course_id = sqlc.arg(course_id) AND e.status = 'active';

-- name: ApprovePayment :execrows
-- Registrar/aprobar un pago: cuotas por pagar, vencidas, con comprobante en
-- revisión o incluso rechazadas (el admin lo registra como pagado por fuera).
-- $3 = medio de pago opcional (NULL = sin especificar).
UPDATE payments
SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(),
    payment_method = $3, updated_at = NOW()
WHERE id = $1 AND status IN ('pending', 'submitted', 'overdue', 'rejected');

-- name: AnnulPayment :execrows
-- Anula un pago (errores / dados de baja). No se anula uno aprobado ni uno ya anulado.
UPDATE payments
SET status = 'anulado', updated_at = NOW()
WHERE id = $1 AND status NOT IN ('approved', 'anulado');

-- name: RejectPayment :execrows
UPDATE payments
SET status = 'rejected', rejection_reason = $2, reviewed_by = $3,
    reviewed_at = NOW(), updated_at = NOW()
WHERE id = $1 AND status = 'submitted';

-- name: SubmitReceipt :execrows
UPDATE payments
SET receipt_url = $2, receipt_uploaded_at = NOW(), status = 'submitted', updated_at = NOW()
WHERE id = $1 AND status IN ('pending', 'overdue', 'rejected');

-- name: GenerateMonthlyInvoices :execrows
-- Inserta una cuota del mes para cada inscripción activa, con el precio del curso.
-- ON CONFLICT DO NOTHING lo hace idempotente: si la cuota del mes ya existe, no duplica.
INSERT INTO payments (student_id, course_id, type, month, year, amount, due_date, status)
SELECT e.student_id, e.course_id, 'cuota_mensual', $1::int, $2::int, c.price_monthly, $3::date, 'pending'
FROM enrollments e
JOIN courses c ON e.course_id = c.id
WHERE e.status = 'active'
  AND c.status <> 'inactivo'
ON CONFLICT (student_id, course_id, month, year) WHERE type = 'cuota_mensual' DO NOTHING;

-- name: GenerateInscripcionDerechos :execrows
-- Genera el derecho de inscripción (mes de período) para cada inscripción
-- activa de cursos que tengan inscripcion_price cargado. Idempotente.
INSERT INTO payments (student_id, course_id, type, month, year, amount, due_date, status)
SELECT e.student_id, e.course_id, 'derecho_inscripcion',
       sqlc.arg(period_month)::int, sqlc.arg(year)::int,
       c.inscripcion_price, sqlc.arg(due_date)::date, 'pending'
FROM enrollments e
JOIN courses c ON e.course_id = c.id
WHERE e.status = 'active' AND c.status <> 'inactivo' AND c.inscripcion_price IS NOT NULL
ON CONFLICT (student_id, course_id, type, month, year)
  WHERE type IN ('derecho_inscripcion', 'derecho_examen') DO NOTHING;

-- name: GenerateExamenDerechos :execrows
-- Genera el derecho de examen (mes de período) para cada inscripción activa de
-- cursos que tengan examen_price cargado. Idempotente. Se llama 2x al año.
INSERT INTO payments (student_id, course_id, type, month, year, amount, due_date, status)
SELECT e.student_id, e.course_id, 'derecho_examen',
       sqlc.arg(period_month)::int, sqlc.arg(year)::int,
       c.examen_price, sqlc.arg(due_date)::date, 'pending'
FROM enrollments e
JOIN courses c ON e.course_id = c.id
WHERE e.status = 'active' AND c.status <> 'inactivo' AND c.examen_price IS NOT NULL
ON CONFLICT (student_id, course_id, type, month, year)
  WHERE type IN ('derecho_inscripcion', 'derecho_examen') DO NOTHING;

-- name: MarkOverduePayments :execrows
-- Marca vencidas las cuotas/cargos pending cuyo due_date + grace_days ya pasó.
-- Calcula late_fee según institute_settings (porcentaje o fijo), redondeado a 2 decimales.
-- Solo afecta status='pending' → el recargo se aplica una sola vez (idempotente).
UPDATE payments p
SET status = 'overdue',
    late_fee_applied = ROUND(
        CASE
            WHEN s.late_fee_kind = 'porcentaje' THEN p.amount * s.late_fee_value / 100
            ELSE s.late_fee_value
        END, 2),
    updated_at = NOW()
FROM institute_settings s
WHERE s.id = 1
  AND p.status = 'pending'
  AND p.due_date + (s.grace_days || ' days')::interval < CURRENT_DATE;
