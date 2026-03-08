import hashlib
import os
import base64
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.models.authorization_code import AuthorizationCode


def _generate_raw_code() -> str:
    return base64.urlsafe_b64encode(os.urandom(32)).decode()


def _hash_code(raw_code: str) -> str:
    return hashlib.sha256(raw_code.encode()).hexdigest()


def create_authorization_code(
    db: Session,
    client_id: str,
    user_id: str,
    redirect_uri: str,
    scopes: list[str],
    code_challenge: str,
    code_challenge_method: str = "S256",
) -> str:
    """Store a new authorization code and return the raw code."""
    raw_code = _generate_raw_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    db_code = AuthorizationCode(
        code_hash=_hash_code(raw_code),
        client_id=client_id,
        user_id=user_id,
        redirect_uri=redirect_uri,
        scopes=" ".join(scopes),
        code_challenge=code_challenge,
        code_challenge_method=code_challenge_method,
        expires_at=expires_at,
    )
    db.add(db_code)
    db.commit()

    return raw_code


def verify_pkce(code_verifier: str, stored_challenge: str) -> bool:
    """
    Verify that SHA256(code_verifier) matches the stored code_challenge.
    Both are BASE64URL encoded — we normalize padding before comparing.
    """
    digest = hashlib.sha256(code_verifier.encode()).digest()
    computed = base64.urlsafe_b64encode(digest).decode().rstrip("=")
    stored = stored_challenge.rstrip("=")
    return computed == stored


def consume_authorization_code(
    db: Session, raw_code: str, code_verifier: str, redirect_uri: str, client_id: str
) -> AuthorizationCode:
    """
    Look up, validate, verify PKCE, and mark a code as used.
    Raises ValueError with reason on any failure.
    """
    code_hash = _hash_code(raw_code)
    db_code = db.query(AuthorizationCode).filter(
        AuthorizationCode.code_hash == code_hash
    ).first()

    if db_code is None:
        raise ValueError("invalid_code")

    if db_code.used:
        raise ValueError("code_already_used")

    if db_code.expires_at < datetime.now(timezone.utc):
        raise ValueError("code_expired")

    if db_code.client_id != client_id:
        raise ValueError("client_mismatch")

    if db_code.redirect_uri != redirect_uri:
        raise ValueError("redirect_uri_mismatch")

    if not verify_pkce(code_verifier, db_code.code_challenge):
        raise ValueError("pkce_verification_failed")

    db_code.used = True
    db.commit()

    return db_code
