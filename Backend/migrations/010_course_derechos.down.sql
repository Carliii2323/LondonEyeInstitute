DROP INDEX IF EXISTS uq_payments_derecho;
DROP INDEX IF EXISTS uq_payments_cuota_mensual;
ALTER TABLE payments ADD CONSTRAINT payments_student_id_course_id_month_year_key
  UNIQUE (student_id, course_id, month, year);
ALTER TABLE courses DROP COLUMN IF EXISTS examen_price;
ALTER TABLE courses DROP COLUMN IF EXISTS inscripcion_price;
