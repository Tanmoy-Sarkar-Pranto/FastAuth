from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.api.dependencies import require_admin_key
from app.db.session import get_db
from app.models.scope import Scope

router = APIRouter(
    prefix="/admin/scopes",
    tags=["admin"],
    dependencies=[Depends(require_admin_key)],
)


class ScopeCreateRequest(BaseModel):
    name: str
    description: str = ""


class ScopeResponse(BaseModel):
    name: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True


class ScopeUpdateRequest(BaseModel):
    description: Optional[str] = None


@router.get("", response_model=list[ScopeResponse])
def list_scopes(db: Session = Depends(get_db)):
    return db.query(Scope).order_by(Scope.created_at.desc()).all()


@router.post("", response_model=ScopeResponse, status_code=201)
def create_scope(payload: ScopeCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(Scope).filter(Scope.name == payload.name).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail={"error": "conflict", "error_description": f"Scope '{payload.name}' already exists"},
        )
    scope = Scope(name=payload.name, description=payload.description)
    db.add(scope)
    db.commit()
    db.refresh(scope)
    return scope


@router.patch("/{name}", response_model=ScopeResponse)
def update_scope(name: str, payload: ScopeUpdateRequest, db: Session = Depends(get_db)):
    scope = db.query(Scope).filter(Scope.name == name).first()
    if not scope:
        raise HTTPException(
            status_code=404,
            detail={"error": "not_found", "error_description": f"Scope '{name}' not found"},
        )
    if payload.description is not None:
        scope.description = payload.description
    db.commit()
    db.refresh(scope)
    return scope


@router.delete("/{name}", status_code=204)
def delete_scope(name: str, db: Session = Depends(get_db)):
    scope = db.query(Scope).filter(Scope.name == name).first()
    if not scope:
        raise HTTPException(
            status_code=404,
            detail={"error": "not_found", "error_description": f"Scope '{name}' not found"},
        )
    db.delete(scope)
    db.commit()
