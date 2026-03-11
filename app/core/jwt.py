import uuid
from datetime import datetime, timezone, timedelta

import jwt

from app.core.config import get_settings


def create_access_token(subject: str, scopes: list[str] | None = None) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)

    payload = {
        "iss": settings.issuer_url,
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "jti": str(uuid.uuid4()),
        "scope": " ".join(scopes) if scopes else "",
    }

    with open(settings.private_key_path, "rb") as f:
        private_key = f.read()

    return jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": settings.key_id})


def decode_access_token(token: str) -> dict | None:
    """
    Decode and verify a JWT. Returns the payload dict, or None if invalid/expired.
    Tries the primary key first, then the secondary key (if configured) to support
    key rotation without breaking introspection of still-valid old tokens.
    """
    settings = get_settings()

    keys_to_try = [settings.public_key_path]
    if settings.secondary_public_key_path:
        keys_to_try.append(settings.secondary_public_key_path)

    for key_path in keys_to_try:
        try:
            with open(key_path, "rb") as f:
                public_key = f.read()
            return jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                options={"require": ["exp", "sub", "iss"]},
            )
        except jwt.PyJWTError:
            continue

    return None
