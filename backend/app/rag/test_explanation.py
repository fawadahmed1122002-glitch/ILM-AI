"""
End-to-end test: query -> retrieve -> generate bilingual explanation.
"""
from app.rag.retrieve import retrieve_top_chunks, format_context_string
from app.rag.llm_client import generate_explanation

test_queries = [
    "What is software engineering?",
    "SDLC ke phases kya hain",
]

for q in test_queries:
    print("=" * 60)
    print("QUERY:", q)

    chunks, metas, dists, normalized = retrieve_top_chunks(q, subject="Computer Science", top_k=5)
    context = format_context_string(chunks)

    explanation = generate_explanation(context, subject="Computer Science", query=normalized)

    print("\n--- EXPLANATION ---")
    print(explanation)
    print()