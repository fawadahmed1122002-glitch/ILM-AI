-- Migration 007: allow 'expired' on attempt status CHECK constraints.
--
-- The abandoned-attempt expiry sweeps mark timed-out attempts as
-- 'expired': mock_tests already had a sweep writing this value (the
-- CHECK here was out of sync with it), and past_paper_attempts gets the
-- same sweep in this change. Idempotent: DROP IF EXISTS + re-ADD.

BEGIN;

ALTER TABLE mock_tests DROP CONSTRAINT IF EXISTS mock_tests_status_check;
ALTER TABLE mock_tests
    ADD CONSTRAINT mock_tests_status_check
    CHECK (status IN ('in_progress', 'completed', 'expired'));

ALTER TABLE past_paper_attempts DROP CONSTRAINT IF EXISTS past_paper_attempts_status_check;
ALTER TABLE past_paper_attempts
    ADD CONSTRAINT past_paper_attempts_status_check
    CHECK (status IN ('in_progress', 'completed', 'expired'));

COMMIT;
