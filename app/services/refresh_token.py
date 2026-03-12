import hashlib
import os
import uuid
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


def create_refresh_token(
    db: Session,
    user_id: str,
    family_id: uuid.UUID | None = None,
) -> str:
    """
    Create a new refresh token and persist its hashed version.

    - family_id=None (default): generates a new UUID → this token is a family root.
    - family_id provided: inherits the given family → rotated child token.

    Existing call sites in token.py pass no family_id → they become root tokens automatically.
    Returns the raw (unhashed) token string.
    """
    settings = get_settings()
    raw_token = _generate_raw_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)

    db_token = RefreshToken(
        token_hash=_hash_token(raw_token),
        user_id=user_id,
        family_id=family_id if family_id is not None else uuid.uuid4(),
        expires_at=expires_at,
    )
    db.add(db_token)
    db.commit()

    return raw_token


def rotate_refresh_token(db: Session, raw_token: str, ip: str = "unknown") -> tuple[str, str]:
    """
    Validate the incoming refresh token, revoke it, and issue a new one.

    - ip: caller's IP address, used for audit logging (passed from the token endpoint).
    Returns (new_raw_token, user_id).
    Raises ValueError with one of: "invalid_token", "token_reuse",
    "token_revoked", "token_expired".

    Reuse detection: if is_used=True, the token was already rotated — someone
    is replaying an old token. The entire family is revoked immediately.
    """
    from app.core import audit  # local import is a safe precautionary convention

    token_hash = _hash_token(raw_token)
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if db_token is None:
        raise ValueError("invalid_token")

    if db_token.is_used:
        # Reuse detected — revoke the entire token family
        family_id = db_token.family_id
        db.query(RefreshToken).filter(
            RefreshToken.family_id == family_id
        ).update({"revoked": True})
        db.commit()
        audit.refresh_token_reuse_detected(ip=ip, family_id=str(family_id), db=db)
        raise ValueError("token_reuse")

    if db_token.revoked:
        raise ValueError("token_revoked")

    if db_token.expires_at < datetime.now(timezone.utc):
        raise ValueError("token_expired")

    # Mark old token as used and issue a new child token in the same family
    family_id = db_token.family_id
    user_id = str(db_token.user_id)

    db_token.is_used = True
    db.commit()

    new_raw_token = create_refresh_token(db, user_id, family_id=family_id)

    return new_raw_token, user_id
