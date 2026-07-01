-- name: UpsertSession :one
INSERT INTO attendance_sessions (course_id, date, created_by)
VALUES ($1, $2, $3)
ON CONFLICT (course_id, date) DO UPDATE
    SET created_at = attendance_sessions.created_at
RETURNING id, course_id, date, created_by, created_at;

-- name: GetSessionRecords :many
SELECT
    ar.id, ar.student_id, ar.status, ar.observation,
    u.first_name, u.last_name,
    s.dni
FROM attendance_records ar
JOIN students s ON ar.student_id = s.id
JOIN users u ON s.id = u.id
WHERE ar.session_id = $1
ORDER BY u.last_name, u.first_name;

-- name: UpsertAttendanceRecord :exec
INSERT INTO attendance_records (session_id, student_id, status, observation)
VALUES ($1, $2, $3, $4)
ON CONFLICT (session_id, student_id) DO UPDATE SET
    status      = EXCLUDED.status,
    observation = EXCLUDED.observation,
    updated_at  = NOW();

-- name: GetAttendanceHistory :many
SELECT
    ar.status, ar.observation,
    ases.date, ases.course_id,
    c.name AS course_name
FROM attendance_records ar
JOIN attendance_sessions ases ON ar.session_id = ases.id
JOIN courses c ON ases.course_id = c.id
WHERE ar.student_id = $1
    AND ($2 = '' OR ases.course_id::text = $2)
ORDER BY ases.date DESC;

-- name: GetAnnualAttendance :many
SELECT
    ar.student_id, ar.status,
    ases.date,
    u.first_name, u.last_name,
    s.dni
FROM attendance_records ar
JOIN attendance_sessions ases ON ar.session_id = ases.id
JOIN students s ON ar.student_id = s.id
JOIN users u ON s.id = u.id
WHERE ases.course_id = $1
    AND EXTRACT(YEAR FROM ases.date) = $2::int
ORDER BY u.last_name, u.first_name, ases.date;

-- name: GetSessionByCourseAndDate :one
SELECT id, course_id, date, created_by, created_at
FROM attendance_sessions
WHERE course_id = $1 AND date = $2
LIMIT 1;
