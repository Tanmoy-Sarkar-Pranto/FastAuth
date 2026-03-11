from fastapi import HTTPException, Request
from app.core.redis import get_redis
from app.core.config import get_settings


def make_rate_limiter(settings_key: str = "rate_limit_requests", key_prefix: str = "rate_limit"):
    """
    Factory that returns a FastAPI dependency enforcing per-IP rate limiting.
    settings_key: attribute name on Settings that holds the request limit.
    key_prefix:   Redis key prefix — use different prefixes to keep limits independent.
    """
    def _limiter(request: Request) -> None:
        settings = get_settings()
        limit = getattr(settings, settings_key)
        key = f"{key_prefix}:{request.client.host}"

        r = get_redis()
        count = r.incr(key)

        if count == 1:
            r.expire(key, settings.rate_limit_window_seconds)

        if count > limit:
            ttl = r.ttl(key)
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "rate_limit_exceeded",
                    "error_description": f"Too many requests. Try again in {ttl} seconds.",
                },
                headers={"Retry-After": str(ttl)},
            )

    return _limiter


rate_limit = make_rate_limiter()
