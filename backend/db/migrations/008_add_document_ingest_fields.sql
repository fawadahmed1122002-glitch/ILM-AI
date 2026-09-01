-- Migration 008: Document ingestion job fields
-- Extends the existing documents table (the ingestion status pattern:
-- pending/processing/ready/failed with UNIQUE(subject, chapter_number))
-- so the admin ingestion UI can show why a job failed and when it ended.
--
-- Idempotent: uses IF NOT EXISTS throughout.

BEGIN;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

COMMIT;
