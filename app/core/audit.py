import json
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("fastauth.audit")


def _log(
    event: str,
    ip: Optional[str] = None,
    user_id: Optional[str] = None,
    client_id: Optional[str] = None,
    outcome: str = "success",
    reason: Optional[str] = None,
    db=None,
    **extra,
) -> None:
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "outcome": outcome,
        "ip": ip,
        "user_id": user_id,
        "client_id": client_id,
        "reason": reason,
        **extra,
    }
    # Remove None values for cleaner logs
    entry = {k: v for k, v in entry.items() if v is not None}
    logger.info(json.dumps(entry))

    # Persist to DB — fail-open: never block auth if the DB write fails
    if db is not None:
        try:
            from app.models.audit_log import AuditLog
            db.add(AuditLog(
                event=event,
                outcome=outcome,
                ip=ip,
                user_id=str(user_id) if user_id else None,
                client_id=str(client_id) if client_id else None,
                reason=reason,
                extra=dict(extra) if extra else None,
            ))
            db.commit()
        except Exception as e:
            logger.error(f"audit_log_db_write_failed event={event} error={e}")
            try:
                db.rollback()
            except Exception:
                pass


# Auth events

def login_success(ip: str, user_id: str, db=None) -> None:
    _log("login_success", ip=ip, user_id=user_id, db=db)


def login_failure(ip: str, email: str, reason: str, db=None) -> None:
    _log("login_failure", ip=ip, outcome="failure", reason=reason, db=db, email=email)


def account_locked(ip: str, email: str, db=None) -> None:
    _log("account_locked", ip=ip, outcome="failure", reason="too_many_attempts", db=db, email=email)


# Token events

def token_issued(ip: str, grant_type: str, user_id: Optional[str] = None,
                 client_id: Optional[str] = None, db=None) -> None:
    _log("token_issued", ip=ip, user_id=user_id, client_id=client_id, db=db, grant_type=grant_type)


def client_auth_failure(ip: str, client_id: str, db=None) -> None:
    _log("client_auth_failure", ip=ip, client_id=client_id, outcome="failure",
         reason="invalid_client_credentials", db=db)


# Refresh token events

def refresh_token_rotated(ip: str, user_id: str, db=None) -> None:
    _log("refresh_token_rotated", ip=ip, user_id=user_id, db=db)


def refresh_token_invalid(ip: str, reason: str, db=None) -> None:
    _log("refresh_token_invalid", ip=ip, outcome="failure", reason=reason, db=db)


def refresh_token_reuse_detected(ip: str, family_id: str, db=None) -> None:
    """Security event: a previously-used refresh token was presented again."""
    _log(
        "refresh_token_reuse_detected",
        ip=ip,
        outcome="failure",
        reason="token_reuse",
        db=db,
        family_id=family_id,  # stored in extra JSONB column in audit_logs
    )


# Introspection events

def introspection_called(ip: str, active: bool, db=None) -> None:
    _log("introspection_called", ip=ip, outcome="success" if active else "inactive", db=db)
