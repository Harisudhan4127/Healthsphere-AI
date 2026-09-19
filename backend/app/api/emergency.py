from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_patient_or_404
from app.core.audit import record_audit
from app.core.database import get_db
from app.models.models import EmergencyEvent, Patient, User
from app.schemas.emergency import EmergencyEventCreate, EmergencyEventOut, EmergencyEventUpdate
from app.services.emergency.service import create_event, list_events, update_status

router = APIRouter(prefix="/emergencies", tags=["emergency"])


@router.get("", response_model=list[EmergencyEventOut])
def get_events(
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    events = list_events(db, status=status_filter)
    patients = {p.id: p for p in db.query(Patient).all()}
    result = []
    for event in events:
        out = EmergencyEventOut.model_validate(event)
        out.patient_id = event.patient_id
        out.timeline = [{"time": e["time"], "label": e["label"]} for e in event.timeline]
        patient = patients.get(event.patient_id)
        out.patient_name = patient.name if patient else None
        result.append(out)
    return result


@router.post("", response_model=EmergencyEventOut, status_code=201)
def create_emergency(
    payload: EmergencyEventCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_patient_or_404(db, payload.patient_id)
    event = create_event(db, payload.model_dump())
    record_audit(db, current_user.id, "emergency.create", "emergency_event", event.id, request=request)
    out = EmergencyEventOut.model_validate(event)
    out.patient_id = event.patient_id
    patient = db.query(Patient).filter(Patient.id == event.patient_id).first()
    out.patient_name = patient.name if patient else None
    return out


@router.get("/{event_id}", response_model=EmergencyEventOut)
def get_event(event_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.query(EmergencyEvent).filter(EmergencyEvent.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Emergency event not found")
    out = EmergencyEventOut.model_validate(event)
    out.patient_id = event.patient_id
    out.timeline = [{"time": e["time"], "label": e["label"]} for e in event.timeline]
    patient = db.query(Patient).filter(Patient.id == event.patient_id).first()
    out.patient_name = patient.name if patient else None
    return out


@router.put("/{event_id}/status", response_model=EmergencyEventOut)
def change_status(
    event_id: str,
    payload: EmergencyEventUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        event = update_status(db, event_id, payload.status)
    except ValueError:
        raise HTTPException(status_code=404, detail="Emergency event not found")
    record_audit(db, current_user.id, "emergency.status", "emergency_event", event.id, request=request, status=event.status)
    out = EmergencyEventOut.model_validate(event)
    out.patient_id = event.patient_id
    out.timeline = [{"time": e["time"], "label": e["label"]} for e in event.timeline]
    patient = db.query(Patient).filter(Patient.id == event.patient_id).first()
    out.patient_name = patient.name if patient else None
    return out