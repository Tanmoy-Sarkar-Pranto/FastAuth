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

    return jwt.encode(payload, private_key, algorithm="RS256")
