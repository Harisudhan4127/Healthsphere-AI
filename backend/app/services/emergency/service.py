from __future__ import annotations

from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import Alert, EmergencyEvent

VALID_TRANSITIONS = {
    "DETECTED": {"VERIFYING", "RESOLVED"},
    "VERIFYING": {"ALERTED", "RESOLVED"},
    "ALERTED": {"RESPONDING", "RESOLVED"},
    "RESPONDING": {"RESOLVED"},
    "RESOLVED": set(),
}

STATE_FIELD = {
    "VERIFYING": "verified_at",
    "ALERTED": "alerted_at",
    "RESPONDING": "responding_at",
    "RESOLVED": "resolved_at",
}


def create_event(db: Session, payload: dict) -> EmergencyEvent:
    event = EmergencyEvent(
        patient_id=payload["patient_id"],
        event_type=payload.get("event_type", "MEDICAL"),
        severity=payload.get("severity", "MODERATE"),
        latitude=payload.get("latitude"),
        longitude=payload.get("longitude"),
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    alert = Alert(
        patient_id=event.patient_id,
        type="EMERGENCY",
        severity=event.severity,
        message=f"{event.event_type} emergency event detected ({event.severity})",
        status="ACTIVE",
    )
    db.add(alert)
    db.commit()
    return event


def list_events(db: Session, status: str | None = None, limit: int = 50) -> list[EmergencyEvent]:
    query = db.query(EmergencyEvent)
    if status:
        query = query.filter(func.upper(EmergencyEvent.status) == status.upper())
    return query.order_by(EmergencyEvent.detected_at.desc()).limit(limit).all()


def update_status(db: Session, event_id: str, new_status: str) -> EmergencyEvent:
    event = db.query(EmergencyEvent).filter(EmergencyEvent.id == event_id).first()
    if event is None:
        raise ValueError("emergency event not found")
    current = event.current_state
    target = new_status.upper()
    if current != "RESOLVED" and target in VALID_TRANSITIONS.get(current, set()):
        field = STATE_FIELD.get(target)
        if field:
            setattr(event, field, datetime.utcnow())
        if target == "RESOLVED":
            event.resolved_at = datetime.utcnow()
            _resolve_alerts(db, event.patient_id, "EMERGENCY")
        event.status = target
        db.commit()
        db.refresh(event)
    return event


def _resolve_alerts(db: Session, patient_id: str, alert_type: str) -> None:
    db.query(Alert).filter(Alert.patient_id == patient_id, Alert.type == alert_type, Alert.status == "ACTIVE").update(
        {"status": "RESOLVED"}
    )
    db.commit()