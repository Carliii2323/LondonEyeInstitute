-- ----------------------------------------------------------------
-- Verificación de email en el auto-registro (F1).
-- El alumno recibe un mail con un link; al verificar, se marca
-- users.email_verified = true. La aprobación del admin sigue siendo
-- necesaria para activar la cuenta (email_verified es control aparte).
-- ----------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;

-- Las cuentas ya existentes (creadas por el admin / seed) se consideran
-- verificadas: no se auto-registraron por el flujo público.
UPDATE users SET email_verified = true;

CREATE TABLE email_verification_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  token_hash TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
