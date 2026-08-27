-- Migration 005: Study Chat tables
-- Persistent, RAG-grounded follow-up chat tied to a topic explanation.
--
-- Conventions (matching schema.sql): UUID PKs via uuid_generate_v4(),
-- TIMESTAMPTZ NOT NULL DEFAULT NOW(), ON DELETE CASCADE FKs,
-- CHECK constraints for enum-like columns.
--
-- Idempotent: uses IF NOT EXISTS throughout.

BEGIN;

CREATE TABLE IF NOT EXISTS study_chat_threads (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
    subject     VARCHAR(100) NOT NULL,
    topic       VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_study_chat_thread UNIQUE (user_id, subject, topic)
);

CREATE TABLE IF NOT EXISTS study_chat_messages (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id        UUID NOT NULL REFERENCES study_chat_threads(id) ON DELETE CASCADE,
    role             VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content          TEXT NOT NULL,
    chunks_used_json JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_chat_threads_user
    ON study_chat_threads (user_id);
CREATE INDEX IF NOT EXISTS idx_study_chat_messages_thread
    ON study_chat_messages (thread_id, created_at);

COMMIT;
