from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin_key
from app.core.redis import get_redis
from app.db.session import get_db
from app.models.client import Client
from app.models.refresh_token import RefreshToken
from app.models.scope import Scope
from app.models.user import User

router = APIRouter(
    prefix="/admin/stats",
    tags=["admin"],
    dependencies=[Depends(require_admin_key)],
)


@router.get("")
def get_stats(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    # Users
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    new_users = db.query(User).filter(User.created_at >= week_ago).count()

    # Clients
    total_clients = db.query(Client).count()
    active_clients = db.query(Client).filter(Client.is_active == True).count()

    # Scopes
    total_scopes = db.query(Scope).count()

    # Refresh tokens
    active_tokens = db.query(RefreshToken).filter(
        RefreshToken.revoked == False,
        RefreshToken.expires_at > now,
    ).count()
    revoked_tokens = db.query(RefreshToken).filter(RefreshToken.revoked == True).count()
    expired_tokens = db.query(RefreshToken).filter(
        RefreshToken.revoked == False,
        RefreshToken.expires_at <= now,
    ).count()

    # System health
    db_healthy = True
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception:
        db_healthy = False

    redis_healthy = True
    try:
        get_redis().ping()
    except Exception:
        redis_healthy = False

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": total_users - active_users,
            "new_last_7d": new_users,
        },
        "clients": {
            "total": total_clients,
            "active": active_clients,
            "inactive": total_clients - active_clients,
        },
        "scopes": {
            "total": total_scopes,
        },
        "refresh_tokens": {
            "active": active_tokens,
            "revoked": revoked_tokens,
            "expired": expired_tokens,
        },
        "system": {
            "db_healthy": db_healthy,
            "redis_healthy": redis_healthy,
        },
    }
