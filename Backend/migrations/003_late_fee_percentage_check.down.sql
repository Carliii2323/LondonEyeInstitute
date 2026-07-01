-- 003_late_fee_percentage_check.down.sql

ALTER TABLE institute_settings
DROP CONSTRAINT IF EXISTS chk_late_fee_percentage_max;
