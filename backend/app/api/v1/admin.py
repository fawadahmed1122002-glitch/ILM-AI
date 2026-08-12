import os
import uuid
import shutil
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.api.deps import get_current_admin
from app.core.config import DATA_DIR
from app.models.user import User
from app.models.document import Document
from app.models.mcq_bank import McqBank
from app.models.payment import Payment
from app.schemas.admin import (
    DocumentUploadResponse, PendingMcqResponse, McqRejectRequest,
    AdminPlanChangeRequest, PaymentRecordResponse,
)
from app.rag.pdf_ingest import ingest_single_pdf
from app.services.payment_service import grant_pro_plan, grant_product, ALLOWED_METHODS
from sqlalchemy import func
from app.core.products import PRODUCT_CATALOG, PURCHASABLE_PRODUCTS
from app.services.mcq_generation_service import generate_mcqs_for_chapter

router = APIRouter(prefix="/admin", tags=["admin"])

PDF_STORAGE_ROOT = os.path.join(DATA_DIR, "pdfs", "_admin_uploads")
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
@router.post("/upload-pdf", response_model=DocumentUploadResponse)
def upload_pdf(
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
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_FILE_TYPE", "message": "Only PDF files are accepted."},
        )

    os.makedirs(PDF_STORAGE_ROOT, exist_ok=True)
    dest_path = os.path.join(PDF_STORAGE_ROOT, file.filename)
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
        db.commit()
        raise HTTPException(
            status_code=500,
            detail={"code": "INGESTION_FAILED", "message": f"PDF uploaded but ingestion failed: {str(e)}"},
        )

    db.commit()
    db.refresh(doc)
    return doc


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
