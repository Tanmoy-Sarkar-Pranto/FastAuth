from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
from urllib.parse import urlencode

from app.db.session import get_db
from app.models.client import Client
from app.services.user import authenticate_user
from app.services.authorization_code import create_authorization_code
from app.services.scope import resolve_scopes
from app.services.lockout import is_locked, record_failure, reset_failures, lockout_ttl
from app.core.rate_limit import rate_limit
from app.core import audit

router = APIRouter(tags=["oauth2"])


def _error_redirect(redirect_uri: str, error: str, description: str, state: Optional[str]) -> RedirectResponse:
    """Redirect to a TRUSTED redirect_uri with error params. Only call after redirect_uri is validated."""
    params = {"error": error, "error_description": description}
    if state:
        params["state"] = state
    return RedirectResponse(url=f"{redirect_uri}?{urlencode(params)}", status_code=302)


@router.post("/authorize", dependencies=[Depends(rate_limit)])
def authorize(
    request: Request,
    response_type: str = Form(...),
    client_id: str = Form(...),
    redirect_uri: str = Form(...),
    code_challenge: str = Form(...),
    code_challenge_method: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    scope: Optional[str] = Form(default=None),
    state: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
):
    ip = request.client.host

    # Validate client and redirect_uri BEFORE doing anything else.
    # On failure here, return a direct HTTP error — never redirect to an unverified URI.
    client = db.query(Client).filter(Client.client_id == client_id, Client.is_active == True).first()
    if not client:
        raise HTTPException(status_code=400, detail={
            "error": "invalid_client",
            "error_description": "Unknown or inactive client",
        })

    registered_uris = [u.strip() for u in client.redirect_uris.split() if u.strip()]
    if redirect_uri not in registered_uris:
        raise HTTPException(status_code=400, detail={
            "error": "invalid_request",
            "error_description": "redirect_uri is not registered for this client",
        })

    # redirect_uri is now trusted. All further errors redirect back to the client.

    if response_type != "code":
        return _error_redirect(redirect_uri, "unsupported_response_type", "Only response_type=code is supported", state)

    if code_challenge_method != "S256":
        return _error_redirect(redirect_uri, "invalid_request", "Only code_challenge_method=S256 is supported", state)

    # Check account lockout
    if is_locked(username):
        ttl = lockout_ttl(username)
        audit.account_locked(ip=ip, email=username, db=db)
        return _error_redirect(redirect_uri, "access_denied", f"Account locked. Try again in {ttl}s.", state)

    user = authenticate_user(db, email=username, password=password)
    if not user:
        record_failure(username)
        audit.login_failure(ip=ip, email=username, reason="invalid_credentials", db=db)
        return _error_redirect(redirect_uri, "access_denied", "Invalid user credentials", state)

    reset_failures(username)
    audit.login_success(ip=ip, user_id=str(user.id), db=db)

    requested = scope.split() if scope else []
    allowed = client.allowed_scopes.split() if client.allowed_scopes else []
    try:
        scopes = resolve_scopes(db, requested=requested, allowed=allowed)
    except ValueError as e:
        return _error_redirect(redirect_uri, "invalid_scope", str(e), state)

    raw_code = create_authorization_code(
        db=db,
        client_id=client_id,
        user_id=str(user.id),
        redirect_uri=redirect_uri,
        scopes=scopes,
        code_challenge=code_challenge,
        code_challenge_method=code_challenge_method,
    )

    params = {"code": raw_code}
    if state:
        params["state"] = state
    return RedirectResponse(url=f"{redirect_uri}?{urlencode(params)}", status_code=302)
