-- ----------------------------------------------------------------
-- 005 — Certificado de estudios: horas presenciales + promedio como %
--
-- La planilla real del certificado lleva "promedio de ...%" y
-- "... hs presenciales". El promedio ahora se carga como porcentaje
-- (0–100), por lo que avg_grade pasa de NUMERIC(4,2) (máx 99.99) a (5,2).
-- ----------------------------------------------------------------

ALTER TABLE certificates ADD COLUMN presential_hours INT;
ALTER TABLE certificates ALTER COLUMN avg_grade TYPE NUMERIC(5,2);
