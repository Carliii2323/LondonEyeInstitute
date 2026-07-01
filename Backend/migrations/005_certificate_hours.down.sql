-- Reverso de 005.
ALTER TABLE certificates ALTER COLUMN avg_grade TYPE NUMERIC(4,2);
ALTER TABLE certificates DROP COLUMN presential_hours;
