-- 002_add_grade_grace_days.down.sql

ALTER TABLE institute_settings
DROP COLUMN IF EXISTS grade_grace_days_january;
