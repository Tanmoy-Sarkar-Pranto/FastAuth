from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin_key
from app.db.session import get_db
from app.models.audit_log import AuditLog

router = APIRouter(
    prefix="/admin/audit-logs",
    tags=["admin"],
    dependencies=[Depends(require_admin_key)],
)


class AuditLogItem(BaseModel):
    id: UUID
    timestamp: datetime
    event: str
    outcome: str
    ip: Optional[str] = None
    user_id: Optional[str] = None
    client_id: Optional[str] = None
    reason: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("", response_model=list[AuditLogItem])
def list_audit_logs(
    event: Optional[str] = Query(default=None),
    outcome: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if event:
        q = q.filter(AuditLog.event == event)
    if outcome:
        q = q.filter(AuditLog.outcome == outcome)
    return q.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
