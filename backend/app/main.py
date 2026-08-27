from fastapi import FastAPI, Request
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.auth import router as auth_router
from app.api.v1.query import router as query_router
from app.api.v1.admin import router as admin_router
from app.api.v1.internal import router as internal_router
from app.api.v1.mock_tests import router as mock_tests_router
from app.api.v1.past_papers import router as past_papers_router
from app.api.v1.study_chat import router as study_chat_router

app = FastAPI(title="PrepXMentor API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","https://prepxmentor.up.railway.app", "https://prepxmentor-frontend-production.up.railway.app"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(query_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(internal_router, prefix="/api/v1")
app.include_router(mock_tests_router, prefix="/api/v1")
app.include_router(past_papers_router, prefix="/api/v1")
app.include_router(study_chat_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "code": "INTERNAL_ERROR"}
    )