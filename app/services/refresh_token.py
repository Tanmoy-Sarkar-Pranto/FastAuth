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
    client_id: str | None = None,
) -> str:
    """
    Create a new refresh token and persist its hashed version.

    - family_id=None: generates a new UUID → family root token.
    - family_id provided: inherits the given family → rotated child token.
    - client_id=None: password-grant token (no client association).
    - client_id provided: stored on the token for ownership verification at /revoke.

    Returns the raw (unhashed) token string.
    """
    settings = get_settings()
    raw_token = _generate_raw_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)

    db_token = RefreshToken(
        token_hash=_hash_token(raw_token),
        user_id=user_id,
        family_id=family_id if family_id is not None else uuid.uuid4(),
        client_id=client_id,
        expires_at=expires_at,
    )
    db.add(db_token)
    db.commit()

    return raw_token


def rotate_refresh_token(db: Session, raw_token: str, ip: str = "unknown") -> tuple[str, str]:
    """
    Validate the incoming refresh token, revoke it, and issue a new one.

    - ip: caller's IP address for audit logging.
    Returns (new_raw_token, user_id).
    Raises ValueError with one of: "invalid_token", "token_reuse",
    "token_revoked", "token_expired".
    """
    from app.core import audit

    token_hash = _hash_token(raw_token)
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if db_token is None:
        raise ValueError("invalid_token")

    if db_token.is_used:
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

    # Inherit family and client from parent token
    family_id = db_token.family_id
    client_id = db_token.client_id
    user_id = str(db_token.user_id)

    db_token.is_used = True
    db.commit()

    new_raw_token = create_refresh_token(db, user_id, family_id=family_id, client_id=client_id)

    return new_raw_token, user_id
