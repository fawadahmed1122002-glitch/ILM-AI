"""
ILMAI Generalized Ingestion Pipeline
Ingests ALL chapter PDFs for a given subject folder into ChromaDB.
Usage: python ingestion/ingest_subject.py <subject_name>
Example: python ingestion/ingest_subject.py biology

FIXED (this version):
- Removed duplicate embed/store block that ran after every successful chapter
  ingestion — it re-embedded every chapter a second time and called
  collection.add() with IDs that already existed from the upsert() above it,
  which would throw a duplicate-ID error and crash mid-run.
- Added page_number tracking per chunk (per Master Doc §5.3 metadata spec).
  Page boundaries are tracked during PDF text extraction instead of being
  lost when all pages get joined into one string.
"""

import os
import re
import sys
import glob

from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import chromadb

# ---- CONFIG ----
# Falls back to local dev paths if env vars aren't set, so nothing changes
# for local runs. On Railway, set PDFS_ROOT / CHROMA_DB_PATH env vars to
# point at the mounted volume paths (see deployment notes).
PDFS_ROOT = os.environ.get("PDFS_ROOT", "/home/fawad/project/ILM-AI/data/pdfs")
CHROMA_DB_PATH = os.environ.get("CHROMA_DB_PATH", "/home/fawad/project/ILM-AI/data/chroma_db")
COLLECTION_NAME = "ilmai_knowledge_base"

SUBJECT_DISPLAY_NAMES = {
    "biology": "Biology",
    "chemistry": "Chemistry",
    "physics": "Physics",
    "mathematics": "Mathematics",
    "computer_science": "Computer Science",
}

# A page-break marker inserted between pages so we can recover page numbers
# after the whitespace-collapsing clean_text() step runs.
PAGE_MARKER = "\x00PAGE_BREAK\x00"


def load_pdf_text_with_pages(pdf_path: str) -> str:
    """Load PDF text, inserting a page marker between pages so page numbers
    can be recovered later even after whitespace collapsing."""
    reader = PdfReader(pdf_path)
    parts = []
    for i, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        parts.append(f"{PAGE_MARKER}{i + 1}{PAGE_MARKER}" + page_text)
    return "\n".join(parts)


def clean_text(text: str) -> str:
    # Collapse whitespace but preserve our page markers (they contain no whitespace)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'(\d+\.\d+(?:\.\d+)*)\s', r'\n\n\1 ', text)
    text = re.sub(r'(Chapter\s*#\s*\d+)', r'\n\n\1', text)
    return text.strip()


def fix_missing_spaces(text: str) -> str:
    return re.sub(r'([a-z])([A-Z])', r'\1 \2', text)


def extract_page_number(chunk_text: str, default: int = 0) -> int:
    """Pull the most recent page marker found in a chunk, so each chunk is
    tagged with the page it started on. Falls back to `default` if none found."""
    matches = re.findall(rf'{PAGE_MARKER}(\d+){PAGE_MARKER}', chunk_text)
    return int(matches[0]) if matches else default


def strip_page_markers(text: str) -> str:
    return re.sub(rf'{PAGE_MARKER}\d+{PAGE_MARKER}', '', text)


def chunk_by_sections(text: str, max_chunk_size: int = 800):
    """
    Primary split: by numbered section headers (1.1, 1.2.2.6, etc.) and Chapter headers.
    Fallback: if a section is still too long, sub-split with RecursiveCharacterTextSplitter.
    Returns list of (chunk_text, page_number) tuples.
    """
    pattern = r'(?=\n\n\d+\.\d+(?:\.\d+)*\s|\n\nChapter\s*#\s*\d+)'
    sections = re.split(pattern, text)
    sections = [s.strip() for s in sections if len(strip_page_markers(s).strip()) >= 100]

    fallback_splitter = RecursiveCharacterTextSplitter(
        chunk_size=max_chunk_size,
        chunk_overlap=50,
        separators=["\n\n", "\n", ". ", " "],
        length_function=len,
    )

    final_chunks = []
    last_known_page = 1

    for section in sections:
        page_num = extract_page_number(section, default=last_known_page)
        last_known_page = page_num

        if len(section) <= max_chunk_size:
            clean_chunk = strip_page_markers(section).strip()
            if len(clean_chunk) >= 100:
                final_chunks.append((clean_chunk, page_num))
        else:
            sub_chunks = fallback_splitter.split_text(section)
            for sc in sub_chunks:
                sub_page = extract_page_number(sc, default=page_num)
                clean_sub = strip_page_markers(sc).strip()
                if len(clean_sub) >= 100:
                    final_chunks.append((clean_sub, sub_page))

    return final_chunks


def parse_chapter_info(filename: str):
    """
    Extracts chapter number and name from filenames like:
    'ch01_biodiversity_and_classification.pdf' -> (1, 'Biodiversity And Classification')
    'CH08_chemical_equilibrium.pdf' -> (8, 'Chemical Equilibrium')
    """
    base = os.path.splitext(filename)[0]
    match = re.match(r'[Cc][Hh](\d+)_(.+)', base)
    if match:
        chapter_num = int(match.group(1))
        chapter_name = match.group(2).replace('_', ' ').title()
        return chapter_num, chapter_name
    return None, base.replace('_', ' ').title()


def ingest_subject(subject_folder: str):
    subject_display = SUBJECT_DISPLAY_NAMES.get(subject_folder, subject_folder.title())
    pdf_dir = os.path.join(PDFS_ROOT, subject_folder)

    pdf_files = sorted(glob.glob(os.path.join(pdf_dir, "*.pdf")))

    if not pdf_files:
        print(f"⚠️  No PDF files found in {pdf_dir}")
        return

    print(f"Found {len(pdf_files)} PDF(s) for {subject_display}")

    print("Loading embedding model...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    collection = client.get_or_create_collection(name=COLLECTION_NAME)

    total_chunks_stored = 0
    failed_files = []

    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        chapter_num, chapter_name = parse_chapter_info(filename)

        print(f"\n--- Processing: {filename} (Ch.{chapter_num}: {chapter_name}) ---")

        try:
            raw_text = load_pdf_text_with_pages(pdf_path)
            if len(raw_text.strip()) == 0:
                print(f"⚠️  No text extracted from {filename} — likely a scanned PDF. Skipping (needs OCR).")
                failed_files.append((filename, "no text / scanned PDF"))
                continue

            cleaned = clean_text(raw_text)
            cleaned = fix_missing_spaces(cleaned)
            chunk_pairs = chunk_by_sections(cleaned)

            if not chunk_pairs:
                print(f"⚠️  No valid chunks produced from {filename}. Skipping.")
                failed_files.append((filename, "no valid chunks"))
                continue

            chunks = [c for c, _ in chunk_pairs]
            page_numbers = [p for _, p in chunk_pairs]

            embeddings = model.encode(chunks, show_progress_bar=False)

            ids = [f"{subject_folder}_ch{chapter_num}_{i}" for i in range(len(chunks))]
            metadatas = [
                {
                    "subject": subject_display,
                    "chapter": chapter_num if chapter_num else 0,
                    "chapter_name": chapter_name,
                    "page": page_numbers[i],
                    "source_file": filename,
                }
                for i in range(len(chunks))
            ]

            collection.upsert(
                ids=ids,
                embeddings=embeddings.tolist(),
                documents=chunks,
                metadatas=metadatas,
            )

            print(f"✅ Stored {len(chunks)} chunks for Ch.{chapter_num}: {chapter_name}")
            total_chunks_stored += len(chunks)

        except Exception as e:
            print(f"❌ FAILED on {filename}: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            failed_files.append((filename, f"{type(e).__name__}: {e}"))
            continue

    print(f"\n🎉 Done. Total chunks stored for {subject_display}: {total_chunks_stored}")
    if failed_files:
        print(f"\n⚠️  {len(failed_files)} file(s) had issues:")
        for fname, reason in failed_files:
            print(f"   - {fname}: {reason}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python ingestion/ingest_subject.py <subject_folder_name>")
        print("Example: python ingestion/ingest_subject.py biology")
        sys.exit(1)

    subject_arg = sys.argv[1].lower()
    ingest_subject(subject_arg)