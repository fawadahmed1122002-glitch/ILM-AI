-- ============================================================
-- Migration 006 · Add daily_chat_count to users for the free-tier
-- study-chat message limit (tier_gate.check_chat_limit). Matches
-- the daily_explain_count / daily_mcq_count columns. Idempotent:
-- safe to re-run.
-- ============================================================

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS daily_chat_count INTEGER NOT NULL DEFAULT 0;

COMMIT;
