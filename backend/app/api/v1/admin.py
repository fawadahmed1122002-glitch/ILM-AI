import os
import uuid
import shutil
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
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
)
from app.rag.pdf_ingest import ingest_single_pdf
from app.services.payment_service import grant_pro_plan, grant_product, ALLOWED_METHODS
from sqlalchemy import func
from app.core.products import PRODUCT_CATALOG, PURCHASABLE_PRODUCTS
from app.services.mcq_generation_service import generate_mcqs_for_chapter

router = APIRouter(prefix="/admin", tags=["admin"])

PDF_STORAGE_ROOT = os.path.join(DATA_DIR, "pdfs", "_admin_uploads")
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
            doc.updated_at = datetime.utcnow()
        except Exception as e:
            doc.status = "failed"
            print(f"⚠️  INGESTION_FAILED: document {doc_id} ({subject} ch{chapter_number}): {e}")
        db.commit()
    finally:
        db.close()
ALLOWED_SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"]
ALLOWED_PLANS = ["free", "pro"]
ALLOWED_METHODS = ["jazzcash", "easypaisa", "manual"]
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

    mcq.is_verified = True
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

    mcq.rejected_at = datetime.utcnow()
    mcq.reject_reason = payload.reason
    db.commit()
    return {"id": str(mcq_id), "status": "rejected", "reason": payload.reason}


@router.post("/mcqs/generate")
def generate_mcqs_endpoint(
    subject: str,
    chapter_number: int,
    force: bool = False,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    try:
        result = generate_mcqs_for_chapter(subject=subject, chapter_number=chapter_number, db=db, force=force)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"code": "GENERATION_FAILED", "message": str(e)})
    return result

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
        db.commit()
        return PaymentRecordResponse(
            id=uuid.uuid4(), user_id=user_id, amount=0, currency="PKR",
            method=payload.method, status="completed", transaction_ref=payload.transaction_ref,
            plan=payload.plan, valid_from=datetime.now(timezone.utc), valid_until=None,
        )

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
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Full browsable MCQ bank for a subject (optionally filtered to one
    chapter) -- includes verified, pending, and rejected questions,
    unlike /mcqs/pending which only shows unverified ones.
    """
    if subject not in ALLOWED_SUBJECTS:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_SUBJECT", "message": f"Subject must be one of: {', '.join(ALLOWED_SUBJECTS)}"},
        )

    query = db.query(McqBank).filter(McqBank.subject == subject)
    if chapter_number is not None:
        query = query.filter(McqBank.chapter_number == chapter_number)

    mcqs = query.order_by(McqBank.chapter_number, McqBank.created_at).all()

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
