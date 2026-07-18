"""
PrepXMentor Quality Baseline Test (Task 7)
Runs 20 queries across all 5 subjects, generates explanation + MCQs for each.
Output is meant for MANUAL scoring (1-5) by founder — this script doesn't
auto-score, since explanation/MCQ quality is a human judgment call.
"""

from app.rag.retrieve import retrieve_top_chunks, format_context_string
from app.rag.llm_client import generate_explanation, generate_mcqs

# 4 queries per subject = 20 total
TEST_QUERIES = [
    ("Computer Science", "What is the Software Development Life Cycle?"),
    ("Computer Science", "What is the difference between a compiler and an interpreter?"),
    ("Computer Science", "What is an algorithm?"),
    ("Computer Science", "kya hai data analytics"),

    ("Biology", "What is biodiversity?"),
    ("Biology", "How are organisms classified?"),
    ("Biology", "What is a taxonomic hierarchy?"),
    ("Biology", "binomial nomenclature kya hai"),

    ("Chemistry", "What is chemical equilibrium?"),
    ("Chemistry", "What is the atomic structure of an atom?"),
    ("Chemistry", "What is electrochemistry?"),
    ("Chemistry", "stoichiometry kya hai"),

    ("Physics", "What is measurement in physics?"),
    ("Physics", "What are the base units in physics?"),
    ("Physics", "What is significant figures?"),
    ("Physics", "error aur uncertainty kya hai measurement mein"),

    ("Mathematics", "What is a complex number?"),
    ("Mathematics", "What is the power rule for derivatives?"),
    ("Mathematics", "What is the difference between permutation and combination?"),
    ("Mathematics", "matrix kya hota hai"),
]


def run_baseline():
    results = []

    for i, (subject, query) in enumerate(TEST_QUERIES, 1):
        print("\n" + "=" * 70)
        print(f"[{i}/20] SUBJECT: {subject} | QUERY: {query}")
        print("=" * 70)

        try:
            chunks, metas, dists, normalized = retrieve_top_chunks(query, subject=subject, top_k=5)
            context = format_context_string(chunks)

            if not chunks:
                print("⚠️  NO CHUNKS RETRIEVED — skipping generation.")
                results.append({"subject": subject, "query": query, "status": "no_chunks"})
                continue

            print(f"Normalized query: {normalized}")
            print(f"Top match distance: {dists[0]:.4f}")

            explanation = generate_explanation(context, subject=subject, query=normalized)
            print("\n--- EXPLANATION ---")
            print(explanation)

            mcq_result = generate_mcqs(context, subject=subject, topic=normalized)
            print(f"\n--- MCQs: {len(mcq_result['valid_mcqs'])} valid, {len(mcq_result['invalid_mcqs'])} invalid ---")
            if mcq_result["parse_error"]:
                print("❌ MCQ PARSE ERROR:", mcq_result["parse_error"])
            for j, mcq in enumerate(mcq_result["valid_mcqs"][:1]):  # just show 1 sample MCQ per query
                print(f"Sample MCQ: {mcq['question_en']} (Correct: {mcq['correct']})")

            results.append({
                "subject": subject,
                "query": query,
                "status": "ok",
                "top_distance": dists[0],
                "valid_mcqs": len(mcq_result["valid_mcqs"]),
                "invalid_mcqs": len(mcq_result["invalid_mcqs"]),
            })

        except Exception as e:
            print(f"❌ FAILED: {type(e).__name__}: {e}")
            results.append({"subject": subject, "query": query, "status": "error", "error": str(e)})

    # ---- Summary ----
    print("\n\n" + "#" * 70)
    print("SUMMARY")
    print("#" * 70)
    for r in results:
        status_icon = "✅" if r["status"] == "ok" else "❌"
        print(f"{status_icon} [{r['subject']}] {r['query'][:50]} -> {r['status']}")

    ok_count = sum(1 for r in results if r["status"] == "ok")
    print(f"\n{ok_count}/{len(results)} queries completed successfully.")
    print("\n⚠️  NEXT STEP: Manually review each EXPLANATION and MCQ above.")
    print("Score 1-5 for explanation quality and 1-5 for MCQ quality, per Master Doc Section 4.1 Day 7.")


if __name__ == "__main__":
    run_baseline()