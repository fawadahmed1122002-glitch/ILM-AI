-- ============================================================
-- Migration 004 · Fix two source-extraction text artifacts in
-- the ECAT 2015 past paper (cosmetic, display text only).
--   Q38: missing "A =" prefix before the matrix literal
--   Q78: missing subscript 2 on Cl2
-- Only question_text changes; correct_option and every other
-- column are untouched. REPLACE() makes this idempotent.
-- ============================================================

BEGIN;

-- Q38: "If matrix [[0,0],[0,p]] then..." -> "If matrix A = [[0,0],[0,p]] then..."
UPDATE past_paper_questions
SET question_text = REPLACE(question_text,
    'If matrix [[0,0],[0,p]]',
    'If matrix A = [[0,0],[0,p]]')
WHERE paper_id = 'c5a16c38-cee4-4ff8-94a5-472b471074e8'
  AND question_number = 38;

-- Q78: "6NaOH + 3Cl ->" -> "6NaOH + 3Cl2 ->"
UPDATE past_paper_questions
SET question_text = REPLACE(question_text,
    '6NaOH + 3Cl ->',
    '6NaOH + 3Cl2 ->')
WHERE paper_id = 'c5a16c38-cee4-4ff8-94a5-472b471074e8'
  AND question_number = 78;

COMMIT;
