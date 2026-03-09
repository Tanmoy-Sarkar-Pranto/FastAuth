import json
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("fastauth.audit")


def _log(event: str, ip: Optional[str] = None, user_id: Optional[str] = None,
         client_id: Optional[str] = None, outcome: str = "success",
         reason: Optional[str] = None, **extra) -> None:
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


# Auth events

def login_success(ip: str, user_id: str) -> None:
    _log("login_success", ip=ip, user_id=user_id)


def login_failure(ip: str, email: str, reason: str) -> None:
    _log("login_failure", ip=ip, outcome="failure", reason=reason, email=email)


def account_locked(ip: str, email: str) -> None:
    _log("account_locked", ip=ip, outcome="failure", reason="too_many_attempts", email=email)


# Token events

def token_issued(ip: str, grant_type: str, user_id: Optional[str] = None,
                 client_id: Optional[str] = None) -> None:
    _log("token_issued", ip=ip, user_id=user_id, client_id=client_id, grant_type=grant_type)


def client_auth_failure(ip: str, client_id: str) -> None:
    _log("client_auth_failure", ip=ip, client_id=client_id, outcome="failure",
         reason="invalid_client_credentials")


# Refresh token events

def refresh_token_rotated(ip: str, user_id: str) -> None:
    _log("refresh_token_rotated", ip=ip, user_id=user_id)


def refresh_token_invalid(ip: str, reason: str) -> None:
    _log("refresh_token_invalid", ip=ip, outcome="failure", reason=reason)


# Introspection events

def introspection_called(ip: str, active: bool) -> None:
    _log("introspection_called", ip=ip, outcome="success" if active else "inactive")
