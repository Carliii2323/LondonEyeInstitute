-- Interruptor del cobro automático (cuotas mensuales + derechos por cron).
-- Permite frenar/reanudar la facturación automática sin tocar código ni reiniciar:
--   make billing-status / make billing-off / make billing-on
-- El disparo MANUAL de los jobs sigue funcionando aunque esté apagado (mantenimiento).
ALTER TABLE institute_settings
  ADD COLUMN IF NOT EXISTS auto_billing_enabled BOOLEAN NOT NULL DEFAULT TRUE;
