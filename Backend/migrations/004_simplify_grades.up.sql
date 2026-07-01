-- ----------------------------------------------------------------
-- 004 — Notas alineadas a la planilla real del instituto.
--
-- La planilla tiene, por período (Julio=term 1, Diciembre=term 2):
--   R, L, S, W (una nota por skill) + un MAKE UP por período.
--
-- Cambios:
--   grades        -> una nota por skill por término (se quitan las _2,
--                    se renombran las _1 a su nombre base).
--   grade_makeups -> un recuperatorio POR término (antes era uno por año).
-- ----------------------------------------------------------------

-- grades: dejar una sola nota por skill
ALTER TABLE grades DROP COLUMN writing_2;
ALTER TABLE grades DROP COLUMN reading_2;
ALTER TABLE grades DROP COLUMN speaking_2;
ALTER TABLE grades DROP COLUMN listening_2;

ALTER TABLE grades RENAME COLUMN writing_1   TO writing;
ALTER TABLE grades RENAME COLUMN reading_1   TO reading;
ALTER TABLE grades RENAME COLUMN speaking_1  TO speaking;
ALTER TABLE grades RENAME COLUMN listening_1 TO listening;

-- grade_makeups: recuperatorio por término
ALTER TABLE grade_makeups ADD COLUMN term INT NOT NULL DEFAULT 1 CHECK (term IN (1, 2));
ALTER TABLE grade_makeups ALTER COLUMN term DROP DEFAULT;

ALTER TABLE grade_makeups DROP CONSTRAINT grade_makeups_student_id_course_id_year_key;
ALTER TABLE grade_makeups ADD CONSTRAINT grade_makeups_student_id_course_id_year_term_key
    UNIQUE (student_id, course_id, year, term);
