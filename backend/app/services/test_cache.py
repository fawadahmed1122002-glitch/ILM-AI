import time
from app.rag.retrieve import retrieve_top_chunks, format_context_string
from app.rag.llm_client import generate_explanation
from app.services.cache_service import get_cache_stats

subject = "Computer Science"
query = "What is an algorithm?"

chunks, metas, dists, normalized = retrieve_top_chunks(query, subject=subject, top_k=5)
context = format_context_string(chunks)

print("--- First call (should be a cache MISS, calls Groq) ---")
t0 = time.time()
result1 = generate_explanation(context, subject=subject, query=normalized)
print(f"Time: {time.time() - t0:.2f}s")

print("\n--- Second call, same query (should be a cache HIT, instant) ---")
t0 = time.time()
result2 = generate_explanation(context, subject=subject, query=normalized)
print(f"Time: {time.time() - t0:.2f}s")

print("\nResults identical:", result1 == result2)
print("\nCache stats:", get_cache_stats())