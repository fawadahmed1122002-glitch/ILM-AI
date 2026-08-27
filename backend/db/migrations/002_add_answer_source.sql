-- ============================================================
-- Migration 002 · Add answer_source provenance column
-- to past_paper_questions. Idempotent: safe to re-run.
-- ============================================================

BEGIN;

ALTER TABLE past_paper_questions
    ADD COLUMN IF NOT EXISTS answer_source VARCHAR(50);

COMMIT;
