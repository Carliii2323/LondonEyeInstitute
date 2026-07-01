-- ----------------------------------------------------------------
-- 011 — Clave de Google Classroom por curso
--
-- Campo opcional: el admin lo carga en el curso y el alumno lo ve en su Home.
-- ----------------------------------------------------------------

ALTER TABLE courses ADD COLUMN IF NOT EXISTS classroom_code TEXT;
