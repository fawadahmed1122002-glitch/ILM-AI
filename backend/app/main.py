from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.api.v1.auth import router as auth_router

app = FastAPI(title="ILMAI API", version="0.1.0")

app.include_router(auth_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "code": "INTERNAL_ERROR"}
    )