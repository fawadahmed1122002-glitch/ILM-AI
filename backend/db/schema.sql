-- ============================================================
-- ILM AI · PostgreSQL Schema (board/grade removed - ECAT/MDCAT only)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(120) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    password_hash   TEXT NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'student'
                        CHECK (role IN ('student', 'admin')),
    plan            VARCHAR(20) NOT NULL DEFAULT 'free'
                        CHECK (plan IN ('free', 'pro')),
    language_pref   VARCHAR(10) DEFAULT 'both'
                        CHECK (language_pref IN ('en', 'ur', 'both')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- 2. SESSIONS (JWT refresh tokens)
-- ============================================================
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token   TEXT NOT NULL,
    device_info     TEXT,
    ip_address      INET,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token);

-- ============================================================
-- 3. DOCUMENTS
-- ============================================================
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject         VARCHAR(100) NOT NULL,
    chapter_number  SMALLINT NOT NULL,
    chapter_title   VARCHAR(255) NOT NULL,
    file_path       TEXT,
    chunk_count     INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subject, chapter_number)
);

-- ============================================================
-- 4. MCQ_BANK
-- ============================================================
CREATE TABLE mcq_bank (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID REFERENCES documents(id) ON DELETE SET NULL,
    subject         VARCHAR(100) NOT NULL,
    chapter_number  SMALLINT NOT NULL,
    topic           VARCHAR(255),
    question_text   TEXT NOT NULL,
    question_text_ur TEXT,
    option_a        TEXT NOT NULL,
    option_b        TEXT NOT NULL,
    option_c        TEXT NOT NULL,
    option_d        TEXT NOT NULL,
    correct_option  CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
    explanation     TEXT,
    difficulty      VARCHAR(10) NOT NULL DEFAULT 'medium'
                        CHECK (difficulty IN ('easy', 'medium', 'hard')),
    source_chunk_id TEXT,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcq_subject_chapter ON mcq_bank(subject, chapter_number);
CREATE INDEX idx_mcq_topic ON mcq_bank(topic);

-- ============================================================
-- 5. MCQ_ATTEMPTS
-- ============================================================
CREATE TABLE mcq_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mcq_id          UUID NOT NULL REFERENCES mcq_bank(id) ON DELETE CASCADE,
    selected_option CHAR(1) NOT NULL CHECK (selected_option IN ('A','B','C','D')),
    is_correct      BOOLEAN NOT NULL,
    time_spent_ms   INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attempts_user ON mcq_attempts(user_id);
CREATE INDEX idx_attempts_mcq ON mcq_attempts(mcq_id);
CREATE INDEX idx_attempts_user_date ON mcq_attempts(user_id, created_at DESC);

-- ============================================================
-- 6. TOPIC_STATS
-- ============================================================
CREATE TABLE topic_stats (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject         VARCHAR(100) NOT NULL,
    chapter_number  SMALLINT NOT NULL,
    topic           VARCHAR(255) NOT NULL,
    total_attempts  INTEGER NOT NULL DEFAULT 0,
    correct_count   INTEGER NOT NULL DEFAULT 0,
    accuracy        NUMERIC(5,2) GENERATED ALWAYS AS (
                        CASE WHEN total_attempts > 0
                             THEN (correct_count::NUMERIC / total_attempts) * 100
                             ELSE 0 END
                    ) STORED,
    last_attempt_at TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, subject, chapter_number, topic)
);

CREATE INDEX idx_topic_stats_user ON topic_stats(user_id);

-- ============================================================
-- 7. RESPONSE_CACHE (Postgres production version)
-- ============================================================
CREATE TABLE response_cache (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key       VARCHAR(64) UNIQUE NOT NULL,
    subject         VARCHAR(100) NOT NULL,
    response_body   JSONB NOT NULL,
    hit_count       INTEGER NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cache_key ON response_cache(cache_key);
CREATE INDEX idx_cache_expires ON response_cache(expires_at);

-- ============================================================
-- 8. PAYMENTS
-- ============================================================
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          NUMERIC(10,2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'PKR',
    method          VARCHAR(30) NOT NULL
                        CHECK (method IN ('jazzcash', 'easypaisa', 'card', 'bank_transfer')),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_ref VARCHAR(255),
    plan            VARCHAR(30),
    valid_from      TIMESTAMPTZ,
    valid_until     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================
-- 9. PAST PAPERS (past papers practice module)
-- ============================================================
CREATE TABLE past_papers (
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

CREATE INDEX idx_past_papers_exam_year ON past_papers(exam_type, year);
CREATE INDEX idx_past_papers_status ON past_papers(status);

CREATE TABLE past_paper_questions (
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
    answer_source      VARCHAR(50),
    UNIQUE (paper_id, question_number)
);

CREATE INDEX idx_pp_questions_paper ON past_paper_questions(paper_id);

CREATE TABLE past_paper_attempts (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paper_id           UUID NOT NULL REFERENCES past_papers(id) ON DELETE CASCADE,
    status             VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                           CHECK (status IN ('in_progress', 'completed')),
    started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at       TIMESTAMPTZ,
    score              INTEGER,
    time_taken_seconds INTEGER
);

CREATE INDEX idx_pp_attempts_user ON past_paper_attempts(user_id);
CREATE INDEX idx_pp_attempts_paper ON past_paper_attempts(paper_id);

CREATE TABLE past_paper_answers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id      UUID NOT NULL REFERENCES past_paper_attempts(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES past_paper_questions(id) ON DELETE CASCADE,
    selected_option CHAR(1) CHECK (selected_option IN ('A','B','C','D')),
    is_correct      BOOLEAN,
    UNIQUE (attempt_id, question_id)
);

CREATE INDEX idx_pp_answers_attempt ON past_paper_answers(attempt_id);