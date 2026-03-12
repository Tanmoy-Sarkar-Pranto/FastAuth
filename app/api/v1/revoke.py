from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.refresh_token import RefreshToken
from app.services.client import authenticate_client
from app.services.refresh_token import _hash_token
from app.core.rate_limit import make_rate_limiter
from app.core import audit

router = APIRouter(tags=["auth"])

_revoke_rate_limit = make_rate_limiter("rate_limit_requests", "rate_limit_revoke")

INVALID_CLIENT = HTTPException(
    status_code=401,
    detail={"error": "invalid_client", "error_description": "Invalid client credentials"},
)


@router.post("/revoke", dependencies=[Depends(_revoke_rate_limit)])
def revoke_token(
    request: Request,
    client_id: str = Form(...),
    client_secret: str = Form(...),
    token: str = Form(...),
    token_type_hint: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
):
    """
    RFC 7009 token revocation endpoint.

    Revokes a single refresh token. Does NOT revoke the token family
    (single-device logout — other devices remain active).

    Always returns 200 {} after client authentication — never reveals
    whether a token exists (RFC 7009 Section 2.2).
    """
    ip = request.client.host

    # Step 1: authenticate the client
    client = authenticate_client(db, client_id=client_id, client_secret=client_secret)
    if not client:
        audit.client_auth_failure(ip=ip, client_id=client_id, db=db)
        raise INVALID_CLIENT

    # Step 2: look up the token
    token_hash = _hash_token(token)
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    # RFC 7009: return 200 for all "not actionable" cases — never reveal token existence
    if db_token is None:
        return {}

    if db_token.is_used or db_token.revoked:
        return {}

    if db_token.expires_at < datetime.now(timezone.utc):
        return {}

    # Step 3: ownership check
    # Tokens with client_id=None (password grant) may be revoked by any authenticated client.
    if db_token.client_id is not None and db_token.client_id != client.client_id:
        audit.refresh_token_revoke_denied(ip=ip, client_id=client.client_id, db=db)
        return {}

    # Step 4: revoke the token
    db_token.revoked = True
    db.commit()

    audit.refresh_token_revoked(
        ip=ip,
        user_id=str(db_token.user_id),
        client_id=client.client_id,
        db=db,
    )

    return {}
