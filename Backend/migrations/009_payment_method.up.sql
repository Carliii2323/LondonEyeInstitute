-- ----------------------------------------------------------------
-- 009 — Medio de pago (opcional)
--
-- Se registra al marcar un pago como pagado (registrar/aprobar). Opcional:
-- transferencia o efectivo. NULL = sin especificar.
-- ----------------------------------------------------------------

ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT
  CHECK (payment_method IS NULL OR payment_method IN ('transferencia', 'efectivo'));
