"""
Rate limiting configuration for PrepXMentor.
Keys by authenticated user ID (not IP) since students in Pakistan
frequently share IPs behind campus/mobile-carrier NAT — IP-based
limiting would incorrectly throttle unrelated users on the same network.
Falls back to IP only when no valid token is present.
"""
from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.security import decode_access_token


def get_rate_limit_key(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            return f"user:{payload['sub']}"
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=get_rate_limit_key)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "detail": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Please slow down and try again in a minute.",
            }
        },
    )
