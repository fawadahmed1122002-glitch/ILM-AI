"""
Single-PDF ingestion for the admin upload endpoint.
Separate from ingestion/ingest_subject.py (which batch-processes a subject
folder). This handles one admin-uploaded file at a time and reuses the
same chunking logic.
"""
import re
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import chromadb

from app.core.config import CHROMA_DB_PATH, COLLECTION_NAME

_model = None
_client = None


def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _get_collection():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    return _client.get_or_create_collection(name=COLLECTION_NAME)


def load_pdf_text(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += (page.extract_text() or "") + "\n"
    return text


def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(\d+\.\d+(?:\.\d+)*)\s", r"\n\n\1 ", text)
    text = re.sub(r"(Chapter\s*#\s*\d+)", r"\n\n\1", text)
    return text.strip()


def fix_missing_spaces(text: str) -> str:
    return re.sub(r"([a-z])([A-Z])", r"\1 \2", text)


def chunk_by_sections(text: str, max_chunk_size: int = 800):
    pattern = r"(?=\n\n\d+\.\d+(?:\.\d+)*\s|\n\nChapter\s*#\s*\d+)"
    sections = re.split(pattern, text)
    sections = [s.strip() for s in sections if len(s.strip()) >= 100]

    fallback_splitter = RecursiveCharacterTextSplitter(
        chunk_size=max_chunk_size,
        chunk_overlap=50,
        separators=["\n\n", "\n", ". ", " "],
        length_function=len,
    )

    final_chunks = []
    for section in sections:
        if len(section) <= max_chunk_size:
            final_chunks.append(section)
        else:
            sub_chunks = fallback_splitter.split_text(section)
            final_chunks.extend([c for c in sub_chunks if len(c) >= 100])
    return final_chunks


def ingest_single_pdf(pdf_path: str, subject_display: str, chapter_number: int, chapter_title: str, doc_id: str) -> int:
    """
    Ingests one PDF into ChromaDB. Returns the number of chunks stored.
    Raises an exception on failure — caller is responsible for updating
    the Document row's status accordingly.
    """
    raw_text = load_pdf_text(pdf_path)
    if len(raw_text.strip()) == 0:
        raise ValueError("No text extracted — PDF may be scanned/image-only and needs OCR.")

    cleaned = fix_missing_spaces(clean_text(raw_text))
    chunks = chunk_by_sections(cleaned)
    if not chunks:
        raise ValueError("No valid chunks produced from this PDF.")

    model = _get_model()
    collection = _get_collection()
    embeddings = model.encode(chunks, show_progress_bar=False)

    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]

    # Drop stale chunks from a previous version of this document: if the new
    # pass produces fewer chunks than before, upsert alone would leave the
    # extra old chunks (and their outdated text) retrievable forever.
    prefix = f"{doc_id}_"
    existing = collection.get(where={"document_id": doc_id})
    stale_ids = [eid for eid in existing["ids"] if eid.startswith(prefix)]
    if stale_ids:
        collection.delete(ids=stale_ids)

    metadatas = [
        {
            "subject": subject_display,
            "chapter": chapter_number,
            "chapter_name": chapter_title,
            "document_id": doc_id,
        }
        for _ in chunks
    ]

    collection.upsert(
        ids=ids,
        embeddings=embeddings.tolist(),
        documents=chunks,
        metadatas=metadatas,
    )
    return len(chunks)
