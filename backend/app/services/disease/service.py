from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.models import DiseaseAssessment
from app.core.config import settings


def run_assessment(
    db: Session,
    patient_id: str,
    assessment_type: str,
    biomarker_observations: dict,
    symptom_indicators: list[str] | None,
    health_history: list[str] | None,
    age_group: str | None,
    risk_factors: list[str] | None,
) -> dict:
    """Run a deterministic disease-risk assessment (decision support only)."""
    score, factors = _score(
        biomarker_observations or {},
        symptom_indicators or [],
        health_history or [],
        risk_factors or [],
        age_group,
    )
    level = settings.risk_level(round(score))
    assessment = DiseaseAssessment(
        patient_id=patient_id,
        assessment_type=assessment_type,
        risk_score=round(score, 1),
        risk_level=level,
        factors=factors,
        followup=_followup(level),
        created_at=datetime.utcnow(),
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return {"assessment": assessment, "explanation": _explain(factors, level)}


def list_assessments(db: Session, patient_id: str, limit: int = 20) -> list[DiseaseAssessment]:
    return (
        db.query(DiseaseAssessment)
        .filter(DiseaseAssessment.patient_id == patient_id)
        .order_by(DiseaseAssessment.created_at.desc())
        .limit(limit)
        .all()
    )


def _score(
    biomarkers: dict,
    symptoms: list[str],
    history: list[str],
    risk_factors: list[str],
    age_group: str | None,
) -> tuple[float, list[dict]]:
    factors: list[dict] = []

    marker_risk = 0.0
    for key, value in biomarkers.items():
        v = float(value) if value is not None else 0.0
        markers = {"alpha": 20.0, "beta": 25.0, "gamma": 30.0, "biomarker": 22.0}
        if key.lower() in markers:
            marker_risk = max(marker_risk, min(60.0, v / 100.0 * 60.0))
    factors.append({"name": "Biomarker observations", "impact": "moderate" if marker_risk > 25 else "low", "contribution": round(marker_risk, 1)})

    symptom_risk = min(60.0, len(symptoms) * 12.0)
    factors.append({"name": "Reported symptoms", "impact": "moderate" if symptom_risk > 30 else "low", "contribution": round(symptom_risk, 1)})

    history_risk = min(40.0, len(history) * 8.0)
    factors.append({"name": "Health history", "impact": "low", "contribution": round(history_risk, 1)})

    factor_risk = min(50.0, len(risk_factors) * 10.0)
    factors.append({"name": "Risk factors", "impact": "moderate" if factor_risk > 30 else "low", "contribution": round(factor_risk, 1)})

    age_risk = 0.0
    if age_group:
        age_risk = {"child": 2, "young": 3, "adult": 6, "middle": 10, "senior": 14, "elderly": 16}.get(age_group.lower(), 5)
    factors.append({"name": "Age group", "impact": "low", "contribution": age_risk})

    score = marker_risk * 0.4 + symptom_risk * 0.25 + history_risk * 0.15 + factor_risk * 0.15 + age_risk
    return max(0.0, min(100.0, score)), factors


def _followup(level: str) -> str:
    followers = {
        "LOW": "Continue routine health monitoring and periodic reassessment.",
        "MODERATE": "Consider reviewing indicators with a clinician at the next visit.",
        "ELEVATED": "Schedule a clinician review of this risk assessment.",
        "HIGH": "Seek prompt review by a qualified clinician.",
    }
    return followers.get(level, followers["MODERATE"])


def _explain(factors: list[dict], level: str) -> str:
    active = [f"{f['name']} ({f['impact']} impact)" for f in factors]
    return (
        f"This {level.lower()} risk level is based on: {', '.join(active)}. "
        "This assessment is for informational and decision-support purposes and is not a medical diagnosis."
    )