import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.services.user import create_user

router = APIRouter(prefix="/users", tags=["users"])


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = Field(default=None, max_length=255)


class UserRegisterResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


def _create_user_or_raise(db: Session, email: str, password: str, name: str | None = None):
    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_request", "error_description": "Password must be at least 8 characters"},
        )
    try:
        return create_user(db, email=email, password=password, name=name)
    except ValueError as e:
        raise HTTPException(
            status_code=409,
            detail={"error": "conflict", "error_description": str(e)},
        )


@router.post("/register", response_model=UserRegisterResponse, status_code=201)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    if not settings.allow_public_registration:
        raise HTTPException(
            status_code=403,
            detail={"error": "forbidden", "error_description": "Public registration is disabled. Contact an administrator."},
        )
    return _create_user_or_raise(db, email=payload.email, password=payload.password, name=payload.name)
