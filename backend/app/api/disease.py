from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_patient_or_404
from app.core.audit import record_audit
from app.core.database import get_db
from app.models.models import User
from app.schemas.disease import DiseaseAssessmentCreate, DiseaseAssessmentOut, DiseaseAssessmentRunOut
from app.services.disease.service import list_assessments, run_assessment

router = APIRouter(prefix="/patients/{patient_id}", tags=["disease-risk"])


@router.post("/disease-assessment", response_model=DiseaseAssessmentRunOut, status_code=201)
def create_assessment(
    patient_id: str,
    payload: DiseaseAssessmentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_patient_or_404(db, patient_id)
    result = run_assessment(
        db,
        patient_id,
        payload.assessment_type,
        payload.biomarker_observations,
        payload.symptom_indicators,
        payload.health_history,
        payload.age_group,
        payload.risk_factors,
    )
    record_audit(db, current_user.id, "disease.assessment.create", "disease_assessment", result["assessment"].id, request=request)
    return DiseaseAssessmentRunOut(
        assessment=DiseaseAssessmentOut.model_validate(result["assessment"]),
        explanation=result["explanation"],
    )


@router.get("/disease-assessments", response_model=list[DiseaseAssessmentOut])
def get_assessments(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_patient_or_404(db, patient_id)
    return list_assessments(db, patient_id)