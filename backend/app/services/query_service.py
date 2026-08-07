import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.models.mcq_attempt import McqAttempt
from app.models.topic_stats import TopicStats
from app.rag.retrieve import retrieve_top_chunks, format_context_string
from app.rag.llm_client import generate_explanation, generate_mcqs
from app.services.streak_service import update_streak

class QueryService:

    @staticmethod
    def explain(query: str, subject: str, user: User, db: Session) -> dict:
        chunks, metadatas, distances, normalized_query = retrieve_top_chunks(
            query=query, subject=subject, top_k=5
        )
        if not chunks:
            return {
                "explanation": f"This topic is not in our current knowledge base for {subject}.",
                "normalized_query": normalized_query,
                "subject": subject,
                "cached": False,
            }
        context = format_context_string(chunks)
        explanation = generate_explanation(context=context, subject=subject, query=normalized_query)
        update_streak(user, db)
        return {
            "explanation": explanation,
            "normalized_query": normalized_query,
            "subject": subject,
            "cached": False,
        }

    @staticmethod
    def get_mcqs(topic: str, subject: str, user: User, db: Session) -> dict:
        chunks, metadatas, distances, normalized_topic = retrieve_top_chunks(
            query=topic, subject=subject, top_k=5
        )
        if not chunks:
            return {"mcqs": [], "subject": subject, "topic": topic, "count": 0}
        context = format_context_string(chunks)
        result = generate_mcqs(context=context, subject=subject, topic=normalized_topic)
        return {
            "mcqs": result["valid_mcqs"],
            "subject": subject,
            "topic": normalized_topic,
            "count": len(result["valid_mcqs"]),
        }

    @staticmethod
    def submit_mcqs(subject: str, topic: str, answers: list, user: User, db: Session) -> dict:
        correct = 0
        for ans in answers:
            attempt = McqAttempt(
                user_id=user.id,
                mcq_id=None,
                subject=subject,
                topic=topic,
                selected_option=ans.selected_option,
                is_correct=ans.is_correct,
                time_spent_ms=ans.time_spent_ms,
            )
            db.add(attempt)
            if ans.is_correct:
                correct += 1

        stats = db.query(TopicStats).filter(
            TopicStats.user_id == user.id,
            TopicStats.subject == subject,
            TopicStats.topic == topic,
        ).first()

        if stats:
            stats.total_attempts += len(answers)
            stats.correct_count += correct
            stats.last_attempt_at = func.now()
        else:
            stats = TopicStats(
                user_id=user.id,
                subject=subject,
                chapter_number=0,
                topic=topic,
                total_attempts=len(answers),
                correct_count=correct,
            )
            db.add(stats)

        db.commit()

        total = len(answers)
        score_percent = (correct / total * 100) if total > 0 else 0
        weak_topic = score_percent < 60 and total >= 3

        return {
            "total": total,
            "correct": correct,
            "score_percent": round(score_percent, 1),
            "weak_topic": weak_topic,
        }

    @staticmethod
    def get_progress(user: User, db: Session) -> dict:
        stats = db.query(TopicStats).filter(
            TopicStats.user_id == user.id
        ).order_by(TopicStats.last_attempt_at.desc()).all()

        topics = []
        for s in stats:
            score = round((s.correct_count / s.total_attempts * 100) if s.total_attempts > 0 else 0, 1)
            topics.append({
                "subject": s.subject,
                "topic": s.topic,
                "total_attempts": s.total_attempts,
                "correct_count": s.correct_count,
                "score_percent": score,
                "weak_topic": s.total_attempts >= 3 and score < 60,
                "last_attempt_at": s.last_attempt_at.isoformat() if s.last_attempt_at else None,
            })

        weak_topics = [t for t in topics if t["weak_topic"]]
        return {
            "topics": topics,
            "total_sessions": len(topics),
            "weak_topics": weak_topics,
            "current_streak": user.current_streak,
            "longest_streak": user.longest_streak,
        }
