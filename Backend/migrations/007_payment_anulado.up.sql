-- ----------------------------------------------------------------
-- 007 — Estado 'anulado' para pagos
--
-- Permite anular cuotas/cargos creados por error o de alumnos dados de baja,
-- conservando el registro (no se borra). Las anuladas NO cuentan como deuda ni
-- bloquean la elegibilidad de certificados (ver GetUnpaidMonthlyByStatus).
-- ----------------------------------------------------------------

ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'anulado';
