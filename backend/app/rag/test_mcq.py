"""
End-to-end test: query -> retrieve -> generate MCQs -> validate.
"""
from app.rag.retrieve import retrieve_top_chunks, format_context_string
from app.rag.llm_client import generate_mcqs

topic = "Software Development Life Cycle"
subject = "Computer Science"

chunks, metas, dists, normalized = retrieve_top_chunks(topic, subject=subject, top_k=5)
context = format_context_string(chunks)

result = generate_mcqs(context, subject=subject, topic=topic)

if result["parse_error"]:
    print("❌ PARSE ERROR:", result["parse_error"])
else:
    print(f"✅ Valid MCQs: {len(result['valid_mcqs'])}")
    print(f"⚠️  Invalid MCQs: {len(result['invalid_mcqs'])}")

    for i, mcq in enumerate(result["valid_mcqs"]):
        print(f"\n--- MCQ {i+1} ---")
        print("Q (EN):", mcq["question_en"])
        print("Q (UR):", mcq["question_ur"])
        print("A:", mcq["opt_a"])
        print("B:", mcq["opt_b"])
        print("C:", mcq["opt_c"])
        print("D:", mcq["opt_d"])
        print("Correct:", mcq["correct"])
        print("Difficulty:", mcq["difficulty"])
        print("Explanation:", mcq["explanation_en"])

    for mcq, errors in result["invalid_mcqs"]:
        print("\n⚠️ INVALID MCQ:", errors)
        print(mcq)