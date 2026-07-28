-- =====================================================================
-- 122_add_course_period.sql
-- =====================================================================
-- ANEC report item #4: the candidate cadastro needs a field for which
-- year/period (semester) of the course the student is currently in.
-- Free text so it fits any format ("3º período", "2º ano", "2024/1", …).
-- =====================================================================
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS course_period text;
