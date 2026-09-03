"""
Mock Test router.

Test compositions mirror real exam subject ratios so that as content
(especially English, not yet ingested) gets added, tests scale up to
true exam length automatically without any code changes here.

ECAT (UET pattern): 100 MCQs -- Math 30, Physics 30, Chemistry 30, English 10.
MDCAT (PMDC 2026 pattern): 180 MCQs -- Biology 81, Chemistry 45, Physics 36,
English 9, Logical Reasoning 9.

Two rules keep an understocked bank from producing a misleading test:

1. Runnability floor. A composition is only offered (and only starts) once
   at least MIN_RUNNABLE_PERCENT of its nominal questions are approved.
   Below that the student gets `runnable: false` with reason
   "insufficient_content" instead of a stub paper -- which matters because a
   free plan spends its single lifetime mock test on whatever starts.
2. Proportional timer. A composition that is above the floor but still
   short (e.g. English not yet ingested) runs on a clock scaled to the
   questions actually served, holding minutes-per-question constant. A fully
   stocked composition keeps the exact nominal duration.

A subject slice that is entirely unstocked does NOT block a test on its own
-- English is a known content gap (data/pdfs/english/ is empty) and is only
10% of ECAT / 5% of MDCAT, so requiring it would permanently disable both
papers. What the floor does block is losing the body of the exam.
"""
import math
import random
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.rate_limit import limiter
from app.models.user import User
from app.models.mcq_bank import McqBank
from app.models.mock_test import MockTest
from app.models.mock_test_question import MockTestQuestion
from app.models.mcq_attempt import McqAttempt
from app.services.tier_gate import check_mock_test_limit
from app.schemas.mock_test import (
    MockTestStartRequest,
    MockTestStartResponse,
    MockTestQuestionOut,
    MockTestSubmitRequest,
    MockTestSubmitResponse,
    MockTestResultsResponse,
    MockTestResultQuestion,
    MockTestListItem,
    MockTestDetailResponse,
    MockTestDetailQuestion,
    MockTestAnswerSaveRequest,
)

router = APIRouter(prefix="/mock-tests", tags=["mock-tests"])

ALLOWED_SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"]

SINGLE_SUBJECT_QUESTION_COUNT = 25
SINGLE_SUBJECT_TIME_LIMIT_MIN = 30

# Runnability floor, as a percentage of a composition's nominal question
# count. 60% is not arbitrary -- it sits exactly on the boundary that
# matters for these two papers:
#   ECAT  (30/30/30/10): losing one 30-question section leaves 70% -> still
#     runnable; losing two leaves 40% -> blocked. English alone (10%) leaves
#     90% -> runnable.
#   MDCAT (81/45/36/9/9): losing Biology, the dominant subject, leaves 55% ->
#     blocked. Losing English + Logical Reasoning (the two known gaps) leaves
#     90% -> runnable; losing Chemistry leaves 75% -> runnable.
# So the floor tolerates the small non-core slices while refusing to serve a
# paper whose score is no longer comparable to the real exam.
MIN_RUNNABLE_PERCENT = 60

TEST_COMPOSITIONS = {
    "full_ecat": {
        "time_limit_minutes": 100,
        "subjects": [
            ("Mathematics", 30),
            ("Physics", 30),
            ("Chemistry", 30),
            ("English", 10),
        ],
    },
    "full_mdcat": {
        "time_limit_minutes": 210,
        "subjects": [
            ("Biology", 81),
            ("Chemistry", 45),
            ("Physics", 36),
            ("English", 9),
            ("Logical Reasoning", 9),
        ],
    },
}


def _min_runnable_questions(nominal_questions: int) -> int:
    """Smallest number of served questions that still counts as runnable."""
    return math.ceil(nominal_questions * MIN_RUNNABLE_PERCENT / 100)


def _scaled_time_limit(
    nominal_minutes: int, nominal_questions: int, actual_questions: int
) -> int:
    """
    Clock for a composition that runs short: minutes-per-question is held
    constant, so a 90-question ECAT gets 90 minutes rather than the 100
    budgeted for 100 questions, and a 161-question MDCAT gets 188 rather
    than 210. A fully stocked composition returns nominal_minutes
    untouched. Rounded up so a short paper never gets less than its
    proportional share of the time, and floored at 1 minute so a started test
    can never carry a zero-length clock.
    """
    if nominal_questions <= 0 or actual_questions >= nominal_questions:
        return nominal_minutes
    return max(1, math.ceil(nominal_minutes * actual_questions / nominal_questions))


def _composition_state(
    nominal_minutes: int,
    subject_slices: list[tuple[str, int]],
    available_by_subject: dict[str, int],
) -> dict:
    """
    One source of truth for "can this run, how many questions will it serve,
    and how long is the clock". /availability uses it to tell the student the
    truth before they commit a mock test; /start re-derives it from the rows
    it actually picked so the server enforces the same rule rather than
    trusting the client to have read the setup screen. Also used for the
    single-subject paper, which is just a one-slice composition.
    """
    nominal_questions = sum(want for _, want in subject_slices)
    served = {
        subj: min(available_by_subject.get(subj, 0), want)
        for subj, want in subject_slices
    }
    actual_questions = sum(served.values())
    runnable = actual_questions >= _min_runnable_questions(nominal_questions)
    return {
        "runnable": runnable,
        "reason": None if runnable else "insufficient_content",
        "question_count": actual_questions,
        "nominal_question_count": nominal_questions,
        "available_percent": (
            round(actual_questions * 100 / nominal_questions) if nominal_questions else 0
        ),
        "time_limit_minutes": _scaled_time_limit(
            nominal_minutes, nominal_questions, actual_questions
        ),
        "nominal_time_limit_minutes": nominal_minutes,
        "missing_subjects": [
            subj for subj, want in subject_slices if served[subj] < want
        ],
    }


def _pick_random_approved(db: Session, subject: str, count: int) -> list[McqBank]:
    """
    Randomly select up to `count` approved, non-rejected MCQs for a
    subject, letting the database do the random sampling
    (ORDER BY RANDOM() LIMIT n) so the full approved bank is never
    loaded into Python memory per test start.
    """
    if count <= 0:
        return []
    return (
        db.query(McqBank)
        .filter(
            McqBank.subject == subject,
            McqBank.is_verified == True,
            McqBank.rejected_at.is_(None),
        )
        .order_by(func.random())
        .limit(count)
        .all()
    )


def check_and_expire_abandoned_tests(db: Session) -> int:
    """
    Marks in-progress mock tests whose time limit has already elapsed as
    'expired' -- covers students who closed the browser mid-test and never
    submitted. Runs as a single SQL UPDATE so the in_progress set is never
    loaded into Python. Returns the number of attempts expired. Active-
    test timer enforcement (answer-save cutoff, submission grading) is
    untouched.
    """
    expired_count = db.execute(text(
        "UPDATE mock_tests SET status = 'expired' "
        "WHERE status = 'in_progress' "
        "AND started_at + time_limit_minutes * interval '1 minute' <= now()"
    )).rowcount
    if expired_count:
        db.commit()
    return expired_count


@router.get("/availability")
def get_mock_test_availability(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Approved MCQ counts per subject, so the setup screen can show
    which single-subject and full-length tests are actually runnable
    right now (and grey out the rest) instead of failing after a
    student picks an option that turns out to be understocked.

    Each composition reports the questions it would really serve, the
    percentage of its nominal paper that is stocked, the scaled clock it
    would run on, and -- when it falls below MIN_RUNNABLE_PERCENT --
    `runnable: false` plus `reason: "insufficient_content"` so the client
    can say why rather than just greying out.
    """
    # Clean up abandoned attempts (browser closed, timer ran out) BEFORE
    # availability / free-test state is evaluated, so an expired attempt
    # no longer blocks a fresh start.
    check_and_expire_abandoned_tests(db)
    all_subjects = list(dict.fromkeys(
        ALLOWED_SUBJECTS
        + [s for subj_list in TEST_COMPOSITIONS.values() for s, _ in subj_list["subjects"]]
    ))
    counts = dict(
        db.query(McqBank.subject, func.count(McqBank.id))
        .filter(McqBank.is_verified == True, McqBank.rejected_at.is_(None))
        .group_by(McqBank.subject)
        .all()
    )

    subjects_out = {s: counts.get(s, 0) for s in all_subjects}

    # The single-subject paper is a one-slice composition, so it goes through
    # the same floor and the same proportional clock as the full-length ones.
    single_subject_out = {
        s: _composition_state(
            SINGLE_SUBJECT_TIME_LIMIT_MIN,
            [(s, SINGLE_SUBJECT_QUESTION_COUNT)],
            counts,
        )
        for s in ALLOWED_SUBJECTS
    }

    return {
        "subjects": subjects_out,
        "single_subject": single_subject_out,
        "min_runnable_percent": MIN_RUNNABLE_PERCENT,
        "full_ecat": _composition_state(
            TEST_COMPOSITIONS["full_ecat"]["time_limit_minutes"],
            TEST_COMPOSITIONS["full_ecat"]["subjects"],
            counts,
        ),
        "full_mdcat": _composition_state(
            TEST_COMPOSITIONS["full_mdcat"]["time_limit_minutes"],
            TEST_COMPOSITIONS["full_mdcat"]["subjects"],
            counts,
        ),
        "has_used_free_test": db.query(MockTest).filter(
            MockTest.user_id == user.id, MockTest.status != "expired"
        ).count() > 0,
    }


@router.post("/start", response_model=MockTestStartResponse)
@limiter.limit("20/minute")
def start_mock_test(
    request: Request,
    body: MockTestStartRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Serialize concurrent starts per user: this FOR UPDATE lock is held
    # until the request's final commit, so the in-progress guard below and
    # the free-tier count in check_mock_test_limit cannot race between
    # parallel /start calls.
    db.query(User).filter(User.id == user.id).with_for_update().one()

    # Expire any abandoned attempts (browser closed, timer ran out) before
    # the in-progress guard and free-tier limit evaluate them -- same
    # cleanup the availability endpoint performs.
    check_and_expire_abandoned_tests(db)

    # Mirror of the past-papers guard: one in-progress mock test at a time.
    existing = (
        db.query(MockTest)
        .filter(MockTest.user_id == user.id, MockTest.status == "in_progress")
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "ATTEMPT_IN_PROGRESS",
                "message": "You already have a mock test in progress",
                "attempt_id": str(existing.id),
            },
        )

    check_mock_test_limit(user, db)

    if body.test_type == "subject":
        if not body.subject or body.subject not in ALLOWED_SUBJECTS:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INVALID_SUBJECT",
                    "message": f"subject must be one of: {', '.join(ALLOWED_SUBJECTS)}",
                },
            )
        picked = _pick_random_approved(db, body.subject, SINGLE_SUBJECT_QUESTION_COUNT)
        if len(picked) < _min_runnable_questions(SINGLE_SUBJECT_QUESTION_COUNT):
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INSUFFICIENT_CONTENT",
                    "reason": "insufficient_content",
                    "message": (
                        f"Only {len(picked)} of {SINGLE_SUBJECT_QUESTION_COUNT} approved "
                        f"{body.subject} questions are available, below the "
                        f"{MIN_RUNNABLE_PERCENT}% needed for a meaningful test. "
                        f"More content is on the way."
                    ),
                    "question_count": len(picked),
                    "nominal_question_count": SINGLE_SUBJECT_QUESTION_COUNT,
                },
            )
        # Scales only when the subject is short but still above the floor;
        # a fully stocked subject keeps the nominal 30 minutes.
        time_limit = _scaled_time_limit(
            SINGLE_SUBJECT_TIME_LIMIT_MIN, SINGLE_SUBJECT_QUESTION_COUNT, len(picked)
        )
        subject_field = body.subject
        selected_mcqs = picked

    elif body.test_type in TEST_COMPOSITIONS:
        comp = TEST_COMPOSITIONS[body.test_type]
        nominal_questions = sum(want for _, want in comp["subjects"])
        subject_field = None
        selected_mcqs = []
        shortfalls = []
        for subj, want in comp["subjects"]:
            got = _pick_random_approved(db, subj, want)
            selected_mcqs.extend(got)
            if len(got) < want:
                shortfalls.append({"subject": subj, "wanted": want, "available": len(got)})
        # Server-side enforcement of the same floor /availability advertises:
        # a client that skips the setup screen cannot start a stub paper and
        # burn a free plan's single lifetime mock test on it.
        if len(selected_mcqs) < _min_runnable_questions(nominal_questions):
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INSUFFICIENT_CONTENT",
                    "reason": "insufficient_content",
                    "message": (
                        f"Only {len(selected_mcqs)} of {nominal_questions} questions for "
                        f"this test are approved, below the {MIN_RUNNABLE_PERCENT}% needed "
                        f"for a meaningful mock. More content is on the way."
                    ),
                    "question_count": len(selected_mcqs),
                    "nominal_question_count": nominal_questions,
                    "shortfalls": shortfalls,
                },
            )
        # Above the floor but short (e.g. English not yet ingested): the test
        # runs on what is stocked and the clock shrinks with it, so the
        # student is not handed 100 minutes for 90 questions. A fully stocked
        # composition gets the untouched nominal duration.
        time_limit = _scaled_time_limit(
            comp["time_limit_minutes"], nominal_questions, len(selected_mcqs)
        )
    else:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_TEST_TYPE",
                "message": "test_type must be one of: subject, full_ecat, full_mdcat",
            },
        )

    random.shuffle(selected_mcqs)

    mock_test = MockTest(
        user_id=user.id,
        test_type=body.test_type,
        subject=subject_field,
        question_count=len(selected_mcqs),
        time_limit_minutes=time_limit,
        status="in_progress",
    )
    db.add(mock_test)
    db.flush()

    question_rows = []
    for i, mcq in enumerate(selected_mcqs):
        q = MockTestQuestion(
            id=uuid.uuid4(),
            mock_test_id=mock_test.id,
            mcq_id=mcq.id,
            question_order=i,
        )
        db.add(q)
        question_rows.append((q, mcq))

    db.commit()
    db.refresh(mock_test)

    questions_out = [
        MockTestQuestionOut(
            mcq_id=mcq.id,
            question_order=q.question_order,
            subject=mcq.subject,
            chapter_number=mcq.chapter_number,
            topic=mcq.topic,
            difficulty=mcq.difficulty,
            question_text=mcq.question_text,
            question_text_ur=mcq.question_text_ur,
            option_a=mcq.option_a,
            option_b=mcq.option_b,
            option_c=mcq.option_c,
            option_d=mcq.option_d,
        )
        for q, mcq in sorted(question_rows, key=lambda pair: pair[0].question_order)
    ]

    return MockTestStartResponse(
        id=mock_test.id,
        test_type=mock_test.test_type,
        subject=mock_test.subject,
        question_count=mock_test.question_count,
        time_limit_minutes=mock_test.time_limit_minutes,
        started_at=mock_test.started_at,
        questions=questions_out,
    )


@router.get("/{mock_test_id}", response_model=MockTestDetailResponse)
def get_mock_test_detail(
    mock_test_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Resume-safe fetch: returns the test's questions (no correct answers
    or explanations) plus any answers already saved via /answer, so a
    page refresh mid-test restores exactly where the student left off.
    """
    mock_test = (
        db.query(MockTest)
        .filter(MockTest.id == mock_test_id, MockTest.user_id == user.id)
        .first()
    )
    if not mock_test:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Mock test not found"})

    questions = (
        db.query(MockTestQuestion)
        .filter(MockTestQuestion.mock_test_id == mock_test.id)
        .order_by(MockTestQuestion.question_order)
        .all()
    )
    mcq_ids = [q.mcq_id for q in questions]
    mcqs = db.query(McqBank).filter(McqBank.id.in_(mcq_ids)).all()
    mcqs_by_id = {m.id: m for m in mcqs}

    questions_out = []
    for q in questions:
        mcq = mcqs_by_id.get(q.mcq_id)
        if not mcq:
            continue
        questions_out.append(
            MockTestDetailQuestion(
                mcq_id=mcq.id,
                question_order=q.question_order,
                subject=mcq.subject,
                chapter_number=mcq.chapter_number,
                topic=mcq.topic,
                difficulty=mcq.difficulty,
                question_text=mcq.question_text,
                question_text_ur=mcq.question_text_ur,
                option_a=mcq.option_a,
                option_b=mcq.option_b,
                option_c=mcq.option_c,
                option_d=mcq.option_d,
                selected_option=q.selected_option,
            )
        )

    return MockTestDetailResponse(
        id=mock_test.id,
        test_type=mock_test.test_type,
        subject=mock_test.subject,
        question_count=mock_test.question_count,
        time_limit_minutes=mock_test.time_limit_minutes,
        status=mock_test.status,
        started_at=mock_test.started_at,
        questions=questions_out,
    )


@router.patch("/{mock_test_id}/answer")
@limiter.limit("20/minute")
def save_mock_test_answer(
    mock_test_id: uuid.UUID,
    request: Request,
    body: MockTestAnswerSaveRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Autosave a single answer without grading -- called as the student
    picks each option, so progress survives a refresh or crash. Grading
    happens only at final /submit.
    """
    mock_test = (
        db.query(MockTest)
        .filter(MockTest.id == mock_test_id, MockTest.user_id == user.id)
        .first()
    )
    if not mock_test:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Mock test not found"})
    if mock_test.status == "completed":
        raise HTTPException(
            status_code=400,
            detail={"code": "ALREADY_SUBMITTED", "message": "This mock test has already been submitted"},
        )

    # Real-exam enforcement: no NEW answers after the time limit has
    # elapsed. Submission itself stays allowed past the cutoff (see
    # /submit) so whatever was autosaved before expiry still gets graded.
    deadline = mock_test.started_at + timedelta(minutes=mock_test.time_limit_minutes)
    if datetime.now(timezone.utc) > deadline:
        raise HTTPException(
            status_code=403,
            detail={"code": "TIME_EXPIRED", "message": "Time for this mock test has expired; no further answers can be saved"},
        )

    q = (
        db.query(MockTestQuestion)
        .filter(MockTestQuestion.mock_test_id == mock_test.id, MockTestQuestion.mcq_id == body.mcq_id)
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail={"code": "QUESTION_NOT_FOUND", "message": "Question not part of this test"})

    q.selected_option = body.selected_option.upper()
    q.time_spent_ms = body.time_spent_ms
    db.commit()

    return {"ok": True}


@router.post("/{mock_test_id}/submit", response_model=MockTestSubmitResponse)
@limiter.limit("20/minute")
def submit_mock_test(
    mock_test_id: uuid.UUID,
    request: Request,
    body: MockTestSubmitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Deliberately NOT blocked by time expiry -- like a real exam, once
    # time is up the student submits what they already saved; only NEW
    # answers are rejected (see the TIME_EXPIRED guard in PATCH /answer).
    mock_test = (
        db.query(MockTest)
        .filter(MockTest.id == mock_test_id, MockTest.user_id == user.id)
        .first()
    )
    if not mock_test:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Mock test not found"})
    if mock_test.status == "completed":
        raise HTTPException(
            status_code=400,
            detail={"code": "ALREADY_SUBMITTED", "message": "This mock test has already been submitted"},
        )

    questions = (
        db.query(MockTestQuestion)
        .filter(MockTestQuestion.mock_test_id == mock_test.id)
        .all()
    )
    questions_by_mcq = {q.mcq_id: q for q in questions}

    mcq_ids = [q.mcq_id for q in questions]
    mcqs = db.query(McqBank).filter(McqBank.id.in_(mcq_ids)).all()
    mcqs_by_id = {m.id: m for m in mcqs}

    correct_count = 0
    for ans in body.answers:
        q = questions_by_mcq.get(ans.mcq_id)
        mcq = mcqs_by_id.get(ans.mcq_id)
        if not q or not mcq:
            continue
        is_correct = ans.selected_option.upper() == mcq.correct_option.upper()
        q.selected_option = ans.selected_option.upper()
        q.is_correct = is_correct
        q.time_spent_ms = ans.time_spent_ms
        if is_correct:
            correct_count += 1

        db.add(
            McqAttempt(
                user_id=user.id,
                mcq_id=mcq.id,
                selected_option=ans.selected_option.upper(),
                is_correct=is_correct,
                time_spent_ms=ans.time_spent_ms,
                subject=mcq.subject,
                topic=mcq.topic,
                mock_test_id=mock_test.id,
            )
        )

    score = round((correct_count / mock_test.question_count) * 100) if mock_test.question_count else 0

    mock_test.status = "completed"
    mock_test.submitted_at = datetime.now(timezone.utc)
    mock_test.correct_count = correct_count
    mock_test.score = score

    db.commit()
    db.refresh(mock_test)

    return MockTestSubmitResponse(
        id=mock_test.id,
        score=mock_test.score,
        correct_count=mock_test.correct_count,
        question_count=mock_test.question_count,
        submitted_at=mock_test.submitted_at,
    )


@router.get("/{mock_test_id}/results", response_model=MockTestResultsResponse)
def get_mock_test_results(
    mock_test_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    mock_test = (
        db.query(MockTest)
        .filter(MockTest.id == mock_test_id, MockTest.user_id == user.id)
        .first()
    )
    if not mock_test:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Mock test not found"})

    if mock_test.status != "completed":
        raise HTTPException(status_code=400, detail="Test not yet completed")

    questions = (
        db.query(MockTestQuestion)
        .filter(MockTestQuestion.mock_test_id == mock_test.id)
        .order_by(MockTestQuestion.question_order)
        .all()
    )
    mcq_ids = [q.mcq_id for q in questions]
    mcqs = db.query(McqBank).filter(McqBank.id.in_(mcq_ids)).all()
    mcqs_by_id = {m.id: m for m in mcqs}

    result_questions = []
    for q in questions:
        mcq = mcqs_by_id.get(q.mcq_id)
        if not mcq:
            continue
        result_questions.append(
            MockTestResultQuestion(
                mcq_id=mcq.id,
                question_order=q.question_order,
                subject=mcq.subject,
                chapter_number=mcq.chapter_number,
                topic=mcq.topic,
                difficulty=mcq.difficulty,
                question_text=mcq.question_text,
                question_text_ur=mcq.question_text_ur,
                option_a=mcq.option_a,
                option_b=mcq.option_b,
                option_c=mcq.option_c,
                option_d=mcq.option_d,
                correct_option=mcq.correct_option,
                explanation=mcq.explanation,
                selected_option=q.selected_option,
                is_correct=q.is_correct,
            )
        )

    return MockTestResultsResponse(
        id=mock_test.id,
        test_type=mock_test.test_type,
        subject=mock_test.subject,
        question_count=mock_test.question_count,
        score=mock_test.score,
        correct_count=mock_test.correct_count,
        status=mock_test.status,
        started_at=mock_test.started_at,
        submitted_at=mock_test.submitted_at,
        questions=result_questions,
    )


@router.get("", response_model=list[MockTestListItem])
def list_mock_tests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tests = (
        db.query(MockTest)
        .filter(MockTest.user_id == user.id)
        .order_by(MockTest.started_at.desc())
        .all()
    )
    return tests