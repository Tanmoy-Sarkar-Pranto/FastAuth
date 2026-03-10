import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.api.dependencies import require_admin_key
from app.core.security import hash_password
from app.db.session import get_db
from app.models.client import Client

router = APIRouter(
    prefix="/admin/clients",
    tags=["admin"],
    dependencies=[Depends(require_admin_key)],
)


class ClientCreateRequest(BaseModel):
    client_id: Optional[str] = None  # auto-generated if not provided
    allowed_scopes: str = ""
    redirect_uris: str = ""


class ClientCreateResponse(BaseModel):
    client_id: str
    client_secret: str  # shown only once
    allowed_scopes: str
    redirect_uris: str
    is_active: bool


class ClientListItem(BaseModel):
    client_id: str
    allowed_scopes: str
    redirect_uris: str
    is_active: bool

    class Config:
        from_attributes = True


@router.post("", response_model=ClientCreateResponse, status_code=201)
def create_client(payload: ClientCreateRequest, db: Session = Depends(get_db)):
    client_id = payload.client_id or f"client-{uuid.uuid4().hex[:12]}"

    existing = db.query(Client).filter(Client.client_id == client_id).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail={"error": "conflict", "error_description": f"Client '{client_id}' already exists"},
        )

    raw_secret = secrets.token_urlsafe(32)

    client = Client(
        client_id=client_id,
        client_secret_hash=hash_password(raw_secret),
        allowed_scopes=payload.allowed_scopes,
        redirect_uris=payload.redirect_uris,
    )
    db.add(client)
    db.commit()

    return ClientCreateResponse(
        client_id=client_id,
        client_secret=raw_secret,
        allowed_scopes=payload.allowed_scopes,
        redirect_uris=payload.redirect_uris,
        is_active=True,
    )


@router.get("", response_model=list[ClientListItem])
def list_clients(db: Session = Depends(get_db)):
    return db.query(Client).order_by(Client.created_at.desc()).all()


@router.patch("/{client_id}/active", response_model=ClientListItem)
def toggle_client_active(client_id: str, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail={"error": "not_found", "error_description": f"Client '{client_id}' not found"})
    client.is_active = not client.is_active
    db.commit()
    db.refresh(client)
    return client
