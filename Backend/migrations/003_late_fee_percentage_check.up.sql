-- 003_late_fee_percentage_check.up.sql
-- Candado en BD: un recargo porcentual no puede superar 100%.
-- El service ya valida esto (400 INVALID_LATE_FEE); esto es la última línea
-- contra escritura directa o bypass futuro de la API.

ALTER TABLE institute_settings
ADD CONSTRAINT chk_late_fee_percentage_max
CHECK (late_fee_kind != 'porcentaje' OR late_fee_value <= 100);
