from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.jwt import create_access_token
from app.db.session import get_db
from app.schemas.token import TokenResponse
from app.services.user import authenticate_user

router = APIRouter(tags=["auth"])

UNSUPPORTED_GRANT = HTTPException(
    status_code=400,
    detail={"error": "unsupported_grant_type", "error_description": "Supported: password"},
)

INVALID_GRANT = HTTPException(
    status_code=401,
    detail={"error": "invalid_grant", "error_description": "Invalid credentials"},
)


@router.post("/token", response_model=TokenResponse)
def token(
    grant_type: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    if grant_type != "password":
        raise UNSUPPORTED_GRANT

    user = authenticate_user(db, email=username, password=password)
    if not user:
        raise INVALID_GRANT

    access_token = create_access_token(subject=str(user.id))

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60,
    )
