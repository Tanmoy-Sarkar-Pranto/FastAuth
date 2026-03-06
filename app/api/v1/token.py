from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import Settings, get_settings
from app.core.jwt import create_access_token
from app.db.session import get_db
from app.schemas.token import TokenResponse
from app.services.user import authenticate_user
from app.services.refresh_token import create_refresh_token, rotate_refresh_token

router = APIRouter(tags=["auth"])

UNSUPPORTED_GRANT = HTTPException(
    status_code=400,
    detail={"error": "unsupported_grant_type", "error_description": "Supported: password, refresh_token"},
)

INVALID_GRANT = HTTPException(
    status_code=401,
    detail={"error": "invalid_grant", "error_description": "Invalid credentials"},
)

INVALID_REFRESH_TOKEN = HTTPException(
    status_code=401,
    detail={"error": "invalid_grant", "error_description": "Refresh token is invalid, expired, or revoked"},
)


@router.post("/token", response_model=TokenResponse)
def token(
    grant_type: str = Form(...),
    username: Optional[str] = Form(default=None),
    password: Optional[str] = Form(default=None),
    refresh_token: Optional[str] = Form(default=None),
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

    else:
        raise UNSUPPORTED_GRANT
