"""
PrepXMentor LLM Client — Groq wrapper
Shared by: explanation generation, MCQ generation, Roman Urdu query normalization.
"""

import logging
import os
from dotenv import load_dotenv
from groq import Groq
from app.rag.prompts import EXPLANATION_SYSTEM_PROMPT, build_explanation_prompt
import json
import re
from app.rag.prompts import MCQ_SYSTEM_PROMPT, build_mcq_prompt
from app.services.cache_service import get_cached_response, store_response
load_dotenv()  # loads GROQ_API_KEY from .env

logger = logging.getLogger(__name__)

_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Groq's fast Llama 3.3 model — good balance of speed + quality for MVP
MODEL_NAME = "openai/gpt-oss-120b"


class LLMGenerationError(Exception):
    """
    Raised when LLM output fails quality validation (e.g. Urdu section
    contains foreign script that survived retry + sanitization) and should
    NOT be served to a student. Callers (API routes) should catch this and
    return a clean, user-facing error instead of a raw 500.
    """
    pass


def log_flagged_response(query: str, subject: str, result: str) -> None:
    """
    Records a response that failed the foreign-script quality check after
    retry + sanitization, for manual review.

    MVP implementation: prints a structured, greppable log line so it shows
    up in `railway logs` and can be found later with:
        railway logs | grep "FLAGGED_RESPONSE"
    TODO: once volume grows, replace with a real `flagged_responses` table
    (query, subject, raw_output, created_at) so this is queryable instead
    of log-only.
    """
    logger.warning(
        "🚩 FLAGGED_RESPONSE | "
        "subject=%r | "
        "query=%r | "
        "output=%r",
        subject, query, result,
    )


FOREIGN_SCRIPT_FIXES = {
    "三角 میٹری": "ٹریگنومیٹری",  # must come BEFORE the standalone "三角" entry
    "三角": "ٹریگنومیٹری",
    "根": "جڑ",
    "分子": "مالیکیول",
    "微观": "خوردبینی",
    "微": "خوردبینی",
    "反応性": "قابل واپسی",
    "反": "واپسی",
    "定": "متعین",
    "ition": "",
    "định": "متعین",
    "特": "خاص",
}

def call_groq(system_prompt: str, user_message: str, temperature: float = 0.3, max_tokens: int = 1024) -> str:
    """
    Generic Groq chat completion call.
    """
    response = _client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


def normalize_query(query: str) -> str:
    """
    Detects Roman Urdu / mixed Urdu-English queries and translates to English.
    If already English, returns unchanged. Used before embedding/retrieval.
    """
    system_prompt = (
        "You are a translation-only tool. You NEVER answer questions. "
        "You NEVER explain concepts. You ONLY translate or pass through text.\n\n"
        "Task: If the input is Roman Urdu (Urdu written in Latin/English letters) "
        "or mixed Roman Urdu + English, translate it into English, keeping it as "
        "the same type of sentence (if it was a question, output a question — "
        "do NOT answer it). If the input is already English, output it EXACTLY "
        "as given, character for character.\n\n"
        "Output ONLY the resulting text. No preamble, no quotes, no explanation.\n\n"
        "Examples:\n"
        "Input: software engineering kya hai\n"
        "Output: What is software engineering?\n\n"
        "Input: What is software engineering?\n"
        "Output: What is software engineering?\n\n"
        "Input: SDLC ke phases kya hain\n"
        "Output: What are the phases of SDLC?\n\n"
        "Input: mujhe waterfall model samjhao\n"
        "Output: Explain the waterfall model to me."
    )
    result = call_groq(system_prompt, query, temperature=0, max_tokens=200)
    return result.strip()

def contains_foreign_script(text: str) -> bool:
    """
    Detects CJK, Devanagari, Cyrillic characters that shouldn't appear in Urdu text.
    """
    foreign_pattern = re.compile(
        r'[\u4e00-\u9fff'      # Chinese
        r'\u3040-\u30ff'       # Japanese
        r'\u0900-\u097f'       # Devanagari
        r'\u0400-\u04ff'       # Cyrillic
        r'\uac00-\ud7af]'      # Korean
    )
    return bool(foreign_pattern.search(text))

def extract_urdu_section(explanation: str) -> str:
    """Pulls just the URDU: section text for validation."""
    match = re.search(r'URDU:\s*(.*?)(?=\n\nKEY EXAM POINT:|\Z)', explanation, re.DOTALL)
    return match.group(1) if match else ""

def sanitize_foreign_script(text: str) -> str:
    """
    Last-resort cleanup: replaces known CJK substitution patterns with correct
    Urdu equivalents. Applied after retry still contains foreign script.
    """
    for bad, good in FOREIGN_SCRIPT_FIXES.items():
        text = text.replace(bad, good)
    return text


def generate_explanation(context: str, subject: str, query: str, _retry_count: int = 0) -> str:
    if _retry_count == 0:
        cached = get_cached_response(query, subject)
        if cached:
            logger.info("💰 Cache HIT — skipping LLM call")
            return cached["explanation"]

    system_prompt = EXPLANATION_SYSTEM_PROMPT.format(subject=subject)
    user_message = build_explanation_prompt(context, subject, query)
    result = call_groq(system_prompt, user_message, temperature=0.3, max_tokens=900)
    urdu_section = extract_urdu_section(result)

    if contains_foreign_script(urdu_section) and _retry_count < 1:
        logger.warning("⚠️  Foreign script detected in Urdu output — retrying generation...")
        return generate_explanation(context, subject, query, _retry_count=_retry_count + 1)

    if contains_foreign_script(urdu_section):
        logger.warning("⚠️  Foreign script still present after retry — applying known-pattern cleanup...")
        result = sanitize_foreign_script(result)
        if contains_foreign_script(extract_urdu_section(result)):
            # Genuinely broken — log for review AND stop it from reaching the student.
            logger.error("❌ Unrecognized foreign script pattern remains. Blocking response.")
            log_flagged_response(query, subject, result)
            raise LLMGenerationError(
                "Urdu explanation failed quality validation. Please try again."
            )

    if _retry_count == 0 or not contains_foreign_script(extract_urdu_section(result)):
        store_response(query, subject, {"explanation": result})

    return result

def _extract_json(raw_text: str) -> str:
    """
    Strips markdown code fences if the model wrapped the JSON in ```json ... ```
    """
    text = raw_text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()


def validate_mcq(mcq: dict) -> list[str]:
    """
    Validates a single MCQ dict. Returns a list of error strings (empty list = valid).
    """
    errors = []
    required_fields = ["question_en", "question_ur", "opt_a", "opt_b", "opt_c", "opt_d",
                        "correct", "explanation_en", "difficulty"]

    for field in required_fields:
        if field not in mcq or not str(mcq[field]).strip():
            errors.append(f"Missing or empty field: {field}")

    if "correct" in mcq and mcq["correct"] not in ["A", "B", "C", "D"]:
        errors.append(f"Invalid 'correct' value: {mcq.get('correct')} (must be A/B/C/D)")

    if "difficulty" in mcq and mcq["difficulty"] not in ["Easy", "Medium", "Hard"]:
        errors.append(f"Invalid 'difficulty' value: {mcq.get('difficulty')}")

    if "question_ur" in mcq and contains_foreign_script(str(mcq["question_ur"])):
        errors.append("question_ur contains non-Urdu script (CJK/Cyrillic/Devanagari/Korean)")

    return errors


def generate_mcqs(context: str, subject: str, topic: str, _retry_count: int = 0) -> dict:
    """
    Generates 5 MCQs grounded in context. Returns a dict with:
    - 'valid_mcqs': list of MCQs that passed validation
    - 'invalid_mcqs': list of (mcq, errors) tuples that failed validation
    - 'parse_error': error message if JSON parsing failed entirely, else None
    """
    user_message = build_mcq_prompt(context, subject, topic)
    raw_response = call_groq(MCQ_SYSTEM_PROMPT, user_message, temperature=0.3, max_tokens=3200)

    cleaned = _extract_json(raw_response)

    try:
        mcqs = json.loads(cleaned)
    except json.JSONDecodeError as e:
        return {
            "valid_mcqs": [],
            "invalid_mcqs": [],
            "parse_error": f"JSON parse failed: {e}. Raw response: {raw_response[:300]}",
        }

    if not isinstance(mcqs, list):
        return {
            "valid_mcqs": [],
            "invalid_mcqs": [],
            "parse_error": f"Expected a JSON array, got: {type(mcqs)}",
        }

    valid_mcqs = []
    invalid_mcqs = []
    for mcq in mcqs:
        errors = validate_mcq(mcq)
        if errors:
            invalid_mcqs.append((mcq, errors))
        else:
            valid_mcqs.append(mcq)

    # If any MCQ failed specifically due to foreign-script contamination,
    # retry the whole batch once — same one-retry pattern as generate_explanation.
    has_script_failure = any(
        any("non-Urdu script" in err for err in errs) for _, errs in invalid_mcqs
    )
    if has_script_failure and _retry_count < 1:
        logger.warning("⚠️  Foreign script detected in MCQ Urdu output — retrying batch generation...")
        return generate_mcqs(context, subject, topic, _retry_count=_retry_count + 1)

    return {
        "valid_mcqs": valid_mcqs,
        "invalid_mcqs": invalid_mcqs,
        "parse_error": None,
    }


if __name__ == "__main__":
    # Quick test
    test_queries = [
        "What is software engineering?",
        "software engineering kya hai",
        "SDLC ke phases kya hain",
        "mujhe waterfall model samjhao",
    ]
    for q in test_queries:
        normalized = normalize_query(q)
        logger.info("Original:   %s", q)
        logger.info("Normalized: %s", normalized)
        logger.info("-" * 40)