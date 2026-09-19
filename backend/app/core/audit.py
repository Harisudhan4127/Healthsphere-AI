from __future__ import annotations

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.models import AuditLog


def record_audit(
    db: Session,
    user_id: str | None,
    action: str,
    resource: str,
    resource_id: str | None = None,
    request: Request | None = None,
    **metadata,
) -> None:
    meta = {"metadata": {**metadata}}
    if request:
        meta["metadata"]["ip"] = request.client.host if request.client else None
        meta["metadata"]["method"] = request.method
        meta["metadata"]["path"] = request.url.path
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        resource_id=resource_id,
        data=meta["metadata"],
    )
    db.add(log)
    db.commit()