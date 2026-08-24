-- ----------------------------------------------------------------
-- Comprobantes recibidos por mail (bandeja de entrantes).
-- El poller IMAP inserta acá los adjuntos de los mails entrantes.
-- El admin los revisa y los vincula a un pago (pasa a revisión normal)
-- o los descarta. Los que no matchean un alumno por remitente quedan
-- 'sin_identificar'.
-- ----------------------------------------------------------------

CREATE TABLE inbound_receipts (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email          TEXT        NOT NULL,
  student_id          UUID        REFERENCES students(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,
  subject             TEXT        NOT NULL DEFAULT '',
  body_excerpt        TEXT        NOT NULL DEFAULT '',
  attachment_url      TEXT        NOT NULL,
  attachment_filename TEXT        NOT NULL DEFAULT '',
  message_uid         TEXT        NOT NULL UNIQUE,
  status              TEXT        NOT NULL DEFAULT 'sin_identificar'
                        CHECK (status IN ('sin_identificar', 'identificado', 'vinculado', 'descartado')),
  linked_payment_id   UUID        REFERENCES payments(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inbound_receipts_status ON inbound_receipts(status);
CREATE INDEX idx_inbound_receipts_student ON inbound_receipts(student_id);
