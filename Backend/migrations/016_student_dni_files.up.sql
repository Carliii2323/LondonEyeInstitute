-- ----------------------------------------------------------------
-- Archivos del DNI del alumno (frente y dorso). Se guardan en el storage
-- (subdir 'dni') y se sirven solo por endpoint autenticado (dato sensible).
-- ----------------------------------------------------------------

ALTER TABLE students
  ADD COLUMN dni_front_url TEXT,
  ADD COLUMN dni_back_url  TEXT;
