from app.core.redis import get_redis
from app.core.config import get_settings


def _key(email: str) -> str:
    return f"lockout:{email.lower()}"


def is_locked(email: str) -> bool:
    """Return True if the account is currently locked."""
    settings = get_settings()
    r = get_redis()
    count = r.get(_key(email))
    if count is None:
        return False
    return int(count) >= settings.max_login_attempts


def record_failure(email: str) -> int:
    """
    Increment the failure counter for this email.
    Sets TTL on first failure. Returns the current failure count.
    """
    settings = get_settings()
    r = get_redis()
    key = _key(email)
    count = r.incr(key)
    if count == 1:
        r.expire(key, settings.lockout_duration_seconds)
    return count


def reset_failures(email: str) -> None:
    """Clear the failure counter after a successful login."""
    r = get_redis()
    r.delete(_key(email))


def lockout_ttl(email: str) -> int:
    """Return seconds until lockout expires (for error messages)."""
    r = get_redis()
    ttl = r.ttl(_key(email))
    return max(ttl, 0)
