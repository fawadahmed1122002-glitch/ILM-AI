"""
PrepXMentor Response Cache Service (Task 8)
Hashes query+subject, checks cache before calling LLM, caches on miss.
Target: ~40% reduction in repeat-query API costs (per Master Doc 1.6).

Backed by the PostgreSQL response_cache table (db/schema.sql section 7).
Callers (llm_client) have no request session in scope, so each call opens
its own SessionLocal session -- the same pattern as background tasks.
"""

import hashlib
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.session import SessionLocal
from app.models.response_cache import ResponseCache

CACHE_TTL_HOURS = 24  # per Master Doc Day 27 spec: cache valid if < 24 hours old


def make_query_hash(query: str, subject: str) -> str:
    """
    Hashes the normalized query + subject into a stable cache key.
    NOTE: caller should pass the NORMALIZED (post Roman-Urdu-translation) query,
    so 'software engineering kya hai' and 'What is software engineering?' hit
    the same cache entry.
    """
    key = f"{subject.lower().strip()}::{query.lower().strip()}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def get_cached_response(query: str, subject: str):
    """
    Returns cached response dict if a fresh (< 24h) entry exists, else None.
    """
    cache_key = make_query_hash(query, subject)
    db = SessionLocal()
    try:
        entry = (
            db.query(ResponseCache)
            .filter(ResponseCache.cache_key == cache_key)
            .first()
        )
        if entry is None:
            return None

        now = datetime.now(timezone.utc)
        if entry.expires_at is None or entry.expires_at <= now:
            # Stale — treat as miss, will get overwritten on next store
            return None

        body = entry.response_body
        # Update hit count
        entry.hit_count += 1
        db.commit()
        return body
    finally:
        db.close()


def store_response(query: str, subject: str, response_data: dict):
    """
    Stores a response in the cache, keyed by query+subject hash.
    Overwrites any existing (stale) entry for the same key.
    """
    cache_key = make_query_hash(query, subject)
    now = datetime.now(timezone.utc)
    db = SessionLocal()
    try:
        stmt = pg_insert(ResponseCache).values(
            cache_key=cache_key,
            subject=subject,
            response_body=response_data,
            expires_at=now + timedelta(hours=CACHE_TTL_HOURS),
            hit_count=0,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["cache_key"],
            set_={
                "response_body": stmt.excluded.response_body,
                "expires_at": stmt.excluded.expires_at,
                "hit_count": 0,
            },
        )
        db.execute(stmt)
        db.commit()
    finally:
        db.close()


def get_cache_stats():
    """Quick visibility into cache performance."""
    db = SessionLocal()
    try:
        total_entries, total_hits = db.query(
            func.count(ResponseCache.id),
            func.coalesce(func.sum(ResponseCache.hit_count), 0),
        ).one()
        return {
            "total_entries": total_entries or 0,
            "total_cache_hits": total_hits or 0,
        }
    finally:
        db.close()
