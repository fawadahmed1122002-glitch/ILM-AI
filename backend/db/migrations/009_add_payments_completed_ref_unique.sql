-- ============================================================
-- Migration 009 · Webhook idempotency constraint
-- Partial unique index on payments.transaction_ref so a completed
-- payment can never be recorded twice for the same transaction_ref
-- (replayed or concurrent Safepay webhooks). NULL refs and
-- non-completed rows are excluded from the uniqueness check.
-- Idempotent: safe to re-run.
-- ============================================================

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_completed_transaction_ref
    ON payments(transaction_ref)
    WHERE transaction_ref IS NOT NULL AND status = 'completed';

COMMIT;
