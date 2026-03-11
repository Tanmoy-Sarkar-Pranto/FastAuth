import hmac
from typing import Optional

from fastapi import Header, HTTPException

from app.core.config import get_settings


def require_admin_key(x_admin_key: Optional[str] = Header(None)):
    """FastAPI dependency — rejects requests without a valid X-Admin-Key header."""
    settings = get_settings()
    if not x_admin_key or not hmac.compare_digest(x_admin_key, settings.admin_api_key):
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "error_description": "Invalid or missing admin API key"},
        )
