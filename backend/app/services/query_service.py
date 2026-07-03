from sqlalchemy.orm import Session
from app.models.user import User
from app.rag.retrieve import retrieve_top_chunks, format_context_string
from app.rag.llm_client import generate_explanation, generate_mcqs


class QueryService:

    @staticmethod
    def explain(query: str, subject: str, user: User, db: Session) -> dict:
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

    @staticmethod
    def get_mcqs(topic: str, subject: str, user: User, db: Session) -> dict:
        chunks, metadatas, distances, normalized_topic = retrieve_top_chunks(
            query=topic,
            subject=subject,
            top_k=5
        )

        if not chunks:
            return {
                "mcqs": [],
                "subject": subject,
                "topic": topic,
                "count": 0,
            }

        context = format_context_string(chunks)
        result = generate_mcqs(
            context=context,
            subject=subject,
            topic=normalized_topic
        )

        return {
            "mcqs": result["valid_mcqs"],
            "subject": subject,
            "topic": normalized_topic,
            "count": len(result["valid_mcqs"]),
        }