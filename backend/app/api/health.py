from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_patient_or_404
from app.core.audit import record_audit
from app.core.database import get_db
from app.models.models import HealthRecord, Symptom, User
from app.schemas.health import (
    HealthRecordCreate,
    HealthRecordOut,
    HealthSummaryOut,
    SymptomCreate,
    SymptomOut,
)
from app.services.health.service import add_record, add_symptom, list_records, list_symptoms, summary, trends

router = APIRouter(prefix="/patients/{patient_id}", tags=["health"])


@router.get("/health", response_model=list[HealthRecordOut])
def get_health(
    patient_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_patient_or_404(db, patient_id)
    return list_records(db, patient_id, limit=limit)


@router.post("/health", response_model=HealthRecordOut, status_code=201)
def post_health(
    patient_id: str,
    payload: HealthRecordCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_patient_or_404(db, patient_id)
    record = add_record(db, patient_id, payload.model_dump())
    record_audit(db, current_user.id, "health.record.create", "health_record", record.id, request=request)
    return record


@router.get("/health/trends", response_model=list[HealthRecordOut])
def get_trends(
    patient_id: str,
    days: int = Query(default=14, ge=2, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_patient_or_404(db, patient_id)
    return trends(db, patient_id, days=days)


@router.get("/health/summary", response_model=HealthSummaryOut)
def get_summary(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_patient_or_404(db, patient_id)
    data = summary(db, patient_id)
    return HealthSummaryOut(
        latest=data["latest"],
        average=data["average"],
        trend=list_records(db, patient_id, limit=60),
    )


@router.post("/symptoms", response_model=SymptomOut, status_code=201)
def post_symptom(
    patient_id: str,
    payload: SymptomCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_patient_or_404(db, patient_id)
    symptom = add_symptom(db, patient_id, payload.model_dump())
    record_audit(db, current_user.id, "health.symptom.create", "symptom", symptom.id, request=request)
    return symptom


@router.get("/symptoms", response_model=list[SymptomOut])
def get_symptoms(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_patient_or_404(db, patient_id)
    return list_symptoms(db, patient_id)