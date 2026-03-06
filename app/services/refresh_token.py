import hashlib
import os
import base64
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken
from app.core.config import get_settings


def _generate_raw_token() -> str:
    """Generate a cryptographically secure random token (URL-safe base64)."""
    return base64.urlsafe_b64encode(os.urandom(32)).decode()


def _hash_token(raw_token: str) -> str:
    """SHA-256 hash of the raw token for storage."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


def create_refresh_token(db: Session, user_id: str) -> str:
    """Create a new refresh token, persist hashed version, return raw token."""
    settings = get_settings()
    raw_token = _generate_raw_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)

    db_token = RefreshToken(
        token_hash=_hash_token(raw_token),
        user_id=user_id,
        expires_at=expires_at,
    )
    db.add(db_token)
    db.commit()

    return raw_token


def rotate_refresh_token(db: Session, raw_token: str) -> tuple[str, str]:
    """
    Validate the incoming refresh token, revoke it, issue a new one.
    Returns (new_raw_token, user_id) or raises ValueError on invalid/expired/revoked token.
    """
    token_hash = _hash_token(raw_token)
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if db_token is None:
        raise ValueError("invalid_token")

    if db_token.revoked:
        raise ValueError("token_revoked")

    if db_token.expires_at < datetime.now(timezone.utc):
        raise ValueError("token_expired")

    # Revoke the old token
    db_token.revoked = True
    db.commit()

    # Issue a new one
    user_id = str(db_token.user_id)
    new_raw_token = create_refresh_token(db, user_id)

    return new_raw_token, user_id
