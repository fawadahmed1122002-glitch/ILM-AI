from sqlalchemy.orm import Session
from app.models.user import User
from app.rag.retrieve import retrieve_top_chunks, format_context_string
from app.rag.llm_client import generate_explanation


class QueryService:

    @staticmethod
    def explain(query: str, subject: str, user: User, db: Session) -> dict:
        """
        Full explain pipeline:
        1. Normalize query (Roman Urdu → English)
        2. Retrieve top-5 chunks from ChromaDB
        3. Generate bilingual explanation
        4. Return structured response
        """
        chunks, metadatas, distances, normalized_query = retrieve_top_chunks(
            query=query,
            subject=subject,
            top_k=5
        )

        if not chunks:
            return {
                "explanation": f"This topic is not in our current knowledge base for {subject}.",
                "normalized_query": normalized_query,
                "subject": subject,
                "cached": False,
            }

        context = format_context_string(chunks)
        explanation = generate_explanation(
            context=context,
            subject=subject,
            query=normalized_query
        )

        return {
            "explanation": explanation,
            "normalized_query": normalized_query,
            "subject": subject,
            "cached": False,
        }