from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import Settings, get_settings
from app.db.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check(
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "env": settings.app_env, "issuer": settings.issuer_url}
