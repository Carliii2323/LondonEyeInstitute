-- ----------------------------------------------------------------
-- 006 — Solicitudes de descarga de libreta (REPORT CARD)
--
-- La 1ra descarga de cada libreta (alumno + curso + año) es libre; para volver
-- a descargarla el alumno solicita autorización al admin, que la aprueba para
-- UN solo uso. Esta tabla modela ese ciclo:
--   pending   → solicitud esperando revisión del admin
--   approved  → autorizada (habilita una descarga)
--   rejected  → rechazada
--   consumed  → descarga ya usada (incluye la 1ra libre y cada autorización gastada)
-- ----------------------------------------------------------------

CREATE TABLE libreta_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID        NOT NULL REFERENCES students(id) DEFERRABLE INITIALLY IMMEDIATE,
  course_id   UUID        NOT NULL REFERENCES courses(id) DEFERRABLE INITIALLY IMMEDIATE,
  year        INT         NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected', 'consumed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID        REFERENCES users(id) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX idx_libreta_requests_libreta ON libreta_requests (student_id, course_id, year);

-- A lo sumo una solicitud pendiente por libreta (evita duplicados de pedido).
CREATE UNIQUE INDEX uq_libreta_requests_pending
  ON libreta_requests (student_id, course_id, year) WHERE status = 'pending';
