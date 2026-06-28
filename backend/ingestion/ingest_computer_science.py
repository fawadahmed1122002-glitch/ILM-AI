"""
ILMAI Ingestion Pipeline — Biology Chapter 1
Loads PDF -> chunks -> embeds -> stores in ChromaDB
"""

import os
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import chromadb
import re


# ---- CONFIG ----
PDF_PATH = "/home/fawad/project/ILM-AI/data/pdfs/computer_science/ch01_ introduction_to_software_development.pdf"   # <-- point this to your actual file
CHROMA_DB_PATH = "/home/fawad/project/ILM-AI/data/chroma_db"
COLLECTION_NAME = "ilmai_knowledge_base"
CHAPTER_NUMBER = 1
CHAPTER_NAME = "Introduction to Software Development"            # <-- update to match your actual chapter
SUBJECT = "Computer Science"

# ---- STEP 1: Load PDF text ----
def load_pdf_text(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text() or ""
        text += page_text + "\n"
    return text

#n---- Step 2: Clean text ----
def clean_text(text: str) -> str:
    # Collapse ANY run of whitespace (spaces, tabs, newlines) into a single space
    text = re.sub(r'\s+', ' ', text)

    # Re-insert paragraph breaks before numbered section headings (e.g. "1.1 ", "1.2.2.6 ")
    text = re.sub(r'(\d+\.\d+(?:\.\d+)*)\s', r'\n\n\1 ', text)

    # Re-insert a break before "Chapter #" headers
    text = re.sub(r'(Chapter\s*#\s*\d+)', r'\n\n\1', text)

    return text.strip()

# ---- STEP 2: Chunk text ----
def fix_missing_spaces(text: str) -> str:
    """Insert space at lowercase->uppercase boundary (e.g. 'thatdefines' -> 'that defines')."""
    return re.sub(r'([a-z])([A-Z])', r'\1 \2', text)


def chunk_by_sections(text: str, max_chunk_size: int = 800):
    """
    Primary split: by numbered section headers (1.1, 1.2.2.6, etc.) and Chapter headers.
    Fallback: if a section is still too long, sub-split with RecursiveCharacterTextSplitter.
    """
    # Split on section markers, keeping the marker attached to its section
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
            # Section too long — sub-split it
            sub_chunks = fallback_splitter.split_text(section)
            final_chunks.extend([c for c in sub_chunks if len(c) >= 100])

    return final_chunks

# ---- STEP 3: Embed chunks ----
def embed_chunks(chunks: list[str], model: SentenceTransformer):
    embeddings = model.encode(chunks, show_progress_bar=True)
    return embeddings

# ---- STEP 4: Store in ChromaDB ----
def store_in_chromadb(chunks, embeddings, page_numbers=None):
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    collection = client.get_or_create_collection(name=COLLECTION_NAME)

    ids = [f"{SUBJECT.lower()}_ch{CHAPTER_NUMBER}_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "subject": SUBJECT,
            "chapter": CHAPTER_NUMBER,
            "chapter_name": CHAPTER_NAME,
            "source_file": os.path.basename(PDF_PATH),
        }
        for _ in chunks
    ]

    collection.add(
        ids=ids,
        embeddings=embeddings.tolist(),
        documents=chunks,
        metadatas=metadatas,
    )
    print(f"✅ Stored {len(chunks)} chunks in ChromaDB collection '{COLLECTION_NAME}'")

# ---- MAIN ----
if __name__ == "__main__":
    print("Loading PDF...")
    raw_text = load_pdf_text(PDF_PATH)
    raw_text = clean_text(raw_text)
    raw_text = fix_missing_spaces(raw_text)
    print(f"Extracted {len(raw_text)} characters.")

    if len(raw_text.strip()) == 0:
        raise ValueError(
            "No text extracted — this PDF may be a scanned image. "
            "You'll need OCR (pytesseract) per the Master Doc's PDF quality fixes."
        )

    print("Chunking...")
    chunks = chunk_by_sections(raw_text)
    print(f"Created {len(chunks)} chunks.")

    print("Loading embedding model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    print("Embedding chunks...")
    embeddings = embed_chunks(chunks, model)

    print("Storing in ChromaDB...")
    store_in_chromadb(chunks, embeddings)

    print("Done. Run a test query to verify retrieval quality.")