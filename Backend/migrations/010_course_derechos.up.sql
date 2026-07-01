-- ----------------------------------------------------------------
-- 010 — Derechos automáticos por curso
--
-- (a) Precios opcionales de inscripción y examen en el curso. Si están
--     cargados, el job de derechos los cobra automáticamente (feb / jul / nov).
-- (b) La restricción única (student, course, month, year) cubría TODOS los
--     tipos, así que un derecho con mes de período chocaría con la cuota
--     mensual del mismo mes. Se reemplaza por índices parciales por tipo.
-- ----------------------------------------------------------------

ALTER TABLE courses ADD COLUMN IF NOT EXISTS inscripcion_price NUMERIC(10,2);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS examen_price NUMERIC(10,2);

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_student_id_course_id_month_year_key;

-- Cuota mensual: una por alumno/curso/mes/año.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_cuota_mensual
  ON payments (student_id, course_id, month, year)
  WHERE type = 'cuota_mensual';

-- Derechos: uno por alumno/curso/tipo/mes-de-período/año (inscripción=feb,
-- examen=jul y nov). Los derechos manuales (month NULL) no deduplican.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_derecho
  ON payments (student_id, course_id, type, month, year)
  WHERE type IN ('derecho_inscripcion', 'derecho_examen');
