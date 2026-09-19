from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_patient_or_404
from app.core.audit import record_audit
from app.core.database import get_db
from app.models.models import Medication, User
from app.schemas.medication import (
    MedicationCreate,
    MedicationOut,
    MedicationReadingCreate,
    MedicationReadingOut,
    MedicationStatusOut,
)
from app.services.medication.service import add_reading, create_medication, list_medications, status

router = APIRouter(tags=["medication"])


@router.get("/patients/{patient_id}/medications", response_model=list[MedicationOut])
def get_medications(patient_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    get_patient_or_404(db, patient_id)
    return list_medications(db, patient_id)


@router.post("/patients/{patient_id}/medications", response_model=MedicationOut, status_code=201)
def post_medication(
    patient_id: str,
    payload: MedicationCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_patient_or_404(db, patient_id)
    med = create_medication(db, patient_id, payload.name, payload.storage_requirements.model_dump())
    record_audit(db, current_user.id, "medication.create", "medication", med.id, request=request)
    return med


@router.post("/medications/{medication_id}/readings", response_model=MedicationReadingOut, status_code=201)
def post_reading(
    medication_id: str,
    payload: MedicationReadingCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = add_reading(db, medication_id, payload.temperature, payload.duration)
    except ValueError:
        raise HTTPException(status_code=404, detail="Medication not found")
    record_audit(db, current_user.id, "medication.reading.create", "medication_reading", result["reading"].id, request=request)
    return result["reading"]


@router.get("/medications/{medication_id}/status", response_model=MedicationStatusOut)
def get_status(medication_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        data = status(db, medication_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Medication not found")
    return MedicationStatusOut(
        medication=MedicationOut.model_validate(data["medication"]),
        status=data["status"],
        condition=data["condition"],
        last_check=data["last_check"],
        readings=data["readings"],
    )


@router.get("/medications/{medication_id}", response_model=MedicationStatusOut)
def get_medication_detail(medication_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_status(medication_id, current_user, db)