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
def chunk_text(text: str):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,       # tokens (approximated by length_function)
        chunk_overlap=50,
        separators=["\n\n", "\n", ". ", " "],
        length_function=len,  # swap for tiktoken later for true token count
    )
    chunks = splitter.split_text(text)
    # Filter out junk chunks (e.g. chapter titles, headers < 100 chars)
    chunks = [c for c in chunks if len(c) >= 100]
    return chunks

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
    print(f"Extracted {len(raw_text)} characters.")

    if len(raw_text.strip()) == 0:
        raise ValueError(
            "No text extracted — this PDF may be a scanned image. "
            "You'll need OCR (pytesseract) per the Master Doc's PDF quality fixes."
        )

    print("Chunking...")
    chunks = chunk_text(raw_text)
    print(f"Created {len(chunks)} chunks.")

    print("Loading embedding model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    print("Embedding chunks...")
    embeddings = embed_chunks(chunks, model)

    print("Storing in ChromaDB...")
    store_in_chromadb(chunks, embeddings)

    print("Done. Run a test query to verify retrieval quality.")