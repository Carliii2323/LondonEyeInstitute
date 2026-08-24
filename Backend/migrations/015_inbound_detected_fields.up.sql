-- ----------------------------------------------------------------
-- Campos detectados del cuerpo del mail para sugerir la vinculación:
-- DNI y monto extraídos por el poller (B.3). Son solo ayuda: el admin
-- confirma. No se usan para auto-aprobar.
-- ----------------------------------------------------------------

ALTER TABLE inbound_receipts
  ADD COLUMN detected_dni    TEXT           NOT NULL DEFAULT '',
  ADD COLUMN detected_amount NUMERIC(10,2);
