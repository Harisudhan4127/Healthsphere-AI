from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_patient_or_404, get_user_settings
from app.core.audit import record_audit
from app.core.database import get_db
from app.intelligence.risk_engine import latest_risk
from app.models.models import Alert, Patient, User
from app.schemas.patient import PatientCreate, PatientOut, PatientUpdate

router = APIRouter(prefix="/patients", tags=["patients"])


def to_out(patient: Patient) -> PatientOut:
    out = PatientOut.model_validate(patient)
    risk = getattr(patient, "_risk", None)
    if risk:
        out.risk_score = float(risk.score)
        out.risk_level = risk.level
    return out


def _attach_risk(db: Session, patients: list[Patient]) -> None:
    for patient in patients:
        patient._risk = latest_risk(db, patient.id)


@router.get("", response_model=list[PatientOut])
def list_patients(
    search: str | None = Query(default=None),
    status: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Patient)
    if search:
        query = query.filter(or_(Patient.name.ilike(f"%{search}%"), Patient.contact.ilike(f"%{search}%")))
    if status:
        query = query.filter(func.upper(Patient.status) == status.upper())
    if current_user.organization_id:
        query = query.filter(Patient.organization_id == current_user.organization_id)
    patients = query.order_by(Patient.created_at.desc()).limit(limit).all()
    _attach_risk(db, patients)
    return [to_out(p) for p in patients]


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(payload: PatientCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = Patient(
        name=payload.name,
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        contact=payload.contact,
        status=payload.status,
        organization_id=current_user.organization_id,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    record_audit(db, current_user.id, "patient.create", "patient", patient.id, request=request)
    return to_out(patient)


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = get_patient_or_404(db, patient_id)
    patient._risk = latest_risk(db, patient_id)
    return to_out(patient)


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: str, payload: PatientUpdate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = get_patient_or_404(db, patient_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    record_audit(db, current_user.id, "patient.update", "patient", patient.id, request=request)
    return to_out(patient)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: str, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete patients")
    patient = get_patient_or_404(db, patient_id)
    db.query(Alert).filter(Alert.patient_id == patient_id).delete()
    patient.status = "ARCHIVED"
    db.commit()
    record_audit(db, current_user.id, "patient.delete", "patient", patient.id, request=request)
    return None