"""
ILMAI LLM Client — Groq wrapper
Shared by: explanation generation, MCQ generation, Roman Urdu query normalization.
"""

import os
from dotenv import load_dotenv
from groq import Groq
from app.rag.prompts import EXPLANATION_SYSTEM_PROMPT, build_explanation_prompt
import json
import re
from app.rag.prompts import MCQ_SYSTEM_PROMPT, build_mcq_prompt
load_dotenv()  # loads GROQ_API_KEY from .env

_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Groq's fast Llama 3.3 model — good balance of speed + quality for MVP
MODEL_NAME = "llama-3.3-70b-versatile"


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

def generate_explanation(context: str, subject: str, query: str) -> str:
    """
    Generates a bilingual (EN+UR) explanation grounded in retrieved context.
    """
    system_prompt = EXPLANATION_SYSTEM_PROMPT.format(subject=subject)
    user_message = build_explanation_prompt(context, subject, query)
    return call_groq(system_prompt, user_message, temperature=0.3, max_tokens=600)
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

    return errors


def generate_mcqs(context: str, subject: str, topic: str) -> dict:
    """
    Generates 5 MCQs grounded in context. Returns a dict with:
    - 'valid_mcqs': list of MCQs that passed validation
    - 'invalid_mcqs': list of (mcq, errors) tuples that failed validation
    - 'parse_error': error message if JSON parsing failed entirely, else None
    """
    user_message = build_mcq_prompt(context, subject, topic)
    raw_response = call_groq(MCQ_SYSTEM_PROMPT, user_message, temperature=0.3, max_tokens=2000)

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
        print(f"Original:   {q}")
        print(f"Normalized: {normalized}")
        print("-" * 40)