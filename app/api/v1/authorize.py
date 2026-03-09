from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
from urllib.parse import urlencode

from app.db.session import get_db
from app.models.client import Client
from app.services.user import authenticate_user
from app.services.authorization_code import create_authorization_code
from app.services.scope import resolve_scopes
from app.core.rate_limit import rate_limit

router = APIRouter(tags=["oauth2"])


def _error_redirect(redirect_uri: str, error: str, description: str, state: Optional[str]) -> RedirectResponse:
    """Redirect to a TRUSTED redirect_uri with error params. Only call after redirect_uri is validated."""
    params = {"error": error, "error_description": description}
    if state:
        params["state"] = state
    return RedirectResponse(url=f"{redirect_uri}?{urlencode(params)}", status_code=302)


@router.get("/authorize", dependencies=[Depends(rate_limit)])
def authorize(
    response_type: str = Query(...),
    client_id: str = Query(...),
    redirect_uri: str = Query(...),
    code_challenge: str = Query(...),
    code_challenge_method: str = Query(...),
    username: str = Query(...),
    password: str = Query(...),
    scope: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
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

    user = authenticate_user(db, email=username, password=password)
    if not user:
        return _error_redirect(redirect_uri, "access_denied", "Invalid user credentials", state)

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
