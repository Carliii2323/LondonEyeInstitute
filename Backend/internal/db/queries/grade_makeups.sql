-- name: GetMakeupByCourseAndYear :many
SELECT
    gm.id, gm.student_id, gm.course_id, gm.year, gm.term, gm.score, gm.taken_at,
    u.first_name, u.last_name,
    s.dni
FROM grade_makeups gm
JOIN students s ON gm.student_id = s.id
JOIN users u ON s.id = u.id
WHERE gm.course_id = $1 AND gm.year = $2
ORDER BY u.last_name, u.first_name, gm.term;

-- name: GetMakeupByStudent :many
SELECT
    gm.id, gm.student_id, gm.course_id, gm.year, gm.term, gm.score, gm.taken_at,
    c.name AS course_name
FROM grade_makeups gm
JOIN courses c ON gm.course_id = c.id
WHERE gm.student_id = $1
ORDER BY gm.year DESC, gm.term;

-- name: UpsertGradeMakeup :exec
INSERT INTO grade_makeups (student_id, course_id, year, term, score, taken_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (student_id, course_id, year, term) DO UPDATE SET
    score    = EXCLUDED.score,
    taken_at = EXCLUDED.taken_at;
