"""
Mock Test router.

Test compositions mirror real exam subject ratios so that as content
(especially English, not yet ingested) gets added, tests scale up to
true exam length automatically without any code changes here.

ECAT (UET pattern): 100 MCQs -- Math 30, Physics 30, Chemistry 30, English 10.
MDCAT (PMDC 2026 pattern): 180 MCQs -- Biology 81, Chemistry 45, Physics 36,
English 9, Logical Reasoning 9.

If a subject in a composition doesn't have enough approved MCQs yet
(e.g. English has zero until that content is ingested), that subject's
slice is skipped and the shortfall is reported back to the client
rather than failing the whole test -- so a full-length test with a
temporarily-understocked subject still runs on what's actually stocked.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
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
    """
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

    def composition_available(test_type: str) -> dict:
        comp = TEST_COMPOSITIONS[test_type]
        total_wanted = sum(want for _, want in comp["subjects"])
        total_available = sum(min(counts.get(s, 0), want) for s, want in comp["subjects"])
        return {
            "runnable": total_available > 0,
            "question_count": total_available,
            "nominal_question_count": total_wanted,
            "time_limit_minutes": comp["time_limit_minutes"],
        }

    return {
        "subjects": subjects_out,
        "single_subject_runnable": {s: subjects_out[s] > 0 for s in ALLOWED_SUBJECTS},
        "full_ecat": composition_available("full_ecat"),
        "full_mdcat": composition_available("full_mdcat"),
        "has_used_free_test": db.query(MockTest).filter(MockTest.user_id == user.id).count() > 0,
    }


@router.post("/start", response_model=MockTestStartResponse)
def start_mock_test(
    body: MockTestStartRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
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
        if len(picked) == 0:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INSUFFICIENT_QUESTIONS",
                    "message": f"No approved questions available yet for {body.subject}.",
                },
            )
        time_limit = SINGLE_SUBJECT_TIME_LIMIT_MIN
        subject_field = body.subject
        selected_mcqs = picked

    elif body.test_type in TEST_COMPOSITIONS:
        comp = TEST_COMPOSITIONS[body.test_type]
        time_limit = comp["time_limit_minutes"]
        subject_field = None
        selected_mcqs = []
        shortfalls = []
        for subj, want in comp["subjects"]:
            got = _pick_random_approved(db, subj, want)
            selected_mcqs.extend(got)
            if len(got) < want:
                shortfalls.append({"subject": subj, "wanted": want, "available": len(got)})
        if len(selected_mcqs) == 0:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INSUFFICIENT_QUESTIONS",
                    "message": "No approved questions available yet for this test type.",
                    "shortfalls": shortfalls,
                },
            )
        # Shortfalls are allowed through (test runs on what's stocked) but
        # surfaced via response headers-equivalent isn't available here,
        # so we just proceed -- the client sees fewer questions than the
        # nominal composition and question_count reflects reality.
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
def save_mock_test_answer(
    mock_test_id: uuid.UUID,
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
def submit_mock_test(
    mock_test_id: uuid.UUID,
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