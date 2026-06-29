"""
ILMAI Response Cache Service (Task 8)
Hashes query+subject, checks cache before calling LLM, caches on miss.
Target: ~40% reduction in repeat-query API costs (per Master Doc 1.6).
"""

import hashlib
import json
import sqlite3
import os
from datetime import datetime, timedelta

CACHE_DB_PATH = "/home/fawad/project/ILM-AI/data/cache.sqlite"
CACHE_TTL_HOURS = 24  # per Master Doc Day 27 spec: cache valid if < 24 hours old


def _get_connection():
    os.makedirs(os.path.dirname(CACHE_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(CACHE_DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS response_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query_hash TEXT UNIQUE NOT NULL,
            subject TEXT NOT NULL,
            normalized_query TEXT,
            response_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            hit_count INTEGER DEFAULT 0
        )
    """)
    return conn


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
    query_hash = make_query_hash(query, subject)
    conn = _get_connection()
    cursor = conn.execute(
        "SELECT response_json, created_at, hit_count FROM response_cache WHERE query_hash = ?",
        (query_hash,)
    )
    row = cursor.fetchone()

    if row is None:
        conn.close()
        return None

    response_json, created_at, hit_count = row
    created_dt = datetime.fromisoformat(created_at)

    if datetime.now() - created_dt > timedelta(hours=CACHE_TTL_HOURS):
        # Stale — treat as miss, will get overwritten on next store
        conn.close()
        return None

    # Update hit count
    conn.execute(
        "UPDATE response_cache SET hit_count = hit_count + 1 WHERE query_hash = ?",
        (query_hash,)
    )
    conn.commit()
    conn.close()

    return json.loads(response_json)


def store_response(query: str, subject: str, response_data: dict):
    """
    Stores a response in the cache, keyed by query+subject hash.
    Overwrites any existing (stale) entry for the same key.
    """
    query_hash = make_query_hash(query, subject)
    conn = _get_connection()
    conn.execute(
        """
        INSERT INTO response_cache (query_hash, subject, normalized_query, response_json, created_at, hit_count)
        VALUES (?, ?, ?, ?, ?, 0)
        ON CONFLICT(query_hash) DO UPDATE SET
            response_json = excluded.response_json,
            created_at = excluded.created_at,
            hit_count = 0
        """,
        (query_hash, subject, query, json.dumps(response_data), datetime.now().isoformat())
    )
    conn.commit()
    conn.close()


def get_cache_stats():
    """Quick visibility into cache performance."""
    conn = _get_connection()
    cursor = conn.execute("SELECT COUNT(*), SUM(hit_count) FROM response_cache")
    total_entries, total_hits = cursor.fetchone()
    conn.close()
    return {
        "total_entries": total_entries or 0,
        "total_cache_hits": total_hits or 0,
    }