"""
ILMAI LLM Client — Groq wrapper
Shared by: explanation generation, MCQ generation, Roman Urdu query normalization.
"""

import os
from dotenv import load_dotenv
from groq import Groq
from app.rag.prompts import EXPLANATION_SYSTEM_PROMPT, build_explanation_prompt
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