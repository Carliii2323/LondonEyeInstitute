-- Reverso de 004.

ALTER TABLE grade_makeups DROP CONSTRAINT grade_makeups_student_id_course_id_year_term_key;
ALTER TABLE grade_makeups ADD CONSTRAINT grade_makeups_student_id_course_id_year_key
    UNIQUE (student_id, course_id, year);
ALTER TABLE grade_makeups DROP COLUMN term;

ALTER TABLE grades RENAME COLUMN writing   TO writing_1;
ALTER TABLE grades RENAME COLUMN reading   TO reading_1;
ALTER TABLE grades RENAME COLUMN speaking  TO speaking_1;
ALTER TABLE grades RENAME COLUMN listening TO listening_1;

ALTER TABLE grades ADD COLUMN writing_2   NUMERIC(4,2);
ALTER TABLE grades ADD COLUMN reading_2   NUMERIC(4,2);
ALTER TABLE grades ADD COLUMN speaking_2  NUMERIC(4,2);
ALTER TABLE grades ADD COLUMN listening_2 NUMERIC(4,2);
