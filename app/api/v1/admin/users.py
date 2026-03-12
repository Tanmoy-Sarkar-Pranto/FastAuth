from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.api.dependencies import require_admin_key
from app.db.session import get_db
from app.models.user import User
from app.services.user import create_user

router = APIRouter(
    prefix="/admin/users",
    tags=["admin"],
    dependencies=[Depends(require_admin_key)],
)


class AdminUserCreateRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = Field(default=None, max_length=255)


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str | None = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("", response_model=UserResponse, status_code=201)
def admin_create_user(payload: AdminUserCreateRequest, db: Session = Depends(get_db)):
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_request", "error_description": "Password must be at least 8 characters"},
        )
    try:
        user = create_user(db, email=payload.email, password=payload.password, name=payload.name)
    except ValueError as e:
        raise HTTPException(
            status_code=409,
            detail={"error": "conflict", "error_description": str(e)},
        )
    return user


@router.patch("/{user_id}/active", response_model=UserResponse)
def toggle_user_active(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail={"error": "not_found", "error_description": "User not found"},
        )
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user
