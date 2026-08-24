-- name: GetDashboardStats :one
SELECT
    (SELECT COUNT(DISTINCT student_id) FROM enrollments WHERE status = 'active') AS active_students,
    (SELECT COUNT(*) FROM courses WHERE status IN ('activo', 'cupo_completo')) AS active_courses,
    (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND status = 'active') AS active_teachers,
    (SELECT COALESCE(SUM(amount), 0)::numeric FROM payments
        WHERE type = 'cuota_mensual' AND month = $1::int AND year = $2::int AND status = 'approved') AS collected,
    (SELECT COALESCE(SUM(amount + late_fee_applied), 0)::numeric FROM payments
        WHERE type = 'cuota_mensual' AND month = $1::int AND year = $2::int AND status = 'pending') AS pending_amount,
    (SELECT COALESCE(SUM(amount + late_fee_applied), 0)::numeric FROM payments
        WHERE type = 'cuota_mensual' AND month = $1::int AND year = $2::int AND status = 'overdue') AS overdue_amount,
    (SELECT COALESCE(SUM(amount), 0)::numeric FROM payments
        WHERE type = 'cargo_adicional'
          AND EXTRACT(MONTH FROM due_date) = $1::int
          AND EXTRACT(YEAR FROM due_date) = $2::int
          AND status = 'approved') AS other_collected;

-- name: EnrollmentsSeries :many
-- Inscripciones por mes desde $1 (primer día del mes N-1 meses atrás).
-- El service completa los meses sin datos con 0.
SELECT to_char(date_trunc('month', enrolled_at), 'YYYY-MM') AS month, COUNT(*) AS count
FROM enrollments
WHERE enrolled_at >= $1::date
GROUP BY 1
ORDER BY 1;

-- name: ListRecentEnrollments :many
SELECT e.enrolled_at, u.first_name, u.last_name, c.name AS course_name
FROM enrollments e
JOIN students s ON e.student_id = s.id
JOIN users u ON s.id = u.id
JOIN courses c ON e.course_id = c.id
WHERE e.status = 'active'
ORDER BY e.enrolled_at DESC
LIMIT $1;

-- name: ListRecentSubmittedReceipts :many
SELECT p.receipt_uploaded_at, p.month, p.year, u.first_name, u.last_name, c.name AS course_name
FROM payments p
JOIN students s ON p.student_id = s.id
JOIN users u ON s.id = u.id
JOIN courses c ON p.course_id = c.id
WHERE p.receipt_uploaded_at IS NOT NULL AND p.status = 'submitted'
ORDER BY p.receipt_uploaded_at DESC
LIMIT $1;

-- name: ListRecentApprovedPayments :many
SELECT p.reviewed_at, p.month, p.year, u.first_name, u.last_name, c.name AS course_name
FROM payments p
JOIN students s ON p.student_id = s.id
JOIN users u ON s.id = u.id
JOIN courses c ON p.course_id = c.id
WHERE p.status = 'approved' AND p.reviewed_at IS NOT NULL
ORDER BY p.reviewed_at DESC
LIMIT $1;

-- name: ListUpcomingEvents :many
SELECT e.id, e.title, e.type, e.date, e.start_time, e.course_id, c.name AS course_name
FROM calendar_events e
LEFT JOIN courses c ON e.course_id = c.id
WHERE e.date >= CURRENT_DATE
ORDER BY e.date, e.start_time NULLS FIRST
LIMIT $1;
