"""Verification of the mock-test runnability floor + proportional timer.

Part A (no server, no DB writes): exercises _min_runnable_questions /
_scaled_time_limit / _composition_state against synthetic subject counts,
including the stale counts from CODEBASE_ANALYSIS.md (the 4-question ECAT on
a 100-minute clock) and the exact 60% boundary.

Part B (live server): /availability must agree with Part A for the counts the
DB actually holds; a short-but-runnable paper must start with a SCALED clock
and GET /{id} (what the take page reads) must return that same scaled clock;
a fully stocked paper must start with the untouched nominal clock.

Part C (live server, TEMPORARY data flip): un-approves the Mathematics and
Physics bank so full_ecat drops to 30% of nominal, confirming runnable:false
+ reason on /availability and 400 INSUFFICIENT_CONTENT on /start. The exact
row ids are captured first and restored in a finally block, and the per-subject
approved counts are asserted identical before and after.

Usage: python scripts/test_mock_test_availability.py [base_url]
"""
import json
import math
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv(".env")

from app.api.v1.mock_tests import (  # noqa: E402
    ALLOWED_SUBJECTS,
    MIN_RUNNABLE_PERCENT,
    SINGLE_SUBJECT_QUESTION_COUNT,
    SINGLE_SUBJECT_TIME_LIMIT_MIN,
    TEST_COMPOSITIONS,
    _composition_state,
    _min_runnable_questions,
    _scaled_time_limit,
)

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/") + "/api/v1"
PASSWORD = "TestPass123!"
PSQL_ENV = {"PGPASSWORD": "ilmai_dev_password", "PATH": "/usr/bin:/bin"}

failures: list[str] = []
created_emails: list[str] = []


def check(label: str, got, want):
    ok = got == want
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}: got {got!r}, want {want!r}")
    if not ok:
        failures.append(f"{label}: got {got!r}, want {want!r}")


def call(method: str, path: str, payload=None, token=None):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(payload).encode() if payload else None,
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {}),
        },
        method=method,
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())


def call_expect_error(method: str, path: str, payload=None, token=None):
    """Return (status_code, parsed_detail) for a request expected to fail."""
    try:
        call(method, path, payload, token)
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body).get("detail")
        except json.JSONDecodeError:
            return e.code, body
    raise AssertionError(f"{method} {path} unexpectedly succeeded")


def psql(sql: str) -> str:
    out = subprocess.run(
        ["psql", "-h", "localhost", "-U", "ilmai_user", "-d", "ilmai_db",
         "-P", "pager=off", "-t", "-A", "-c", sql],
        capture_output=True, text=True, env=PSQL_ENV,
    )
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip())
    return out.stdout.strip()


def psql_count(sql: str) -> int:
    """Rows affected by a write statement, read from psql's trailing command
    tag ('DELETE 3', 'UPDATE 85'). Counting output lines instead would be off
    by one: -t -A suppresses headers/footers but still prints the tag."""
    out = psql(sql)
    parts = out.splitlines()[-1].split() if out else []
    if parts and parts[-1].isdigit():
        return int(parts[-1])
    raise RuntimeError(f"no psql command tag in output: {out!r}")


def register(tag: str) -> tuple[str, str]:
    email = f"mt_{tag}_{int(time.time() * 1000)}@example.com"
    resp = call("POST", "/auth/register",
                {"email": email, "password": PASSWORD, "full_name": "Mock Test Floor"})
    token = resp.get("access_token")
    if not token:
        token = call("POST", "/auth/login", {"email": email, "password": PASSWORD})["access_token"]
    created_emails.append(email)
    return email, token


def live_counts() -> dict[str, int]:
    rows = psql(
        "SELECT subject || '|' || COUNT(*) FROM mcq_bank "
        "WHERE is_verified = TRUE AND rejected_at IS NULL GROUP BY subject;"
    )
    return {
        line.split("|")[0]: int(line.split("|")[1])
        for line in rows.splitlines() if line
    }


ECAT = TEST_COMPOSITIONS["full_ecat"]
MDCAT = TEST_COMPOSITIONS["full_mdcat"]

# ---------------------------------------------------------------- Part A
print("=" * 72)
print(f"PART A -- pure composition logic (floor = {MIN_RUNNABLE_PERCENT}%)")
print("=" * 72)

print("\nA1. Fully stocked compositions keep the exact nominal clock")
full_stock = {"Mathematics": 999, "Physics": 999, "Chemistry": 999, "English": 999,
              "Biology": 999, "Logical Reasoning": 999}
ecat_full = _composition_state(ECAT["time_limit_minutes"], ECAT["subjects"], full_stock)
mdcat_full = _composition_state(MDCAT["time_limit_minutes"], MDCAT["subjects"], full_stock)
single_full = _composition_state(SINGLE_SUBJECT_TIME_LIMIT_MIN,
                                 [("Physics", SINGLE_SUBJECT_QUESTION_COUNT)], full_stock)
check("ecat questions", ecat_full["question_count"], 100)
check("ecat clock", ecat_full["time_limit_minutes"], 100)
check("ecat nominal clock", ecat_full["nominal_time_limit_minutes"], 100)
check("ecat runnable", ecat_full["runnable"], True)
check("ecat missing_subjects", ecat_full["missing_subjects"], [])
check("mdcat questions", mdcat_full["question_count"], 180)
check("mdcat clock", mdcat_full["time_limit_minutes"], 210)
check("single-subject questions", single_full["question_count"], 25)
check("single-subject clock", single_full["time_limit_minutes"], 30)

print("\nA2. CODEBASE_ANALYSIS stale counts (the bug that was reported)")
stale = {"Mathematics": 2, "Physics": 2, "Chemistry": 0, "English": 0,
         "Biology": 68, "Logical Reasoning": 0, "Computer Science": 50}
ecat_stale = _composition_state(ECAT["time_limit_minutes"], ECAT["subjects"], stale)
mdcat_stale = _composition_state(MDCAT["time_limit_minutes"], MDCAT["subjects"], stale)
check("ecat questions", ecat_stale["question_count"], 4)
check("ecat available_percent", ecat_stale["available_percent"], 4)
check("ecat runnable", ecat_stale["runnable"], False)
check("ecat reason", ecat_stale["reason"], "insufficient_content")
check("mdcat questions", mdcat_stale["question_count"], 70)
check("mdcat available_percent", mdcat_stale["available_percent"], 39)
check("mdcat runnable", mdcat_stale["runnable"], False)
check("mdcat reason", mdcat_stale["reason"], "insufficient_content")

print("\nA3. Short but above the floor -> clock scales with questions served")
# ECAT with English missing entirely: 90 of 100 questions.
ecat_no_english = _composition_state(ECAT["time_limit_minutes"], ECAT["subjects"],
                                     {**stale, "Mathematics": 50, "Physics": 35,
                                      "Chemistry": 81, "English": 0})
check("ecat questions", ecat_no_english["question_count"], 90)
check("ecat runnable", ecat_no_english["runnable"], True)
check("ecat scaled clock", ecat_no_english["time_limit_minutes"], 90)
check("ecat missing_subjects", ecat_no_english["missing_subjects"], ["English"])
# MDCAT missing English + Logical Reasoning, Physics one short: 161 of 180.
mdcat_short = _composition_state(MDCAT["time_limit_minutes"], MDCAT["subjects"],
                                 {"Biology": 154, "Chemistry": 81, "Physics": 35,
                                  "English": 0, "Logical Reasoning": 0})
check("mdcat questions", mdcat_short["question_count"], 161)
check("mdcat runnable", mdcat_short["runnable"], True)
check("mdcat scaled clock", mdcat_short["time_limit_minutes"],
      math.ceil(210 * 161 / 180))
check("mdcat scaled clock value", mdcat_short["time_limit_minutes"], 188)
check("mdcat missing_subjects", mdcat_short["missing_subjects"],
      ["Physics", "English", "Logical Reasoning"])

print("\nA4. Exact floor boundary")
check("floor for 100 nominal", _min_runnable_questions(100), 60)
check("floor for 180 nominal", _min_runnable_questions(180), 108)
check("floor for 25 nominal", _min_runnable_questions(25), 15)
# NB: a slice can never serve more than its nominal want, so hitting exactly
# 60/100 means filling the Math + Physics slices and nothing else.
at_floor = _composition_state(ECAT["time_limit_minutes"], ECAT["subjects"],
                              {"Mathematics": 30, "Physics": 30,
                               "Chemistry": 0, "English": 0})
just_below = _composition_state(ECAT["time_limit_minutes"], ECAT["subjects"],
                                {"Mathematics": 30, "Physics": 29,
                                 "Chemistry": 0, "English": 0})
check("60/100 served", at_floor["question_count"], 60)
check("60/100 runnable", at_floor["runnable"], True)
check("60/100 clock", at_floor["time_limit_minutes"], 60)
check("59/100 served", just_below["question_count"], 59)
check("59/100 runnable", just_below["runnable"], False)
check("59/100 reason", just_below["reason"], "insufficient_content")
check("59/100 available_percent", just_below["available_percent"], 59)

print("\nA5. Single-subject floor boundary + scaling")
for avail, want_runnable, want_clock in [(25, True, 30), (20, True, 24),
                                         (15, True, 18), (14, False, 17)]:
    st = _composition_state(SINGLE_SUBJECT_TIME_LIMIT_MIN,
                            [("Physics", SINGLE_SUBJECT_QUESTION_COUNT)],
                            {"Physics": avail})
    check(f"{avail}/25 runnable", st["runnable"], want_runnable)
    check(f"{avail}/25 clock", st["time_limit_minutes"], want_clock)

print("\nA6. Rounding never shortens below the proportional share")
for nominal_min, nominal_q, actual_q in [(100, 100, 61), (210, 180, 108),
                                         (30, 25, 15), (100, 100, 99)]:
    scaled = _scaled_time_limit(nominal_min, nominal_q, actual_q)
    exact = nominal_min * actual_q / nominal_q
    check(f"{actual_q}/{nominal_q} of {nominal_min}min >= exact {exact:.3f}",
          scaled >= exact, True)

# ---------------------------------------------------------------- Part B
print()
print("=" * 72)
print(f"PART B -- live server at {BASE}")
print("=" * 72)

counts = live_counts()
print(f"\nlive approved counts: {counts}")
expected_ecat = _composition_state(ECAT["time_limit_minutes"], ECAT["subjects"], counts)
expected_mdcat = _composition_state(MDCAT["time_limit_minutes"], MDCAT["subjects"], counts)

email, token = register("live")
avail = call("GET", "/mock-tests/availability", token=token)
print("\nB1. /availability reports the floor + scaled clock")
check("min_runnable_percent", avail["min_runnable_percent"], MIN_RUNNABLE_PERCENT)
check("subjects match psql", avail["subjects"],
      {s: counts.get(s, 0) for s in avail["subjects"]})
for key, expected in (("full_ecat", expected_ecat), ("full_mdcat", expected_mdcat)):
    check(f"{key} block", avail[key], expected)
for s in ALLOWED_SUBJECTS:
    want = _composition_state(SINGLE_SUBJECT_TIME_LIMIT_MIN,
                              [(s, SINGLE_SUBJECT_QUESTION_COUNT)], counts)
    check(f"single_subject[{s}]", avail["single_subject"][s], want)

print("\nB2. Short-but-runnable paper starts with the SCALED clock")
if expected_ecat["runnable"] and expected_ecat["question_count"] < expected_ecat["nominal_question_count"]:
    started = call("POST", "/mock-tests/start", {"test_type": "full_ecat"}, token)
    check("start question_count", started["question_count"], expected_ecat["question_count"])
    check("start time_limit_minutes", started["time_limit_minutes"],
          expected_ecat["time_limit_minutes"])
    check("start clock is NOT nominal",
          started["time_limit_minutes"] != ECAT["time_limit_minutes"], True)
    detail = call("GET", f"/mock-tests/{started['id']}", token=token)
    check("GET /{id} time_limit_minutes (take-page timer)",
          detail["time_limit_minutes"], expected_ecat["time_limit_minutes"])
    check("GET /{id} question_count", detail["question_count"],
          expected_ecat["question_count"])
    check("questions served", len(detail["questions"]), expected_ecat["question_count"])
    served_subjects = sorted({q["subject"] for q in detail["questions"]})
    print(f"  subjects actually served: {served_subjects}")
    check("English slice absent as predicted", "English" in served_subjects, False)
else:
    print("  SKIPPED: full_ecat is not currently short-but-runnable")

print("\nB3. Fully stocked paper is completely unaffected")
full_subject = next(
    (s for s in ALLOWED_SUBJECTS
     if counts.get(s, 0) >= SINGLE_SUBJECT_QUESTION_COUNT), None)
if full_subject:
    email2, token2 = register("full")
    started2 = call("POST", "/mock-tests/start",
                    {"test_type": "subject", "subject": full_subject}, token2)
    check(f"{full_subject} question_count (nominal)", started2["question_count"],
          SINGLE_SUBJECT_QUESTION_COUNT)
    check(f"{full_subject} time_limit_minutes (nominal)", started2["time_limit_minutes"],
          SINGLE_SUBJECT_TIME_LIMIT_MIN)
    detail2 = call("GET", f"/mock-tests/{started2['id']}", token=token2)
    check("GET /{id} time_limit_minutes", detail2["time_limit_minutes"],
          SINGLE_SUBJECT_TIME_LIMIT_MIN)
else:
    print("  SKIPPED: no subject is fully stocked at 25 questions")

# ---------------------------------------------------------------- Part C
print()
print("=" * 72)
print("PART C -- TEMPORARY un-approval of Mathematics + Physics rows")
print("=" * 72)

before_counts = live_counts()
# quote_literal() so the id list can be dropped straight into an IN (...) clause.
flipped_ids = psql(
    "SELECT string_agg(quote_literal(id::text), ',') FROM mcq_bank "
    "WHERE subject IN ('Mathematics','Physics') "
    "AND is_verified = TRUE AND rejected_at IS NULL;"
)
try:
    if not flipped_ids:
        raise RuntimeError("no Mathematics/Physics approved rows to flip")
    n = psql_count(
        f"UPDATE mcq_bank SET is_verified = FALSE WHERE id IN ({flipped_ids});"
    )
    print(f"\n  temporarily un-approved {n} rows (restore list captured)")

    depleted = live_counts()
    exp_ecat_dep = _composition_state(ECAT["time_limit_minutes"], ECAT["subjects"], depleted)
    exp_mdcat_dep = _composition_state(MDCAT["time_limit_minutes"], MDCAT["subjects"], depleted)
    exp_phys_dep = _composition_state(SINGLE_SUBJECT_TIME_LIMIT_MIN,
                                      [("Physics", SINGLE_SUBJECT_QUESTION_COUNT)], depleted)
    print(f"  depleted counts: {depleted}")
    print(f"  expected: ecat {exp_ecat_dep['question_count']}/100 "
          f"({exp_ecat_dep['available_percent']}%) runnable={exp_ecat_dep['runnable']}, "
          f"mdcat {exp_mdcat_dep['question_count']}/180 "
          f"({exp_mdcat_dep['available_percent']}%) runnable={exp_mdcat_dep['runnable']}")

    email3, token3 = register("depleted")
    avail3 = call("GET", "/mock-tests/availability", token=token3)
    print("\nC1. Below-floor composition reports runnable:false + reason")
    check("full_ecat block", avail3["full_ecat"], exp_ecat_dep)
    check("full_ecat runnable", avail3["full_ecat"]["runnable"], False)
    check("full_ecat reason", avail3["full_ecat"]["reason"], "insufficient_content")
    check("single_subject[Physics] runnable", avail3["single_subject"]["Physics"]["runnable"], False)
    check("single_subject[Physics] reason",
          avail3["single_subject"]["Physics"]["reason"], "insufficient_content")
    check("single_subject[Physics] block", avail3["single_subject"]["Physics"], exp_phys_dep)
    check("full_mdcat still runnable", avail3["full_mdcat"]["runnable"], True)
    check("full_mdcat block", avail3["full_mdcat"], exp_mdcat_dep)

    print("\nC2. /start refuses a below-floor paper server-side")
    status, detail = call_expect_error("POST", "/mock-tests/start",
                                       {"test_type": "full_ecat"}, token3)
    check("status", status, 400)
    check("code", detail.get("code"), "INSUFFICIENT_CONTENT")
    check("reason", detail.get("reason"), "insufficient_content")
    check("question_count", detail.get("question_count"), exp_ecat_dep["question_count"])
    check("nominal_question_count", detail.get("nominal_question_count"), 100)
    print(f"  message: {detail.get('message')}")
    print(f"  shortfalls: {detail.get('shortfalls')}")

    status_s, detail_s = call_expect_error("POST", "/mock-tests/start",
                                           {"test_type": "subject", "subject": "Physics"}, token3)
    check("single-subject status", status_s, 400)
    check("single-subject code", detail_s.get("code"), "INSUFFICIENT_CONTENT")
    print(f"  message: {detail_s.get('message')}")

    print("\nC3. A still-runnable composition scales its clock further")
    started3 = call("POST", "/mock-tests/start", {"test_type": "full_mdcat"}, token3)
    check("mdcat question_count", started3["question_count"], exp_mdcat_dep["question_count"])
    check("mdcat time_limit_minutes", started3["time_limit_minutes"],
          exp_mdcat_dep["time_limit_minutes"])
    detail3 = call("GET", f"/mock-tests/{started3['id']}", token=token3)
    check("GET /{id} time_limit_minutes", detail3["time_limit_minutes"],
          exp_mdcat_dep["time_limit_minutes"])
finally:
    restored = psql_count(f"UPDATE mcq_bank SET is_verified = TRUE WHERE id IN ({flipped_ids});")
    print(f"\n  restore: re-approved {restored} rows")
    after_counts = live_counts()
    check("approved counts identical after restore", after_counts, before_counts)

# ---------------------------------------------------------------- cleanup
print()
print("=" * 72)
print("CLEANUP -- drop the disposable users (cascades their mock tests)")
print("=" * 72)
if created_emails:
    id_list = ",".join(f"'{e}'" for e in created_emails)
    removed = psql_count(f"DELETE FROM users WHERE email IN ({id_list});")
    print(f"  deleted {removed} of {len(created_emails)} test users")
    check("all test users removed", removed, len(created_emails))
    left = psql(f"SELECT COUNT(*) FROM users WHERE email IN ({id_list});")
    check("leftovers", left, "0")

print()
print("=" * 72)
if failures:
    print(f"{len(failures)} CHECK(S) FAILED:")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
print("ALL MOCK-TEST RUNNABILITY / TIMER CHECKS PASSED")
print("=" * 72)
