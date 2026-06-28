"""
ILMAI RAG Retrieval Function
Embeds a student query and retrieves top-5 relevant chunks from ChromaDB.
"""

from sentence_transformers import SentenceTransformer
import chromadb

CHROMA_DB_PATH = "/home/fawad/project/ILM-AI/data/chroma_db"   # adjust relative to where you run this from
COLLECTION_NAME = "ilmai_knowledge_base"

# Load once, reuse across calls (don't reload model every query in production)
_model = SentenceTransformer("all-MiniLM-L6-v2")
_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
_collection = _client.get_collection(COLLECTION_NAME)




def retrieve_top_chunks(query: str, subject: str = None, top_k: int = 5):
    """
    Embeds the query and retrieves top_k most relevant chunks.
    Optionally filters by subject metadata.
    """
    query_embedding = _model.encode([query]).tolist()

    where_filter = {"subject": subject} if subject else None

    results = _collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        where=where_filter,
    )

    chunks = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    return chunks, metadatas, distances


def format_context_string(chunks: list[str]) -> str:
    """
    Joins retrieved chunks into a single context string for the LLM prompt.
    """
    return "\n\n---\n\n".join(chunks)


if __name__ == "__main__":
    # ---- Test with 5 sample queries ----
    test_queries = [
        "What is software engineering?",
        "What are the phases of the software development lifecycle?",
        "What is the difference between verification and validation?",
        "What is a software process model?",
        "Why is software engineering important?",
    ]

    for q in test_queries:
        print("=" * 60)
        print("QUERY:", q)
        chunks, metadatas, distances = retrieve_top_chunks(q, subject="Computer Science", top_k=5)

        if not chunks:
            print("⚠️  No chunks returned — check your 'subject' metadata value matches what's stored.")
            continue

        for i, (chunk, meta, dist) in enumerate(zip(chunks, metadatas, distances)):
            print(f"\n[{i+1}] (distance: {dist:.4f}) chapter: {meta.get('chapter_name')}")
            print(chunk[:150], "...")

        context_str = format_context_string(chunks)
        print(f"\n📦 Context string length: {len(context_str)} chars")