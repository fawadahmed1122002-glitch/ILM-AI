-- ============================================================
-- Migration 001 · Past Papers (4 new tables)
-- Conventions match backend/db/schema.sql: UUID PKs via
-- uuid_generate_v4(), TIMESTAMPTZ DEFAULT NOW(), CHAR(1) option
-- columns with CHECK constraints, idx_-prefixed indexes.
-- Idempotent: safe to re-run.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. PAST_PAPERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS past_papers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_type           VARCHAR(50)  NOT NULL,
    university          VARCHAR(120) NOT NULL,
    year                INTEGER      NOT NULL,
    phase               VARCHAR(30),
    total_questions     INTEGER      NOT NULL,
    duration_minutes    INTEGER      NOT NULL,
    source_pdf_filename VARCHAR(255) NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'verified', 'published')),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_past_papers_exam_year ON past_papers(exam_type, year);
CREATE INDEX IF NOT EXISTS idx_past_papers_status ON past_papers(status);

-- ------------------------------------------------------------
-- 2. PAST_PAPER_QUESTIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS past_paper_questions (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_id           UUID NOT NULL REFERENCES past_papers(id) ON DELETE CASCADE,
    question_number    INTEGER NOT NULL,
    question_text      TEXT NOT NULL,
    question_image_url VARCHAR(500),
    option_a           TEXT NOT NULL,
    option_b           TEXT NOT NULL,
    option_c           TEXT NOT NULL,
    option_d           TEXT NOT NULL,
    correct_option     CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
    subject_tag        VARCHAR(100),
    verified           BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (paper_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_pp_questions_paper ON past_paper_questions(paper_id);

-- ------------------------------------------------------------
-- 3. PAST_PAPER_ATTEMPTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS past_paper_attempts (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paper_id           UUID NOT NULL REFERENCES past_papers(id) ON DELETE CASCADE,
    started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at       TIMESTAMPTZ,
    score              INTEGER,
    time_taken_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_pp_attempts_user ON past_paper_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_attempts_paper ON past_paper_attempts(paper_id);

-- ------------------------------------------------------------
-- 4. PAST_PAPER_ANSWERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS past_paper_answers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id      UUID NOT NULL REFERENCES past_paper_attempts(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES past_paper_questions(id) ON DELETE CASCADE,
    selected_option CHAR(1) CHECK (selected_option IN ('A','B','C','D')),
    is_correct      BOOLEAN,
    UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_pp_answers_attempt ON past_paper_answers(attempt_id);

COMMIT;
