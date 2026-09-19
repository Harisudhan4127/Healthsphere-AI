from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.audit import record_audit
from app.core.database import get_db
from app.models.models import Alert, Patient, User
from app.schemas.alert import AlertOut, AlertStatusUpdate
from app.services.alerts.service import list_alerts, update_status

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
def get_alerts(
    severity: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alerts = list_alerts(db, severity=severity, status=status, limit=limit)
    patient_ids = {a.patient_id for a in alerts if a.patient_id}
    patients = {p.id: p for p in db.query(Patient).filter(Patient.id.in_(patient_ids)).all()} if patient_ids else {}
    result = []
    for alert in alerts:
        out = AlertOut.model_validate(alert)
        patient = patients.get(alert.patient_id)
        out.patient_name = patient.name if patient else None
        result.append(out)
    return result


@router.put("/{alert_id}/status", response_model=AlertOut)
def change_alert_status(
    alert_id: str,
    payload: AlertStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        alert = update_status(db, alert_id, payload.status)
    except ValueError:
        raise HTTPException(status_code=404, detail="Alert not found")
    record_audit(db, current_user.id, "alert.status", "alert", alert.id, request=request, status=alert.status)
    out = AlertOut.model_validate(alert)
    patient = db.query(Patient).filter(Patient.id == alert.patient_id).first() if alert.patient_id else None
    out.patient_name = patient.name if patient else None
    return out