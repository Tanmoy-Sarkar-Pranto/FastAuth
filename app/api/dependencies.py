from fastapi import Header, HTTPException
from app.core.config import get_settings


def require_admin_key(x_admin_key: str = Header(...)):
    """FastAPI dependency — rejects requests without a valid X-Admin-Key header."""
    settings = get_settings()
    if x_admin_key != settings.admin_api_key:
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "error_description": "Invalid or missing admin API key"},
        )
