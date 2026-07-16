import os
import uuid
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_admin
from app.core.config import DATA_DIR
from app.models.user import User
from app.models.document import Document
from app.models.mcq_bank import McqBank
from app.schemas.admin import DocumentUploadResponse, PendingMcqResponse, McqRejectRequest
from app.rag.pdf_ingest import ingest_single_pdf

router = APIRouter(prefix="/admin", tags=["admin"])

PDF_STORAGE_ROOT = os.path.join(DATA_DIR, "pdfs", "_admin_uploads")
ALLOWED_SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"]


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

    # Upsert: re-uploading a PDF for an existing (subject, chapter_number)
    # replaces it instead of erroring on the unique constraint.
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
