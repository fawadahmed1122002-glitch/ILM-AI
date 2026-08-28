import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.models.user import User
from app.models.mcq_attempt import McqAttempt
from app.models.topic_stats import TopicStats
from app.rag.retrieve import retrieve_top_chunks, format_context_string
from app.rag.llm_client import generate_explanation, generate_mcqs
from app.services.streak_service import update_streak
from app.models.mcq_bank import McqBank


def _as_uuid(value):
    """Coerces a client-provided mcq id to a UUID, or None if absent/malformed."""
    if value is None:
        return None
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError):
        return None


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
        # Bank-first: serve approved MCQs if we have enough for this
        # subject+topic combo, no LLM call needed.
        banked = (
            db.query(McqBank)
            .filter(
                McqBank.subject == subject,
                McqBank.topic == topic,
                McqBank.is_verified == True,
                McqBank.rejected_at.is_(None),
            )
            .order_by(func.random())
            .limit(5)
            .all()
        )
        if len(banked) >= 5:
            mcqs = [
                {
                    "id": str(m.id),
                    "question_en": m.question_text,
                    "question_ur": m.question_text_ur,
                    "opt_a": m.option_a,
                    "opt_b": m.option_b,
                    "opt_c": m.option_c,
                    "opt_d": m.option_d,
                    "correct": m.correct_option,
                    "explanation_en": m.explanation,
                    "difficulty": m.difficulty.capitalize(),
                }
                for m in banked
            ]
            return {"mcqs": mcqs, "subject": subject, "topic": topic, "count": len(mcqs), "source": "bank"}

        # Fallback: live-generate, exactly as before.
        chunks, metadatas, distances, normalized_topic = retrieve_top_chunks(
            query=topic, subject=subject, top_k=5
        )
        if not chunks:
            return {"mcqs": [], "subject": subject, "topic": topic, "count": 0, "source": "live"}
        context = format_context_string(chunks)
        result = generate_mcqs(context=context, subject=subject, topic=normalized_topic)
        return {
            "mcqs": result["valid_mcqs"],
            "subject": subject,
            "topic": normalized_topic,
            "count": len(result["valid_mcqs"]),
            "source": "live",
        }

    @staticmethod
    def submit_mcqs(subject: str, topic: str, answers: list, user: User, db: Session) -> dict:
        correct = 0
        question_results = []
        # is_correct is computed server-side, never trusted from the
        # client: resolve each answer's bank MCQ and compare its stored
        # correct_option against the submitted selection. Answers without
        # a resolvable bank id (live-generated MCQs) fall back to the
        # client value. All referenced bank MCQs are fetched in ONE batch
        # query instead of one SELECT per answer.
        mcq_ids = [u for u in (_as_uuid(getattr(ans, "mcq_id", None)) for ans in answers) if u]
        bank_by_id = (
            {m.id: m for m in db.query(McqBank).filter(McqBank.id.in_(mcq_ids)).all()}
            if mcq_ids else {}
        )
        for ans in answers:
            mcq_id = _as_uuid(getattr(ans, "mcq_id", None))
            bank_mcq = bank_by_id.get(mcq_id) if mcq_id else None
            if bank_mcq is not None:
                is_correct = (
                    ans.selected_option.strip().upper()
                    == bank_mcq.correct_option.strip().upper()
                )
            else:
                is_correct = ans.is_correct
            attempt = McqAttempt(
                user_id=user.id,
                mcq_id=bank_mcq.id if bank_mcq else None,
                subject=subject,
                topic=topic,
                selected_option=ans.selected_option,
                is_correct=is_correct,
                time_spent_ms=ans.time_spent_ms,
            )
            db.add(attempt)
            if is_correct:
                correct += 1
            # Post-submission feedback for the client: correct option +
            # explanation come from the bank row; live-generated MCQs
            # (no bank row) get the client-graded result only.
            question_results.append({
                "mcq_index": ans.mcq_index,
                "is_correct": is_correct,
                "correct_option": bank_mcq.correct_option if bank_mcq else None,
                "explanation_en": bank_mcq.explanation if bank_mcq else None,
            })

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
            "questions": question_results,
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

    @staticmethod
    def get_analytics(user: User, db: Session) -> dict:
        """
        Returns aggregated analytics for the student's Analytics page:
        - daily_trend: accuracy % per day for the last 30 days, from real
          per-attempt timestamps (mcq_attempts.created_at). Days with zero
          attempts are omitted (not zero-filled) -- frontend decides how to
          render gaps.
        - subject_breakdown: current accuracy per subject, from topic_stats
          (aggregated across all topics within each subject).
        - activity: attempt count per day for the last 30 days (for a
          streak/activity visualization).
        - current_streak / longest_streak: from users table.

        NOTE: subject/topic on mcq_attempts only exists for attempts made
        AFTER the schema migration adding those columns -- older attempts
        will have subject=NULL and are excluded from subject-scoped queries
        but still count in the overall daily_trend and activity aggregates.
        """
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

        # Daily accuracy trend (all subjects combined) -- real per-attempt data.
        daily_rows = (
            db.query(
                func.date(McqAttempt.created_at).label("day"),
                func.count(McqAttempt.id).label("total"),
                func.sum(case((McqAttempt.is_correct == True, 1), else_=0)).label("correct"),
            )
            .filter(McqAttempt.user_id == user.id, McqAttempt.created_at >= thirty_days_ago)
            .group_by(func.date(McqAttempt.created_at))
            .order_by(func.date(McqAttempt.created_at))
            .all()
        )
        daily_trend = [
            {
                "date": row.day.isoformat(),
                "total_attempts": row.total,
                "correct": row.correct,
                "accuracy_percent": round((row.correct / row.total * 100), 1) if row.total > 0 else 0,
            }
            for row in daily_rows
        ]

        # Subject breakdown -- aggregated from topic_stats (all-time, current state).
        subject_rows = (
            db.query(
                TopicStats.subject,
                func.sum(TopicStats.total_attempts).label("total_attempts"),
                func.sum(TopicStats.correct_count).label("correct_count"),
            )
            .filter(TopicStats.user_id == user.id)
            .group_by(TopicStats.subject)
            .all()
        )
        subject_breakdown = [
            {
                "subject": row.subject,
                "total_attempts": row.total_attempts,
                "correct_count": row.correct_count,
                "accuracy_percent": round((row.correct_count / row.total_attempts * 100), 1) if row.total_attempts > 0 else 0,
            }
            for row in subject_rows
        ]

        # Activity history -- attempt count per day, last 30 days.
        activity = [{"date": row["date"], "attempts": row["total_attempts"]} for row in daily_trend]

        return {
            "daily_trend": daily_trend,
            "subject_breakdown": subject_breakdown,
            "activity": activity,
            "current_streak": user.current_streak,
            "longest_streak": user.longest_streak,
        }