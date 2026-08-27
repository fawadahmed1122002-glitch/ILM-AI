import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://ilmai_user:ilmai_dev_password@localhost/ilmai_db"
)

# JWT
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-in-production")
if not JWT_SECRET_KEY or JWT_SECRET_KEY == "dev-secret-change-in-production":
    raise RuntimeError("JWT_SECRET_KEY must be set to a secure value in production.")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Data paths — absolute, derived from env or default to ~/project/ILM-AI/data
DATA_DIR = os.environ.get("DATA_DIR", "/home/fawad/project/ILM-AI/data")
CHROMA_DB_PATH = os.path.join(DATA_DIR, "chroma_db")
CACHE_DB_PATH = os.path.join(DATA_DIR, "cache.sqlite")

# RAG
COLLECTION_NAME = "ilmai_knowledge_base"
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")