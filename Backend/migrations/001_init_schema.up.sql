-- ============================================================
-- SGE London Eye — Migración inicial
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------
-- ENUMs
-- ----------------------------------------------------------------
CREATE TYPE user_role             AS ENUM ('admin', 'teacher', 'student');
CREATE TYPE user_status           AS ENUM ('active', 'pending', 'inactive');
CREATE TYPE course_level          AS ENUM ('ELEMENTAL A1', 'PRE-INTERMEDIO', 'INTERMEDIO', 'INTERMEDIO ALTO', 'C1 ADVANCED');
CREATE TYPE course_status         AS ENUM ('activo', 'cupo_completo', 'inactivo');
CREATE TYPE enrollment_status     AS ENUM ('active', 'dropped');
CREATE TYPE attendance_status     AS ENUM ('presente', 'ausente', 'justificado');
CREATE TYPE payment_type          AS ENUM ('cuota_mensual', 'cargo_adicional');
CREATE TYPE payment_status        AS ENUM ('pending', 'submitted', 'approved', 'rejected', 'overdue');
CREATE TYPE late_fee_kind         AS ENUM ('porcentaje', 'fijo');
CREATE TYPE notification_type     AS ENUM ('urgente', 'informativo', 'evento', 'archivado');
CREATE TYPE notification_audience AS ENUM ('todos', 'docentes', 'estudiantes', 'curso', 'estudiante_especifico', 'docente_especifico');
CREATE TYPE event_type            AS ENUM ('vencimiento', 'evento', 'feriado', 'otro');
CREATE TYPE certificate_status    AS ENUM ('issued');

-- ----------------------------------------------------------------
-- users
-- ----------------------------------------------------------------
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          user_role   NOT NULL,
  first_name    TEXT        NOT NULL,
  last_name     TEXT        NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  status        user_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- students
-- ----------------------------------------------------------------
CREATE TABLE students (
  id          UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  dni         TEXT        NOT NULL UNIQUE,
  address     TEXT,
  tutor_name  TEXT,
  tutor_phone TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- teachers
-- ----------------------------------------------------------------
CREATE TABLE teachers (
  id         UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  dni        TEXT        NOT NULL UNIQUE,
  join_date  DATE,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- courses
-- ----------------------------------------------------------------
CREATE TABLE courses (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT          NOT NULL,
  level         course_level  NOT NULL,
  schedule      TEXT          NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL,
  capacity      INT           NOT NULL,
  teacher_id    UUID          REFERENCES teachers(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,
  status        course_status NOT NULL DEFAULT 'activo',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- enrollments
-- ----------------------------------------------------------------
CREATE TABLE enrollments (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID              NOT NULL REFERENCES students(id) DEFERRABLE INITIALLY IMMEDIATE,
  course_id   UUID              NOT NULL REFERENCES courses(id) DEFERRABLE INITIALLY IMMEDIATE,
  enrolled_at TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  dropped_at  TIMESTAMPTZ,
  status      enrollment_status NOT NULL DEFAULT 'active'
);

-- Una sola inscripción activa por alumno/curso; la re-inscripción inserta una fila nueva
CREATE UNIQUE INDEX uq_enrollments_active ON enrollments (student_id, course_id) WHERE status = 'active';

-- ----------------------------------------------------------------
-- attendance_sessions
-- ----------------------------------------------------------------
CREATE TABLE attendance_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  UUID        NOT NULL REFERENCES courses(id) DEFERRABLE INITIALLY IMMEDIATE,
  date       DATE        NOT NULL,
  created_by UUID        NOT NULL REFERENCES users(id) DEFERRABLE INITIALLY IMMEDIATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, date)
);

-- ----------------------------------------------------------------
-- attendance_records
-- ----------------------------------------------------------------
CREATE TABLE attendance_records (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID              NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  student_id  UUID              NOT NULL REFERENCES students(id) DEFERRABLE INITIALLY IMMEDIATE,
  status      attendance_status NOT NULL,
  observation TEXT,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)
);

-- ----------------------------------------------------------------
-- grades
-- ----------------------------------------------------------------
CREATE TABLE grades (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID          NOT NULL REFERENCES students(id) DEFERRABLE INITIALLY IMMEDIATE,
  course_id   UUID          NOT NULL REFERENCES courses(id) DEFERRABLE INITIALLY IMMEDIATE,
  year        INT           NOT NULL,
  term        INT           NOT NULL CHECK (term IN (1, 2)),
  writing_1   NUMERIC(4,2),
  writing_2   NUMERIC(4,2),
  reading_1   NUMERIC(4,2),
  reading_2   NUMERIC(4,2),
  speaking_1  NUMERIC(4,2),
  speaking_2  NUMERIC(4,2),
  listening_1 NUMERIC(4,2),
  listening_2 NUMERIC(4,2),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id, year, term)
);

-- ----------------------------------------------------------------
-- grade_makeups
-- Recuperatorio anual: una sola nota por alumno/curso/año.
-- Si repite el recuperatorio, se hace un UPDATE (la nueva nota suplanta la anterior).
-- ----------------------------------------------------------------
CREATE TABLE grade_makeups (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID          NOT NULL REFERENCES students(id) DEFERRABLE INITIALLY IMMEDIATE,
  course_id  UUID          NOT NULL REFERENCES courses(id) DEFERRABLE INITIALLY IMMEDIATE,
  year       INT           NOT NULL,
  score      NUMERIC(4,2)  NOT NULL CHECK (score >= 0 AND score <= 10),
  taken_at   DATE,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id, year)
);

-- ----------------------------------------------------------------
-- payments
-- type = 'cuota_mensual': generado por cron, month siempre presente.
-- type = 'cargo_adicional': creado por admin, month = NULL (NULL ≠ NULL en PG → múltiples permitidos).
-- ----------------------------------------------------------------
CREATE TABLE payments (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID           NOT NULL REFERENCES students(id) DEFERRABLE INITIALLY IMMEDIATE,
  course_id           UUID           NOT NULL REFERENCES courses(id) DEFERRABLE INITIALLY IMMEDIATE,
  type                payment_type   NOT NULL DEFAULT 'cuota_mensual',
  month               INT            CHECK (month BETWEEN 1 AND 12),
  year                INT            NOT NULL,
  amount              NUMERIC(10,2)  NOT NULL,
  due_date            DATE           NOT NULL,
  status              payment_status NOT NULL DEFAULT 'pending',
  observation         TEXT,
  receipt_url         TEXT,
  receipt_uploaded_at TIMESTAMPTZ,
  reviewed_by         UUID           REFERENCES users(id) DEFERRABLE INITIALLY IMMEDIATE,
  reviewed_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  late_fee_applied    NUMERIC(10,2)  NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id, month, year)
);

-- ----------------------------------------------------------------
-- calendar_events
-- course_id NULL = evento general (feriados, fechas institucionales).
-- course_id NOT NULL = evento específico del curso.
-- ----------------------------------------------------------------
CREATE TABLE calendar_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  type       event_type  NOT NULL,
  date       DATE        NOT NULL,
  start_time TIME,
  end_time   TIME,
  message    TEXT,
  course_id  UUID        REFERENCES courses(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,
  created_by UUID        NOT NULL REFERENCES users(id) DEFERRABLE INITIALLY IMMEDIATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- notifications
-- audience_course_id: requerido si audience_type = 'curso'.
-- audience_user_id:   requerido si audience_type IN ('estudiante_especifico', 'docente_especifico').
-- ----------------------------------------------------------------
CREATE TABLE notifications (
  id                 UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT                  NOT NULL,
  message            TEXT                  NOT NULL,
  type               notification_type     NOT NULL,
  audience_type      notification_audience NOT NULL,
  audience_course_id UUID                  REFERENCES courses(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,
  audience_user_id   UUID                  REFERENCES users(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,
  created_by         UUID                  NOT NULL REFERENCES users(id) DEFERRABLE INITIALLY IMMEDIATE,
  created_at         TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_notifications_audience CHECK (
    (audience_type IN ('todos', 'docentes', 'estudiantes')
       AND audience_course_id IS NULL AND audience_user_id IS NULL)
    OR
    (audience_type = 'curso'
       AND audience_course_id IS NOT NULL AND audience_user_id IS NULL)
    OR
    (audience_type IN ('estudiante_especifico', 'docente_especifico')
       AND audience_course_id IS NULL AND audience_user_id IS NOT NULL)
  )
);

-- ----------------------------------------------------------------
-- certificates
-- Emitido solo cuando todos los cuota_mensual del curso/año están aprobados.
-- El admin gestiona notas y da el OK; el sistema valida el estado de pagos.
-- ----------------------------------------------------------------
CREATE TABLE certificates (
  id             UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID               NOT NULL REFERENCES students(id) DEFERRABLE INITIALLY IMMEDIATE,
  course_id      UUID               NOT NULL REFERENCES courses(id) DEFERRABLE INITIALLY IMMEDIATE,
  year           INT                NOT NULL,
  issued_at      DATE               NOT NULL DEFAULT CURRENT_DATE,
  avg_grade      NUMERIC(4,2),
  attendance_pct NUMERIC(5,2),
  status         certificate_status NOT NULL DEFAULT 'issued',
  created_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id, year)
);

-- ----------------------------------------------------------------
-- refresh_tokens
-- ----------------------------------------------------------------
CREATE TABLE refresh_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  token_hash TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- institute_settings (fila única, id siempre = 1)
-- no_payment_months: meses sin cuota mensual (por defecto julio = vacaciones de invierno).
-- ----------------------------------------------------------------
CREATE TABLE institute_settings (
  id                INT           PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name              TEXT          NOT NULL DEFAULT 'London Eye English Institute',
  legal_name        TEXT,
  cuit              TEXT,
  phone             TEXT,
  address           TEXT,
  email             TEXT,
  monthly_due_day   INT           NOT NULL DEFAULT 10,
  grace_days        INT           NOT NULL DEFAULT 5,
  late_fee_kind     late_fee_kind NOT NULL DEFAULT 'porcentaje',
  late_fee_value    NUMERIC(10,2) NOT NULL DEFAULT 10,
  no_payment_months INT[]         NOT NULL DEFAULT '{7}',
  cbu               TEXT,
  alias             TEXT,
  account_holder    TEXT,
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

INSERT INTO institute_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

COMMENT ON COLUMN payments.month IS
  'NULL para cargo_adicional. NULL != NULL en UNIQUE permite múltiples cargos por (student_id, course_id, year) sin colisión.';

-- ----------------------------------------------------------------
-- Índices
-- ----------------------------------------------------------------
CREATE INDEX idx_users_email              ON users(email);
CREATE INDEX idx_students_dni             ON students(dni);
CREATE INDEX idx_enrollments_student      ON enrollments(student_id) WHERE status = 'active';
CREATE INDEX idx_enrollments_course       ON enrollments(course_id)  WHERE status = 'active';
CREATE INDEX idx_att_sessions_course_date ON attendance_sessions(course_id, date);
CREATE INDEX idx_att_records_student      ON attendance_records(student_id);
CREATE INDEX idx_grades_student_course    ON grades(student_id, course_id, year);
CREATE INDEX idx_grade_makeups_student    ON grade_makeups(student_id, course_id, year);
CREATE INDEX idx_payments_student         ON payments(student_id);
CREATE INDEX idx_payments_status          ON payments(status);
CREATE INDEX idx_payments_due_date        ON payments(due_date) WHERE status IN ('pending', 'overdue');
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_calendar_events_date     ON calendar_events(date);
CREATE INDEX idx_calendar_events_course   ON calendar_events(course_id) WHERE course_id IS NOT NULL;
