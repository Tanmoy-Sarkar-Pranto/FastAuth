from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.api.dependencies import require_admin_key
from app.db.session import get_db
from app.services.user import create_user

router = APIRouter(
    prefix="/admin/users",
    tags=["admin"],
    dependencies=[Depends(require_admin_key)],
)


class AdminUserCreateRequest(BaseModel):
    email: EmailStr
    password: str


class AdminUserCreateResponse(BaseModel):
    id: uuid.UUID
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=AdminUserCreateResponse, status_code=201)
def admin_create_user(payload: AdminUserCreateRequest, db: Session = Depends(get_db)):
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_request", "error_description": "Password must be at least 8 characters"},
        )

    try:
        user = create_user(db, email=payload.email, password=payload.password)
    except ValueError as e:
        raise HTTPException(
            status_code=409,
            detail={"error": "conflict", "error_description": str(e)},
        )

    return user
