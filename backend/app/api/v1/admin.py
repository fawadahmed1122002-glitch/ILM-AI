import os
import uuid
import shutil
import logging
import threading
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, or_
from app.db.session import get_db, SessionLocal
from app.api.deps import get_current_admin
from app.core.config import DATA_DIR
from app.models.user import User
from app.models.document import Document
from app.models.mcq_bank import McqBank
from app.models.payment import Payment
from app.schemas.admin import (
    PendingMcqResponse, McqRejectRequest,
    AdminPlanChangeRequest, PaymentRecordResponse, McqBankResponse,
    McqBankMetaResponse, McqBankStatusCounts,
    AdminUserResponse, AdminUserListResponse,
)
from app.rag.pdf_ingest import ingest_single_pdf, _get_collection
from app.services.payment_service import grant_pro_plan, grant_product
from app.core.products import PRODUCT_CATALOG, PURCHASABLE_PRODUCTS
from app.services.mcq_generation_service import (
    generate_mcqs_for_chapter,
    validate_chapter_for_generation,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

PDF_STORAGE_ROOT = os.path.join(DATA_DIR, "pdfs", "_admin_uploads")
PDF_ROOT = os.path.realpath(os.path.join(DATA_DIR, "pdfs"))
MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024  # 50MB upload limit


def _ingest_pdf_in_background(
    doc_id: uuid.UUID,
    dest_path: str,
    subject: str,
    chapter_number: int,
    chapter_title: str,
):
    """Runs after the 202 response is sent. Uses its own DB session since
    the request-scoped one is closed by then."""
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return
        try:
            chunk_count = ingest_single_pdf(
                pdf_path=dest_path,
                subject_display=subject,
                chapter_number=chapter_number,
                chapter_title=chapter_title,
                doc_id=str(doc.id),
            )
            doc.status = "ready"
            doc.chunk_count = chunk_count
            doc.error_message = None
            doc.completed_at = datetime.now(timezone.utc)
            doc.updated_at = datetime.now(timezone.utc)
        except Exception as e:
            doc.status = "failed"
            doc.error_message = str(e)
            doc.completed_at = datetime.now(timezone.utc)
            doc.updated_at = datetime.now(timezone.utc)
            logger.error(
                "INGESTION_FAILED: document %s (%s ch%s): %s",
                doc_id, subject, chapter_number, e,
            )
        db.commit()
    finally:
        db.close()


# In-memory job registry for background MCQ generation: /mcqs/generate
# returns 202 immediately, so the admin UI polls /mcqs/generation-status
# for the outcome (mirrors how PDF ingestion reports via Document.status).
# Single-worker deployment, so a process-local dict is enough; a restart
# simply forgets old jobs (they read as "idle").
_mcq_generation_jobs: dict[tuple[str, int], dict] = {}
_mcq_jobs_lock = threading.Lock()


def _generate_mcqs_in_background(subject: str, chapter_number: int, force: bool):
    """Runs after the 202 response is sent. Uses its own DB session since
    the request-scoped one is closed by then."""
    db = SessionLocal()
    try:
        result = generate_mcqs_for_chapter(
            subject=subject, chapter_number=chapter_number, db=db, force=force
        )
        with _mcq_jobs_lock:
            _mcq_generation_jobs[(subject, chapter_number)] = {
                "status": "completed",
                "result": result,
                "message": None,
            }
    except ValueError as e:
        # State changed between accept and run (e.g. another run just
        # generated rows for this chapter) -- record it for the poller.
        with _mcq_jobs_lock:
            _mcq_generation_jobs[(subject, chapter_number)] = {
                "status": "failed",
                "result": None,
                "message": str(e),
            }
        logger.warning("MCQ_GENERATION_REJECTED: %s ch%s: %s", subject, chapter_number, e)
    except Exception as e:
        with _mcq_jobs_lock:
            _mcq_generation_jobs[(subject, chapter_number)] = {
                "status": "failed",
                "result": None,
                "message": str(e),
            }
        logger.error("MCQ_GENERATION_FAILED: %s ch%s: %s", subject, chapter_number, e)
    finally:
        db.close()


ALLOWED_SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"]
ALLOWED_PLANS = ["free", "pro"]
ALLOWED_METHODS = ["jazzcash", "easypaisa", "manual", "safepay"]
PRO_PLAN_DURATION_DAYS = 30


@router.get("/revenue")
def get_revenue_summary(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Revenue summary from completed payments: totals by method, active Pro
    subscriber count, estimated MRR, and daily revenue breakdown.
    """
    by_method = (
        db.query(
            Payment.method,
            func.count(Payment.id).label("transactions"),
            func.sum(Payment.amount).label("revenue_pkr"),
        )
        .filter(Payment.status == "completed")
        .group_by(Payment.method)
        .all()
    )

    active_pro_users = (
        db.query(func.count(func.distinct(Payment.user_id)))
        .filter(Payment.status == "completed", Payment.valid_until > datetime.now(timezone.utc))
        .scalar()
    )

    daily = (
        db.query(
            func.date(Payment.created_at).label("day"),
            func.count(Payment.id).label("transactions"),
            func.sum(Payment.amount).label("revenue_pkr"),
        )
        .filter(Payment.status == "completed")
        .group_by(func.date(Payment.created_at))
        .order_by(func.date(Payment.created_at).desc())
        .limit(30)
        .all()
    )

    total_revenue = sum(float(m.revenue_pkr) for m in by_method)
    total_transactions = sum(m.transactions for m in by_method)

    return {
        "total_revenue_pkr": total_revenue,
        "total_transactions": total_transactions,
        "active_pro_users": active_pro_users,
        "estimated_mrr_pkr": active_pro_users * 799,
        "by_method": [
            {"method": m.method, "transactions": m.transactions, "revenue_pkr": float(m.revenue_pkr)}
            for m in by_method
        ],
        "daily_last_30_days": [
            {"day": str(d.day), "transactions": d.transactions, "revenue_pkr": float(d.revenue_pkr)}
            for d in daily
        ],
    }


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Aggregate counts for the /admin dashboard hub: MCQ totals per
    subject and registered-user counts per plan. Pure COUNT queries
    over the existing mcq_bank/users tables -- no new tracking.
    """
    mcq_rows = (
        db.query(
            McqBank.subject,
            func.count(McqBank.id)
            .filter(McqBank.is_verified == True, McqBank.rejected_at.is_(None))
            .label("approved"),
            func.count(McqBank.id)
            .filter(McqBank.is_verified == False, McqBank.rejected_at.is_(None))
            .label("pending"),
        )
        .group_by(McqBank.subject)
        .all()
    )

    by_subject = {
        subject: {"approved": 0, "pending": 0} for subject in ALLOWED_SUBJECTS
    }
    for subject, approved, pending in mcq_rows:
        by_subject.setdefault(subject, {"approved": 0, "pending": 0})
        by_subject[subject]["approved"] = approved
        by_subject[subject]["pending"] = pending

    plan_rows = (
        db.query(User.plan, func.count(User.id))
        .group_by(User.plan)
        .all()
    )

    return {
        "mcqs": {
            "total_approved": sum(s["approved"] for s in by_subject.values()),
            "total_pending": sum(s["pending"] for s in by_subject.values()),
            "by_subject": by_subject,
        },
        "users": {
            "total": sum(count for _, count in plan_rows),
            "by_plan": {plan: count for plan, count in plan_rows},
        },
    }


@router.post("/upload-pdf", status_code=202)
def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject: str = Form(...),
    chapter_number: int = Form(...),
    chapter_title: str = Form(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if subject not in ALLOWED_SUBJECTS:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_SUBJECT", "message": f"Subject must be one of: {', '.join(ALLOWED_SUBJECTS)}"},
        )
    # Sanitize the uploaded filename before any path operations so names
    # like ../../etc/passwd can never escape PDF_STORAGE_ROOT.
    safe_name = secure_filename(file.filename or "")
    if not safe_name or not safe_name.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_FILE_TYPE", "message": "Only PDF files are accepted."},
        )

    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail={"code": "FILE_TOO_LARGE", "message": "File exceeds the 50MB size limit."},
        )

    if (file.content_type or "").lower() != "application/pdf":
        raise HTTPException(
            status_code=415,
            detail={"code": "UNSUPPORTED_MEDIA_TYPE", "message": "Only PDF files are accepted (application/pdf)."},
        )

    os.makedirs(PDF_STORAGE_ROOT, exist_ok=True)
    # UUID prefix prevents silent overwrites of previously uploaded files.
    dest_path = os.path.join(PDF_STORAGE_ROOT, f"{uuid.uuid4().hex}_{safe_name}")
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    existing_doc = db.query(Document).filter(
        Document.subject == subject,
        Document.chapter_number == chapter_number,
    ).first()

    if existing_doc:
        doc = existing_doc
        doc.chapter_title = chapter_title
        doc.file_path = dest_path
        doc.chunk_count = 0
        doc.status = "processing"
    else:
        doc = Document(
            subject=subject,
            chapter_number=chapter_number,
            chapter_title=chapter_title,
            file_path=dest_path,
            chunk_count=0,
            status="processing",
        )
        db.add(doc)

    db.commit()
    db.refresh(doc)

    # Ingestion (embed + ChromaDB upsert) is the slow part -- run it after
    # the response is returned so large PDFs don't block the worker.
    background_tasks.add_task(
        _ingest_pdf_in_background,
        doc.id,
        dest_path,
        subject,
        chapter_number,
        chapter_title,
    )

    return {"message": "Ingestion started", "document_id": str(doc.id)}


# ------------------------------------------------------------------
# Chapter ingestion console (/admin/ingestion UI)
#
# Reuses the documents table as the ingestion job record (it already
# carries subject/chapter/status/chunk_count with a UNIQUE(subject,
# chapter_number) constraint) plus the error_message/completed_at
# columns from migration 008.
# ------------------------------------------------------------------


def _ingest_job_payload(doc: Document) -> dict:
    return {
        "id": str(doc.id),
        "subject": doc.subject,
        "chapter_number": doc.chapter_number,
        "chapter_name": doc.chapter_title,
        "source_filename": os.path.basename(doc.file_path) if doc.file_path else None,
        # Admin-only field: lets the UI's Retry button re-trigger the
        # same file without a fresh upload.
        "file_path": doc.file_path,
        "status": doc.status,
        "chunk_count": doc.chunk_count,
        "error_message": doc.error_message,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "completed_at": doc.completed_at.isoformat() if doc.completed_at else None,
    }


def _chroma_chunk_count(subject: str, chapter_number: int) -> int:
    """Ground-truth chunk count for a subject/chapter straight from the
    vector store — catches chapters ingested outside the documents table
    (e.g. the legacy ingestion/ingest_subject.py script)."""
    try:
        existing = _get_collection().get(
            where={"$and": [{"subject": {"$eq": subject}}, {"chapter": {"$eq": chapter_number}}]}
        )
        return len(existing["ids"])
    except Exception:
        return 0


@router.post("/ingest")
def ingest_chapter(
    file: UploadFile | None = File(None),
    source_path: str | None = Form(None),
    subject: str = Form(...),
    chapter_number: int = Form(...),
    chapter_name: str = Form(...),
    replace: bool = Form(False),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Ingests one chapter PDF into ChromaDB. Accepts either an uploaded
    file or a path to an existing file under data/pdfs/. Runs the
    chunk → embed → store pipeline synchronously (a warm run takes ~2-3s
    per chapter), then returns the finished job row.

    If the subject+chapter already exists (documents row OR chunks in
    ChromaDB), the request is rejected with CHAPTER_EXISTS unless
    replace=true confirms re-ingest and replacement.
    """
    if subject not in ALLOWED_SUBJECTS:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_SUBJECT", "message": f"Subject must be one of: {', '.join(ALLOWED_SUBJECTS)}"},
        )
    if (file is None) == (source_path is None):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_SOURCE", "message": "Provide exactly one of: an uploaded PDF file, or source_path to an existing file under data/pdfs/."},
        )

    # --- Resolve the PDF to ingest -----------------------------------
    if file is not None:
        # Same validation as /upload-pdf: sanitized name, .pdf extension,
        # size cap, and content type.
        safe_name = secure_filename(file.filename or "")
        if not safe_name or not safe_name.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_FILE_TYPE", "message": "Only PDF files are accepted."},
            )
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)
        if file_size > MAX_PDF_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail={"code": "FILE_TOO_LARGE", "message": "File exceeds the 50MB size limit."},
            )
        if (file.content_type or "").lower() != "application/pdf":
            raise HTTPException(
                status_code=415,
                detail={"code": "UNSUPPORTED_MEDIA_TYPE", "message": "Only PDF files are accepted (application/pdf)."},
            )
        os.makedirs(PDF_STORAGE_ROOT, exist_ok=True)
        # UUID prefix prevents silent overwrites of previously uploaded files.
        dest_path = os.path.join(PDF_STORAGE_ROOT, f"{uuid.uuid4().hex}_{safe_name}")
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    else:
        # Existing-file mode: resolve inside data/pdfs only, so paths like
        # ../../etc/passwd are rejected instead of read.
        resolved = os.path.realpath(os.path.expanduser(source_path))
        if not resolved.startswith(PDF_ROOT + os.sep):
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_SOURCE_PATH", "message": "source_path must point to a file inside data/pdfs/."},
            )
        if not os.path.isfile(resolved) or not resolved.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_FILE_TYPE", "message": "source_path must be an existing PDF file."},
            )
        dest_path = resolved

    # --- Duplicate guard ------------------------------------------------
    existing_doc = db.query(Document).filter(
        Document.subject == subject,
        Document.chapter_number == chapter_number,
    ).first()
    if existing_doc and existing_doc.status == "processing":
        raise HTTPException(
            status_code=409,
            detail={"code": "INGESTION_IN_PROGRESS", "message": f"{subject} chapter {chapter_number} is already being ingested."},
        )
    existing_chunks = _chroma_chunk_count(subject, chapter_number)
    if (existing_doc or existing_chunks > 0) and not replace:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "CHAPTER_EXISTS",
                "message": (
                    f"{subject} chapter {chapter_number} is already ingested"
                    f" ({existing_chunks} chunks in the vector store). "
                    "Confirm re-ingest and replace to overwrite it."
                ),
            },
        )

    # --- Job row ---------------------------------------------------------
    if existing_doc:
        doc = existing_doc
        doc.chapter_title = chapter_name
        doc.file_path = dest_path
    else:
        doc = Document(
            subject=subject,
            chapter_number=chapter_number,
            chapter_title=chapter_name,
            file_path=dest_path,
        )
        db.add(doc)
    doc.status = "processing"
    doc.chunk_count = 0
    doc.error_message = None
    doc.completed_at = None
    doc.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(doc)

    # --- Synchronous ingestion (~2-3s per chapter once the embedding
    # model is warm; see timing tests). ingest_single_pdf is untouched.
    try:
        chunk_count = ingest_single_pdf(
            pdf_path=dest_path,
            subject_display=subject,
            chapter_number=chapter_number,
            chapter_title=chapter_name,
            doc_id=str(doc.id),
        )
        doc.status = "ready"
        doc.chunk_count = chunk_count
        doc.error_message = None
        doc.completed_at = datetime.now(timezone.utc)
        doc.updated_at = datetime.now(timezone.utc)

        # On replace, drop chunks for this subject/chapter that don't belong
        # to this document (e.g. leftovers from the legacy ingest_subject.py
        # script) so the chapter is truly replaced, not duplicated.
        if replace:
            collection = _get_collection()
            stored = collection.get(
                where={"$and": [{"subject": {"$eq": subject}}, {"chapter": {"$eq": chapter_number}}]}
            )
            prefix = f"{doc.id}_"
            orphan_ids = [eid for eid in stored["ids"] if not eid.startswith(prefix)]
            if orphan_ids:
                collection.delete(ids=orphan_ids)
    except Exception as e:
        doc.status = "failed"
        doc.error_message = str(e)
        doc.completed_at = datetime.now(timezone.utc)
        doc.updated_at = datetime.now(timezone.utc)
        logger.error("INGESTION_FAILED: %s ch%s: %s", subject, chapter_number, e)

    db.commit()
    db.refresh(doc)
    return _ingest_job_payload(doc)


@router.get("/ingest/status")
def ingest_status(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """All ingestion job rows, most recently active first — poll target
    for the /admin/ingestion UI."""
    docs = (
        db.query(Document)
        .order_by(Document.updated_at.desc())
        .limit(100)
        .all()
    )
    return {"jobs": [_ingest_job_payload(d) for d in docs]}


@router.get("/coverage")
def get_ingestion_coverage(
    admin: User = Depends(get_current_admin),
):
    """
    Ground truth of what is actually in ChromaDB right now, queried
    directly from the vector store (not the documents table), grouped
    per subject with chunk counts per chapter.
    """
    collection = _get_collection()
    result = collection.get(include=["metadatas"])

    by_subject: dict[str, dict[int, int]] = {}
    chapter_names: dict[str, dict[int, str]] = {}
    for meta in result["metadatas"]:
        subject_name = meta.get("subject")
        chapter = meta.get("chapter")
        if not subject_name or chapter is None:
            continue
        try:
            chapter_number = int(chapter)
        except (TypeError, ValueError):
            continue
        by_subject.setdefault(subject_name, {})
        by_subject[subject_name][chapter_number] = by_subject[subject_name].get(chapter_number, 0) + 1
        name = meta.get("chapter_name")
        if name:
            chapter_names.setdefault(subject_name, {}).setdefault(chapter_number, name)

    subjects = []
    for subject_name in sorted(by_subject):
        chapters = by_subject[subject_name]
        subjects.append({
            "subject": subject_name,
            "total_chunks": sum(chapters.values()),
            "chapter_count": len(chapters),
            "chapters": [
                {
                    "chapter_number": n,
                    "chunk_count": chapters[n],
                    "chapter_name": chapter_names.get(subject_name, {}).get(n),
                }
                for n in sorted(chapters)
            ],
        })

    return {
        "total_chunks": len(result["ids"]),
        "subjects": subjects,
    }


@router.get("/mcqs/pending", response_model=list[PendingMcqResponse])
def list_pending_mcqs(
    subject: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(McqBank).filter(
        McqBank.is_verified == False,
        McqBank.rejected_at.is_(None),
    )
    if subject:
        query = query.filter(McqBank.subject == subject)
    return query.order_by(McqBank.created_at.asc()).limit(100).all()


@router.patch("/mcqs/{mcq_id}/approve")
def approve_mcq(
    mcq_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    mcq = db.query(McqBank).filter(McqBank.id == mcq_id).first()
    if not mcq:
        raise HTTPException(status_code=404, detail={"code": "MCQ_NOT_FOUND", "message": "MCQ not found."})

    # Approve is a full override of any prior rejection: clear the
    # rejection state so the MCQ reads as approved everywhere
    # (student-facing pulls, pending list, and bank counts all key off
    # is_verified + rejected_at IS NULL).
    mcq.is_verified = True
    mcq.rejected_at = None
    mcq.reject_reason = None
    db.commit()
    return {"id": str(mcq_id), "status": "approved"}


@router.patch("/mcqs/{mcq_id}/reject")
def reject_mcq(
    mcq_id: uuid.UUID,
    payload: McqRejectRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    mcq = db.query(McqBank).filter(McqBank.id == mcq_id).first()
    if not mcq:
        raise HTTPException(status_code=404, detail={"code": "MCQ_NOT_FOUND", "message": "MCQ not found."})

    mcq.rejected_at = datetime.now(timezone.utc)
    mcq.reject_reason = payload.reason
    db.commit()
    return {"id": str(mcq_id), "status": "rejected", "reason": payload.reason}


@router.post("/mcqs/generate", status_code=202)
def generate_mcqs_endpoint(
    background_tasks: BackgroundTasks,
    subject: str,
    chapter_number: int,
    force: bool = False,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Kicks off MCQ generation in the background: Groq round-trips can take
    tens of seconds, so -- like PDF ingestion -- the endpoint validates
    fast, returns 202, and lets the client poll /mcqs/generation-status.
    """
    key = (subject, chapter_number)
    with _mcq_jobs_lock:
        job = _mcq_generation_jobs.get(key)
        if job and job["status"] == "running":
            # Double-click guard: a generation for this chapter is already
            # in flight, so a second request would just duplicate rows.
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "GENERATION_IN_PROGRESS",
                    "message": f"MCQ generation for {subject} chapter {chapter_number} is already running.",
                },
            )
    try:
        validate_chapter_for_generation(subject, chapter_number, db, force)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"code": "GENERATION_FAILED", "message": str(e)})

    with _mcq_jobs_lock:
        _mcq_generation_jobs[key] = {"status": "running", "result": None, "message": None}
    background_tasks.add_task(_generate_mcqs_in_background, subject, chapter_number, force)
    return {"message": "MCQ generation started", "subject": subject, "chapter_number": chapter_number}


@router.get("/mcqs/generation-status")
def mcq_generation_status(
    subject: str,
    chapter_number: int,
    admin: User = Depends(get_current_admin),
):
    """
    Poll target for /mcqs/generate: status is idle (never ran in this
    process), running, completed (result = the generation summary), or
    failed (message = why). A restart clears the registry back to idle.
    """
    with _mcq_jobs_lock:
        job = _mcq_generation_jobs.get((subject, chapter_number))
    if not job:
        return {"status": "idle", "result": None, "message": None}
    return job

@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    q: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Read-only user directory for the /admin/users UI: paginated list of
    users (newest first) with optional email/full-name search. Returns
    the total match count alongside the page so the browser can render
    pagination without fetching every row. No mutations here -- plan
    changes still go through POST /users/{user_id}/plan.
    """
    query = db.query(User)
    if q is not None and q.strip():
        escaped = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        query = query.filter(
            or_(User.email.ilike(pattern), User.full_name.ilike(pattern))
        )

    total = query.count()
    # id tiebreaker keeps offset pagination stable across page fetches
    users = (
        query.order_by(User.created_at.desc(), User.id)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return AdminUserListResponse(
        total=total,
        users=[
            AdminUserResponse(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                role=u.role,
                plan=u.plan,
                product_id=u.product_id,
                target_tracks=u.target_tracks,
                current_class=u.current_class,
                is_email_verified=u.is_email_verified,
                created_at=u.created_at,
            )
            for u in users
        ],
    )


@router.post("/users/{user_id}/plan", response_model=PaymentRecordResponse)
def change_user_plan(
    user_id: uuid.UUID,
    payload: AdminPlanChangeRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Manually flip a user's plan after confirming payment outside the system
    (e.g. WhatsApp screenshot). Delegates to grant_product() if a
    product_id is given, otherwise falls back to the legacy
    grant_pro_plan() (assigns "legacy_full_access") for backward
    compatibility with older callers that don't know about products yet.
    """
    if payload.plan not in ALLOWED_PLANS:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_PLAN", "message": f"Plan must be one of: {', '.join(ALLOWED_PLANS)}"},
        )
    if payload.plan != "pro":
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail={"code": "USER_NOT_FOUND", "message": "User not found."})
        user.plan = payload.plan
        user.product_id = None  # clear product on downgrade -- no active product on free plan

        # Persist a real downgrade audit row so every plan transition is
        # traceable in payments (audit-trail integrity). valid_from ==
        # valid_until == now marks the exact moment the subscription ended.
        now = datetime.now(timezone.utc)
        payment = Payment(
            user_id=user_id,
            amount=0,
            currency="PKR",
            method=payload.method,
            status="completed",
            transaction_ref=payload.transaction_ref,
            plan=payload.plan,
            product_id=None,
            valid_from=now,
            valid_until=now,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return payment

    product_id = getattr(payload, "product_id", None)

    try:
        if product_id:
            if product_id not in PRODUCT_CATALOG:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "INVALID_PRODUCT", "message": f"Unknown product_id: {product_id}. Valid: {', '.join(PRODUCT_CATALOG.keys())}"},
                )
            payment = grant_product(
                db=db,
                user_id=user_id,
                product_id=product_id,
                amount=payload.amount,
                method=payload.method,
                transaction_ref=payload.transaction_ref,
            )
        else:
            payment = grant_pro_plan(
                db=db,
                user_id=user_id,
                amount=payload.amount,
                method=payload.method,
                transaction_ref=payload.transaction_ref,
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"code": "GRANT_FAILED", "message": str(e)})

    return payment


@router.get("/products")
def list_products(
    admin: User = Depends(get_current_admin),
):
    """Returns the purchasable product catalog -- used by the /upgrade
    page to render available plans, and here for admin visibility."""
    return {"products": PURCHASABLE_PRODUCTS}

@router.get("/payments", response_model=list[PaymentRecordResponse])
def list_payment_audit_log(
    user_id: uuid.UUID | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Audit log of all manual plan changes / payments, most recent first."""
    query = db.query(Payment)
    if user_id:
        query = query.filter(Payment.user_id == user_id)
    return query.order_by(Payment.created_at.desc()).limit(min(limit, 200)).all()

@router.get("/mcq-coverage")
def get_mcq_coverage(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Approved (is_verified=True) MCQ counts per subject/difficulty.
    Used to check diagnostic-pool readiness before the onboarding
    diagnostic flow ships -- each subject needs enough verified
    questions to fill a 5-8 question diagnostic without repeats.
    """
    results = (
        db.query(
            McqBank.subject,
            McqBank.difficulty,
            func.count(McqBank.id).label("count"),
        )
        .filter(McqBank.is_verified == True, McqBank.rejected_at.is_(None))
        .group_by(McqBank.subject, McqBank.difficulty)
        .all()
    )

    coverage: dict[str, dict] = {}
    for subject in ALLOWED_SUBJECTS:
        coverage[subject] = {"easy": 0, "medium": 0, "hard": 0, "total": 0}

    for subject, difficulty, count in results:
        coverage.setdefault(subject, {"easy": 0, "medium": 0, "hard": 0, "total": 0})
        coverage[subject][difficulty] = count
        coverage[subject]["total"] += count

    DIAGNOSTIC_MINIMUM = 8
    below_minimum = [s for s, d in coverage.items() if d["total"] < DIAGNOSTIC_MINIMUM]

    return {
        "coverage": coverage,
        "diagnostic_ready": len(below_minimum) == 0,
        "subjects_below_minimum": below_minimum,
    }



@router.get("/mcqs/chapter-status")
def get_chapter_mcq_status(
    subject: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Per-chapter MCQ counts for a subject -- drives the bulk MCQ
    generation admin UI so it can show which chapters still need
    generation vs which are done.
    """
    if subject not in ALLOWED_SUBJECTS:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_SUBJECT", "message": f"Subject must be one of: {', '.join(ALLOWED_SUBJECTS)}"},
        )

    docs = (
        db.query(Document)
        .filter(Document.subject == subject)
        .order_by(Document.chapter_number)
        .all()
    )

    mcq_counts = dict(
        db.query(McqBank.document_id, func.count(McqBank.id))
        .filter(McqBank.subject == subject)
        .group_by(McqBank.document_id)
        .all()
    )
    verified_counts = dict(
        db.query(McqBank.document_id, func.count(McqBank.id))
        .filter(McqBank.subject == subject, McqBank.is_verified == True)
        .group_by(McqBank.document_id)
        .all()
    )

    chapters = []
    for doc in docs:
        total = mcq_counts.get(doc.id, 0)
        verified = verified_counts.get(doc.id, 0)
        chapters.append({
            "document_id": str(doc.id),
            "chapter_number": doc.chapter_number,
            "chapter_title": doc.chapter_title,
            "chunk_count": doc.chunk_count,
            "mcq_total": total,
            "mcq_verified": verified,
            "status": "empty" if total == 0 else ("partial" if total < 5 else "done"),
        })

    return {"subject": subject, "chapters": chapters}


@router.get("/mcqs/bank", response_model=list[McqBankResponse])
def get_mcq_bank(
    subject: str,
    chapter_number: int | None = None,
    status: str | None = None,
    q: str | None = None,
    limit: int | None = Query(default=None, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Full browsable MCQ bank for a subject (optionally filtered to one
    chapter) -- includes verified, pending, and rejected questions,
    unlike /mcqs/pending which only shows unverified ones.

    limit/offset are opt-in: without limit the endpoint returns every
    row exactly as before. status ("verified"/"pending"/"rejected") and
    q (question-text search) narrow the result set server-side so the
    paginated browser can filter without fetching the full bank.
    """
    if subject not in ALLOWED_SUBJECTS:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_SUBJECT", "message": f"Subject must be one of: {', '.join(ALLOWED_SUBJECTS)}"},
        )

    query = db.query(McqBank).filter(McqBank.subject == subject)
    if chapter_number is not None:
        query = query.filter(McqBank.chapter_number == chapter_number)

    if status is not None:
        if status == "verified":
            query = query.filter(McqBank.rejected_at.is_(None), McqBank.is_verified.is_(True))
        elif status == "pending":
            query = query.filter(McqBank.rejected_at.is_(None), McqBank.is_verified.is_(False))
        elif status == "rejected":
            query = query.filter(McqBank.rejected_at.isnot(None))
        else:
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_STATUS", "message": "status must be one of: verified, pending, rejected"},
            )

    if q is not None and q.strip():
        escaped = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        query = query.filter(
            or_(
                McqBank.question_text.ilike(pattern),
                McqBank.question_text_ur.ilike(pattern),
            )
        )

    # id tiebreaker keeps offset pagination stable across page fetches
    query = query.order_by(McqBank.chapter_number, McqBank.created_at, McqBank.id)
    if limit is not None:
        query = query.offset(offset).limit(limit)

    mcqs = query.all()

    return [
        McqBankResponse(
            id=m.id,
            subject=m.subject,
            chapter_number=m.chapter_number,
            topic=m.topic,
            difficulty=m.difficulty,
            question_text=m.question_text,
            question_text_ur=m.question_text_ur,
            option_a=m.option_a,
            option_b=m.option_b,
            option_c=m.option_c,
            option_d=m.option_d,
            correct_option=m.correct_option,
            explanation=m.explanation,
            is_verified=m.is_verified,
            rejected_at=m.rejected_at.isoformat() if m.rejected_at else None,
        )
        for m in mcqs
    ]


@router.get("/mcqs/bank/meta", response_model=McqBankMetaResponse)
def get_mcq_bank_meta(
    subject: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Distinct chapter numbers plus per-status row counts for a subject's
    MCQ bank -- lets the paginated bank browser render its chapter
    filter and header summary without fetching every row.
    """
    if subject not in ALLOWED_SUBJECTS:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_SUBJECT", "message": f"Subject must be one of: {', '.join(ALLOWED_SUBJECTS)}"},
        )

    chapters = [
        row[0]
        for row in db.query(McqBank.chapter_number)
        .filter(McqBank.subject == subject)
        .distinct()
        .order_by(McqBank.chapter_number)
        .all()
    ]

    total, verified, pending, rejected = db.query(
        func.count(McqBank.id),
        func.count(case((McqBank.rejected_at.is_(None) & McqBank.is_verified.is_(True), 1))),
        func.count(case((McqBank.rejected_at.is_(None) & McqBank.is_verified.is_(False), 1))),
        func.count(case((McqBank.rejected_at.isnot(None), 1))),
    ).filter(McqBank.subject == subject).one()

    return McqBankMetaResponse(
        chapters=chapters,
        counts=McqBankStatusCounts(
            total=total, verified=verified, pending=pending, rejected=rejected
        ),
    )
