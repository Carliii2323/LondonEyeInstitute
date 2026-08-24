-- ----------------------------------------------------------------
-- 012 — Fecha de nacimiento del estudiante (opcional)
-- Habilita mostrar la edad calculada en el detalle del alumno.
-- ----------------------------------------------------------------

ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date DATE;
