-- name: GetGradesByCourseAndYear :many
SELECT
    g.id, g.student_id, g.course_id, g.year, g.term,
    g.reading, g.listening, g.speaking, g.writing,
    g.created_at, g.updated_at,
    u.first_name, u.last_name,
    s.dni
FROM grades g
JOIN students s ON g.student_id = s.id
JOIN users u ON s.id = u.id
WHERE g.course_id = $1 AND g.year = $2
ORDER BY u.last_name, u.first_name, g.term;

-- name: GetGradesByStudentAndCourse :many
SELECT
    g.id, g.student_id, g.course_id, g.year, g.term,
    g.reading, g.listening, g.speaking, g.writing,
    g.created_at, g.updated_at,
    u.first_name, u.last_name,
    s.dni
FROM grades g
JOIN students s ON g.student_id = s.id
JOIN users u ON s.id = u.id
WHERE g.student_id = $1 AND g.course_id = $2
ORDER BY g.year DESC, g.term;

-- name: UpsertGrade :exec
INSERT INTO grades (
    student_id, course_id, year, term,
    reading, listening, speaking, writing
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (student_id, course_id, year, term) DO UPDATE SET
    reading   = EXCLUDED.reading,
    listening = EXCLUDED.listening,
    speaking  = EXCLUDED.speaking,
    writing   = EXCLUDED.writing,
    updated_at = NOW();

-- name: GetGradesForCertificate :many
-- Notas por término de un alumno en un curso/año (para el promedio del certificado).
SELECT term, reading, listening, speaking, writing
FROM grades
WHERE student_id = $1 AND course_id = $2 AND year = $3;
