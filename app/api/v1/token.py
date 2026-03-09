from fastapi import APIRouter, Depends, Form, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import Settings, get_settings
from app.core.jwt import create_access_token
from app.db.session import get_db
from app.schemas.token import TokenResponse
from app.services.user import authenticate_user
from app.services.refresh_token import create_refresh_token, rotate_refresh_token
from app.services.client import authenticate_client
from app.services.scope import resolve_scopes
from app.services.authorization_code import consume_authorization_code
from app.core.rate_limit import rate_limit

router = APIRouter(tags=["auth"])

UNSUPPORTED_GRANT = HTTPException(
    status_code=400,
    detail={"error": "unsupported_grant_type", "error_description": "Supported: password, refresh_token, client_credentials, authorization_code"},
)

INVALID_CLIENT = HTTPException(
    status_code=401,
    detail={"error": "invalid_client", "error_description": "Invalid client credentials"},
)

INVALID_GRANT = HTTPException(
    status_code=401,
    detail={"error": "invalid_grant", "error_description": "Invalid credentials"},
)

INVALID_REFRESH_TOKEN = HTTPException(
    status_code=401,
    detail={"error": "invalid_grant", "error_description": "Refresh token is invalid, expired, or revoked"},
)


@router.post("/token", response_model=TokenResponse, dependencies=[Depends(rate_limit)])
def token(
    grant_type: str = Form(...),
    username: Optional[str] = Form(default=None),
    password: Optional[str] = Form(default=None),
    refresh_token: Optional[str] = Form(default=None),
    client_id: Optional[str] = Form(default=None),
    client_secret: Optional[str] = Form(default=None),
    scope: Optional[str] = Form(default=None),
    code: Optional[str] = Form(default=None),
    code_verifier: Optional[str] = Form(default=None),
    redirect_uri: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    if grant_type == "password":
        if not username or not password:
            raise INVALID_GRANT

        user = authenticate_user(db, email=username, password=password)
        if not user:
            raise INVALID_GRANT

        access_token = create_access_token(subject=str(user.id))
        new_refresh_token = create_refresh_token(db, user_id=str(user.id))

        return TokenResponse(
            access_token=access_token,
            expires_in=settings.access_token_expire_minutes * 60,
            refresh_token=new_refresh_token,
        )

    elif grant_type == "refresh_token":
        if not refresh_token:
            raise INVALID_REFRESH_TOKEN

        try:
            new_refresh_token, user_id = rotate_refresh_token(db, raw_token=refresh_token)
        except ValueError:
            raise INVALID_REFRESH_TOKEN

        access_token = create_access_token(subject=user_id)

        return TokenResponse(
            access_token=access_token,
            expires_in=settings.access_token_expire_minutes * 60,
            refresh_token=new_refresh_token,
        )

    elif grant_type == "client_credentials":
        if not client_id or not client_secret:
            raise INVALID_CLIENT

        client = authenticate_client(db, client_id=client_id, client_secret=client_secret)
        if not client:
            raise INVALID_CLIENT

        requested = scope.split() if scope else []
        allowed = client.allowed_scopes.split() if client.allowed_scopes else []
        try:
            scopes = resolve_scopes(db, requested=requested, allowed=allowed)
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_scope", "error_description": str(e)},
            )
        access_token = create_access_token(subject=client.client_id, scopes=scopes)

        return TokenResponse(
            access_token=access_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )

    elif grant_type == "authorization_code":
        if not code or not code_verifier or not redirect_uri or not client_id:
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_request", "error_description": "code, code_verifier, redirect_uri, and client_id are required"},
            )

        try:
            db_code = consume_authorization_code(
                db=db,
                raw_code=code,
                code_verifier=code_verifier,
                redirect_uri=redirect_uri,
                client_id=client_id,
            )
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_grant", "error_description": str(e)},
            )

        scopes = db_code.scopes.split() if db_code.scopes else []
        access_token = create_access_token(subject=str(db_code.user_id), scopes=scopes)
        new_refresh_token = create_refresh_token(db, user_id=str(db_code.user_id))

        return TokenResponse(
            access_token=access_token,
            expires_in=settings.access_token_expire_minutes * 60,
            refresh_token=new_refresh_token,
        )

    else:
        raise UNSUPPORTED_GRANT
