from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.models import Alert


def list_alerts(db: Session, severity: str | None = None, status: str | None = None, limit: int = 50) -> list[Alert]:
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity.upper() == severity.upper())
    if status:
        query = query.filter(Alert.status.upper() == status.upper())
    return query.order_by(Alert.created_at.desc()).limit(limit).all()


def update_status(db: Session, alert_id: str, new_status: str) -> Alert:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert is None:
        raise ValueError("alert not found")
    alert.status = new_status.upper()
    db.commit()
    db.refresh(alert)
    return alert


def create_alert(db: Session, patient_id: str, alert_type: str, severity: str, message: str) -> Alert:
    alert = Alert(patient_id=patient_id, type=alert_type, severity=severity, message=message, status="ACTIVE")
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert