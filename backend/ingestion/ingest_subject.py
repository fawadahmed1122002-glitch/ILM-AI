"""
ILMAI Generalized Ingestion Pipeline
Ingests ALL chapter PDFs for a given subject folder into ChromaDB.
Usage: python ingestion/ingest_subject.py <subject_name>
Example: python ingestion/ingest_subject.py biology
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
PDFS_ROOT = "/home/fawad/project/ILM-AI/data/pdfs"
CHROMA_DB_PATH = "/home/fawad/project/ILM-AI/data/chroma_db"
COLLECTION_NAME = "ilmai_knowledge_base"

SUBJECT_DISPLAY_NAMES = {
    "biology": "Biology",
    "chemistry": "Chemistry",
    "physics": "Physics",
    "mathematics": "Mathematics",
    "computer_science": "Computer Science",
}


def load_pdf_text(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text() or ""
        text += page_text + "\n"
    return text


def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'(\d+\.\d+(?:\.\d+)*)\s', r'\n\n\1 ', text)
    text = re.sub(r'(Chapter\s*#\s*\d+)', r'\n\n\1', text)
    return text.strip()


def fix_missing_spaces(text: str) -> str:
    return re.sub(r'([a-z])([A-Z])', r'\1 \2', text)


def chunk_by_sections(text: str, max_chunk_size: int = 800):
    pattern = r'(?=\n\n\d+\.\d+(?:\.\d+)*\s|\n\nChapter\s*#\s*\d+)'
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

    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        chapter_num, chapter_name = parse_chapter_info(filename)

        print(f"\n--- Processing: {filename} (Ch.{chapter_num}: {chapter_name}) ---")

        try:
            raw_text = load_pdf_text(pdf_path)
            if len(raw_text.strip()) == 0:
                print(f"⚠️  No text extracted from {filename} — likely a scanned PDF. Skipping (needs OCR).")
                continue

            cleaned = clean_text(raw_text)
            cleaned = fix_missing_spaces(cleaned)
            chunks = chunk_by_sections(cleaned)

            if not chunks:
                print(f"⚠️  No valid chunks produced from {filename}. Skipping.")
                continue

            embeddings = model.encode(chunks, show_progress_bar=False)

            ids = [f"{subject_folder}_ch{chapter_num}_{i}" for i in range(len(chunks))]
            metadatas = [
                {
                    "subject": subject_display,
                    "chapter": chapter_num if chapter_num else 0,
                    "chapter_name": chapter_name,
                    "source_file": filename,
                }
                for _ in chunks
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
            continue

    print(f"\n🎉 Done. Total chunks stored for {subject_display}: {total_chunks_stored}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python ingestion/ingest_subject.py <subject_folder_name>")
        print("Example: python ingestion/ingest_subject.py biology")
        sys.exit(1)

    subject_arg = sys.argv[1].lower()
    ingest_subject(subject_arg)