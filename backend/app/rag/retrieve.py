"""
PrepXMentor RAG Retrieval Function
Normalizes query (Roman Urdu -> English), embeds it, and retrieves
top-5 relevant chunks from ChromaDB.
"""

from sentence_transformers import SentenceTransformer
import chromadb

from app.rag.llm_client import normalize_query

from app.core.config import CHROMA_DB_PATH, COLLECTION_NAME

# Load once, reuse across calls (don't reload model every query in production)
_model = SentenceTransformer("all-MiniLM-L6-v2")
_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
_collection = _client.get_or_create_collection(COLLECTION_NAME)


def retrieve_top_chunks(query: str, subject: str = None, top_k: int = 5):
    """
    Normalizes (Roman Urdu -> English), embeds the query, and retrieves
    top_k most relevant chunks. Optionally filters by subject metadata.
    """
    normalized_query = normalize_query(query)

    query_embedding = _model.encode([normalized_query]).tolist()

    where_filter = {"subject": subject} if subject else None

    results = _collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        where=where_filter,
    )

    chunks = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    return chunks, metadatas, distances, normalized_query


def format_context_string(chunks: list[str]) -> str:
    """
    Joins retrieved chunks into a single context string for the LLM prompt.
    """
    return "\n\n---\n\n".join(chunks)


if __name__ == "__main__":
    # ---- Test with English + Roman Urdu queries ----
    test_queries = [
        "What is software engineering?",
        "software engineering kya hai",
        "SDLC ke phases kya hain",
        "mujhe waterfall model samjhao",
        "What is a software process model?",
    ]

    for q in test_queries:
        print("=" * 60)
        print("ORIGINAL QUERY:", q)
        chunks, metadatas, distances, normalized_query = retrieve_top_chunks(
            q, subject="Computer Science", top_k=5
        )
        print("NORMALIZED QUERY:", normalized_query)

        if not chunks:
            print("⚠️  No chunks returned — check your 'subject' metadata value matches what's stored.")
            continue

        for i, (chunk, meta, dist) in enumerate(zip(chunks, metadatas, distances)):
            print(f"\n[{i+1}] (distance: {dist:.4f}) chapter: {meta.get('chapter_name')}")
            print(chunk[:150], "...")

        context_str = format_context_string(chunks)
        print(f"\n📦 Context string length: {len(context_str)} chars")