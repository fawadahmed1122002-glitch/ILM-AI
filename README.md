# PrepXMentor — Bilingual AI Tutor for ECAT & MDCAT

PrepXMentor is a bilingual (English + Urdu) AI-powered exam-prep platform for Pakistani FSc students preparing for **ECAT**, **MDCAT**, **NUST NET**, and **FAST** entry tests. It uses a Retrieval-Augmented Generation (RAG) pipeline grounded in the actual revised-syllabus textbooks, so every explanation and MCQ it produces is syllabus-aligned — not generic AI output.

Built for the **Alibaba Cloud AI Hackathon Pakistan 2026** (Grade 1 qualifier) using **Qoder** (Qwen3.8-Max) as the primary agentic build tool.

> **Status:** active solo-founder build. Production launch targeted **December 15, 2026**. See Known Limitations below — nothing here is hidden.

## Why PrepXMentor

Pakistan's ECAT/MDCAT syllabus was revised in 2025, and every existing past-paper bank is now partially or fully misaligned. ~300,000+ students sit these exams a year; academy fees run PKR 20,000–80,000/semester; and 40–60% of aspirants are Urdu-medium students underserved by English-only prep tools.

PrepXMentor solves this by ingesting the actual new-syllabus textbooks into a vector store and generating grounded, bilingual explanations and exam-format MCQs on demand — for PKR 799–2,499/month depending on tier.

## Features

- Bilingual RAG explanations (English + Urdu, incl. Roman Urdu / code-switched queries)
- ECAT/MDCAT-format MCQ generation, JSON-validated
- Past Paper Practice with timed attempts (100-min enforcement, backend + frontend) — 2015 UET ECAT paper digitized and verified (99/100 answers)
- AI Study Chat — persistent, RAG-grounded conversational follow-up with four-way language mirroring
- Tier-gated auth, subject-scoped access, email verification, streak tracking
- Analytics dashboard — per-topic accuracy, streaks, weak-area flags (recharts)
- Admin tools — bulk MCQ generation, MCQ bank browser, plan-toggle, payment audit log
- Safepay payment integration — verified end-to-end in production, multi-product pricing (PKR 799–2,499/month)

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| Vector store | ChromaDB |
| Embeddings | all-MiniLM-L6-v2 (local) |
| LLM | Groq — openai/gpt-oss-120b |
| Frontend | Next.js + Tailwind CSS |
| Payments | Safepay |
| Email | Resend |
| Hosting | Railway (target — currently running locally pre-revenue) |
| Built with | Qoder — Qwen3.8-Max |

## Architecture

```
Textbook PDFs
│ section-based chunking (800-char max / 50 overlap) + embed
▼
ChromaDB (vector store, metadata: subject/chapter/page)
│ top-5 similarity retrieval
▼
Structured prompt (context + subject + query)
│ Groq LLM call
▼
Bilingual explanation + MCQ JSON → validated → stored
```

## Getting Started

### Backend (FastAPI)

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # then fill in GROQ_API_KEY, JWT_SECRET_KEY, DATABASE_URL, ...

# Fresh database: apply the authoritative schema
psql "$DATABASE_URL" -f db/schema.sql
# Existing database: apply numbered migrations in order instead
psql "$DATABASE_URL" -f db/migrations/001_add_past_paper_tables.sql  # ... through 007

# First run downloads the all-MiniLM-L6-v2 embedding model (~90 MB) once
uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js)

```bash
cd frontend
npm ci

cp .env.local.example .env.local   # fill in Safepay + backend URLs as needed

npm run dev   # http://localhost:3000
```

All environment variables read by the code are documented in
[`backend/.env.example`](backend/.env.example) and
[`frontend/.env.local.example`](frontend/.env.local.example).

## Project Structure

```
ILM-AI/
├── backend/                        # FastAPI backend (Python 3.11)
│   ├── app/
│   │   ├── main.py                 # App bootstrap: CORS, rate limiting, error handlers
│   │   ├── api/v1/                 # Routers: auth, query, mock_tests, past_papers,
│   │   │                           #   study_chat, admin, internal
│   │   ├── core/                   # Config, JWT security, rate limiting, product catalog
│   │   ├── db/                     # SQLAlchemy engine/session
│   │   ├── models/                 # ORM models (users, mcq_bank, past papers, chat, ...)
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # Tier gating, payments, caching, streaks, email, MCQ gen
│   │   └── rag/                    # RAG pipeline: PDF ingest, retrieval, LLM client, prompts
│   ├── db/
│   │   ├── schema.sql              # Authoritative schema for fresh databases
│   │   └── migrations/             # Numbered SQL migrations (001–007)
│   ├── ingestion/                  # Standalone PDF → ChromaDB ingestion scripts
│   ├── scripts/                    # Admin/maintenance helpers + e2e smoke tests
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                       # Next.js (App Router) frontend
│   ├── app/                        # Routes: study, mock-test, past-papers, universities,
│   │   │                           #   merit-calculator, dashboard, analytics, upgrade,
│   │   │                           #   blog, admin/mcqs, auth (login/register), ...
│   │   └── api/payment/            # Safepay checkout + webhook route handlers
│   ├── components/                 # App chrome (navbar/sidebar/footer) + StudyChatDrawer
│   ├── context/                    # Auth / Sidebar / Theme providers
│   ├── lib/                        # API client, auth storage, payment, products, blog layer
│   ├── content/blog/               # Blog posts (static JSON)
│   └── Dockerfile
├── scripts/                        # Bash ingestion + MCQ-generation drivers (curl → admin API)
└── data/                           # Local runtime data (git-ignored except past_paper/)
    ├── chroma_db/                  # Vector store
    ├── past_paper/                 # TRACKED: verified ECAT 2015 past-paper source JSON
    └── pdfs/                       # Textbook PDFs per subject (not committed)
```

## Content Coverage (as of submission)

| Subject | Status |
|---|---|
| Biology | 25/25 chapters ingested, MCQs generated and approved |
| Chemistry | 33/33 chapters ingested; MCQ generation in progress (Groq daily-quota bound) |
| Computer Science | 13/13 chapters ingested |
| Mathematics | 24/26 chapters (2 pending — missing source PDF and a chapter-numbering check) |
| Physics | Ch. 1, 13–21 ingested; Ch. 2–12 in progress — actively sourcing |
| English | Not yet started |

## Known Limitations

- Physics chapters 2–12 not yet ingested — actively sourcing (known live-demo risk)
- Chemistry MCQ generation partially complete (Groq daily quota bound)
- English content not yet sourced
- Registration flow is currently name/email/password only — no diagnostic-based track recommendation yet
- Mock test sequencing not yet built
- A small batch (~74) of MCQs generated before an Aug 20, 2026 prompt fix contain Urdu-script text in answer-option fields rather than the intended language split; flagged for a dedicated cleanup pass
- Running on local infrastructure ahead of the hosted-infra migration planned before public launch

## Roadmap

- Complete Physics and Chemistry content ingestion
- English content build-out
- Registration/diagnostic flow
- Mock test sequencing
- Legacy MCQ cleanup pass (Urdu-script option fields)
- Migrate from local infra to hosted (Railway) ahead of launch
- **Production launch: December 15, 2026**

## Built with Qoder

This project was built using Qoder (Enterprise Plan, 2,610 credits) pinned to Qwen3.8-Max, including a generated Repo Wiki for codebase navigation. Qoder was used for the majority of feature development during the hackathon build phase.

## Team

- **Fawad Ahmed** — Founder, AI Engineer & Developer
- **Ahmad Hassan** — Content
- **Ahmed Bilal** — Content

## Author

**Fawad Ahmed** — Founder, AI Engineer