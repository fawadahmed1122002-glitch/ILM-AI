-- ============================================================
-- Migration 010 · Registration diagnostic (track selection)
-- Adds optional onboarding profile columns used by the post-signup
-- diagnostic screen (and the /settings page, which reuses it):
--   target_tracks           -- product ids from PRODUCT_CATALOG the
--                              student is prepping for (ecat / mdcat /
--                              nust / fast); multiple allowed since a
--                              student may prep for both ECAT and NUST NET
--   current_class           -- '11', '12', or 'other'
--   diagnostic_completed_at -- when the student last saved the form
-- Purely personalization data -- NOT consulted by tier-gating or
-- subject-access logic. All nullable with no default so existing users
-- keep NULL and are never forced through the flow.
-- Idempotent: safe to re-run.
-- ============================================================

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS target_tracks VARCHAR(30)[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_class VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS diagnostic_completed_at TIMESTAMPTZ;

-- ADD CONSTRAINT has no IF NOT EXISTS form -- guard via pg_constraint.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_current_class_check'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_current_class_check
            CHECK (current_class IN ('11', '12', 'other'));
    END IF;
END
$$;

COMMIT;
