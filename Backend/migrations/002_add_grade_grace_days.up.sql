-- 002_add_grade_grace_days.up.sql
-- Agrega la ventana de gracia para cargar notas del año anterior durante enero.
-- Permite que un docente cierre notas pendientes del año que cerró,
-- durante los primeros N días de enero. Configurable sin redeploy.

ALTER TABLE institute_settings
ADD COLUMN grade_grace_days_january INT NOT NULL DEFAULT 31;
