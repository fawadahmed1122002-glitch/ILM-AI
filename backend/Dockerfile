FROM python:3.11-slim

WORKDIR /app

# System deps needed for psycopg2 and sentence-transformers/tokenizers builds
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only torch FIRST, before requirements.txt.
# sentence-transformers depends on torch — if we let pip resolve it
# normally on Linux, it grabs the CUDA build (multi-GB, useless on
# Railway's CPU-only containers). Installing the small CPU wheel here
# means pip sees torch already satisfied later and skips the CUDA one.
RUN pip install --no-cache-dir torch==2.12.1 --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model into the image so it doesn't try to
# hit HuggingFace Hub on every cold start (matches HF_HUB_OFFLINE usage
# from local dev).
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
ENV HF_HUB_OFFLINE=1

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
