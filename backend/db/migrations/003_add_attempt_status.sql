-- ============================================================
-- Migration 003 · Add status lifecycle column to
-- past_paper_attempts (matches mock_tests vocabulary:
-- 'in_progress' | 'completed'). Idempotent: safe to re-run.
-- ============================================================

BEGIN;

ALTER TABLE past_paper_attempts
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed'));

COMMIT;
