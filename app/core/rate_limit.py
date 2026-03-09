from fastapi import HTTPException, Request
from app.core.redis import get_redis
from app.core.config import get_settings


def rate_limit(request: Request) -> None:
    """
    FastAPI dependency — enforces per-IP rate limiting using Redis.
    Raises 429 if the IP exceeds the configured request threshold.
    """
    settings = get_settings()
    client_ip = request.client.host
    key = f"rate_limit:{client_ip}"

    r = get_redis()
    count = r.incr(key)

    if count == 1:
        # First request in this window — set the expiry
        r.expire(key, settings.rate_limit_window_seconds)

    if count > settings.rate_limit_requests:
        ttl = r.ttl(key)
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limit_exceeded",
                "error_description": f"Too many requests. Try again in {ttl} seconds.",
            },
            headers={"Retry-After": str(ttl)},
        )
