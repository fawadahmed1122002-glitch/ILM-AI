#!/usr/bin/env python3
"""
Bulk MCQ generation script.
Loops through every 'ready' chapter for a subject and calls the admin
generate endpoint. Run against production once you trust single-chapter
quality.

Usage:
    python bulk_generate_mcqs.py <subject> <admin_token>

Example:
    python bulk_generate_mcqs.py Biology eyJhbGc...
"""

import sys
import time
import requests

BASE_URL = "https://prepxmentor-backend-production.up.railway.app/api/v1"
RESOLVE_HOST = "prepxmentor-backend-production.up.railway.app"
RESOLVE_IP = "69.46.46.101"  # update if this changes -- check `railway domain`

# Requests doesn't support --resolve directly; use a session with a custom
# adapter, or simplest: just hit the public URL normally (DNS should
# resolve fine outside the earlier WSL resolver issue -- this runs as a
# plain Python script, not through the flaky local shell DNS problem).


def get_ready_chapters(subject: str, token: str) -> list[int]:
    """
    Pulls the real chapter list for a subject from the documents table via
    a lightweight query -- reuses the existing admin auth. If you don't
    have a dedicated "list documents" endpoint, adjust this to whatever
    endpoint exposes ingested chapters, or hardcode the known range.
    """
    # NOTE: adjust this if you have a real /admin/documents listing
    # endpoint. Hardcoded ranges below as a fallback based on known
    # ingestion counts from earlier sessions -- update as content grows.
    known_chapters = {
        "Biology": list(range(1, 26)),
        "Chemistry": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33],
        "Computer Science": list(range(1, 14)),
        "Mathematics": [n for n in range(1, 26) if n != 20],
        "Physics": [1] + list(range(13, 22)),
    }
    return known_chapters.get(subject, [])


def generate_for_chapter(subject: str, chapter: int, token: str) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(
        f"{BASE_URL}/admin/mcqs/generate",
        params={"subject": subject, "chapter_number": chapter},
        headers=headers,
        timeout=30,
    )
    if resp.status_code != 202:
        # Synchronous rejection (400 invalid chapter, 409 already running,
        # auth failures...) -- surface it as-is.
        try:
            return resp.json()
        except Exception:
            return {"error": resp.text, "status_code": resp.status_code}

    # Accepted: the Groq round-trip runs in the background. Poll
    # /generation-status until the job completes or fails (up to ~3 min).
    deadline = time.time() + 180
    while time.time() < deadline:
        time.sleep(5)
        try:
            st = requests.get(
                f"{BASE_URL}/admin/mcqs/generation-status",
                params={"subject": subject, "chapter_number": chapter},
                headers=headers,
                timeout=30,
            )
            data = st.json()
        except Exception:
            continue  # transient poll hiccup -- keep polling
        status = data.get("status")
        if status == "completed":
            return data.get("result") or {}
        if status == "failed":
            return {"error": data.get("message"), "status": "failed"}
    return {"error": "generation polling timed out", "status": "timeout"}


def main():
    if len(sys.argv) != 3:
        print("Usage: python bulk_generate_mcqs.py <subject> <admin_token>")
        sys.exit(1)

    subject = sys.argv[1]
    token = sys.argv[2]

    chapters = get_ready_chapters(subject, token)
    if not chapters:
        print(f"No known chapters for subject: {subject}")
        sys.exit(1)

    print(f"Generating MCQs for {len(chapters)} chapters in {subject}...\n")

    results = []
    for ch in chapters:
        print(f"--- Chapter {ch} ---")
        result = generate_for_chapter(subject, ch, token)
        print(result)
        results.append((ch, result))
        time.sleep(2)  # be gentle on the LLM API and avoid rate limits

    print("\n=== Summary ===")
    total_generated = sum(r.get("generated", 0) for _, r in results if isinstance(r, dict))
    failures = [(ch, r) for ch, r in results if isinstance(r, dict) and r.get("generated", 0) == 0]
    print(f"Total MCQs generated: {total_generated}")
    print(f"Chapters with 0 generated (check manually): {[ch for ch, _ in failures]}")


if __name__ == "__main__":
    main()