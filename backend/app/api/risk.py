from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_patient_or_404
from app.core.audit import record_audit
from app.core.database import get_db
from app.intelligence.explainability import impact_bars
from app.intelligence.recommendations import recommendations_for
from app.models.models import RiskAssessment, User
from app.services.risk.service import calculate_risk

router = APIRouter(prefix="/patients/{patient_id}", tags=["risk"])


@router.get("/risk")
def get_risk(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = get_patient_or_404(db, patient_id)
    latest = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.patient_id == patient_id)
        .order_by(RiskAssessment.created_at.desc())
        .first()
    )
    if latest is None:
        return calculate_risk(db, patient)
    result = {
        "score": float(latest.score),
        "level": latest.level,
        "factors": latest.factors or [],
        "created_at": latest.created_at,
    }
    result["explanation"] = _explain_from_factors(result)
    return result


@router.post("/risk/recalculate")
def recalculate_risk(
    patient_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = get_patient_or_404(db, patient_id)
    result = calculate_risk(db, patient)
    record_audit(db, current_user.id, "risk.recalculate", "risk_assessment", result["created_at"].isoformat() if hasattr(result["created_at"], "isoformat") else None, request=request)
    return result


def _explain_from_factors(result: dict) -> str:
    from app.intelligence.explainability import deterministic_explanation

    return deterministic_explanation(result)


def _recommendations(patient_id: str, level: str) -> list[str]:
    return recommendations_for(level)


@router.get("/risk/recommendations")
def get_recommendations(
    patient_id: str,
    level: str = "MODERATE",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    latest = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.patient_id == patient_id)
        .order_by(RiskAssessment.created_at.desc())
        .first()
    )
    if latest:
        level = latest.level
    return {"level": level, "recommendations": _recommendations(patient_id, level), "bars": impact_bars(latest.factors or []) if latest else []}