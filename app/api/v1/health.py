from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check(settings: Settings = Depends(get_settings)):
    return {"status": "ok", "env": settings.app_env, "issuer": settings.issuer_url}
