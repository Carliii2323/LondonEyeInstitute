-- ----------------------------------------------------------------
-- 008 — Derechos del instituto como tipos de pago
--
-- Los "derechos" reemplazan en la UI al cargo_adicional genérico:
--   derecho_inscripcion → se cobra en febrero (1× al año)
--   derecho_examen      → se cobra en julio y noviembre/diciembre
-- Los crea el admin por curso (a todos los alumnos), con monto por curso.
-- cargo_adicional se conserva en el modelo (para cobros sueltos) pero sale
-- de la UI.
-- ----------------------------------------------------------------

ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'derecho_inscripcion';
ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'derecho_examen';
