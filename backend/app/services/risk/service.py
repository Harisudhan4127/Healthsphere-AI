from __future__ import annotations

from sqlalchemy.orm import Session

from app.integrations.ai_provider import generate_ai_explanation
from app.intelligence.explainability import deterministic_explanation, impact_bars
from app.intelligence.recommendations import recommendations_for
from app.intelligence.risk_engine import compute_risk, latest_risk


def calculate_risk(db: Session, patient, with_explanation: bool = True) -> dict:
    result = compute_risk(db, patient)
    explanation = None
    if with_explanation:
        context = {
            "age": patient.age,
            "gender": patient.gender,
            "status": patient.status,
        }
        explanation = generate_ai_explanation(result, patient.name, context)
    if explanation is None:
        explanation = deterministic_explanation(result, patient.name)
    return {
        "score": result["score"],
        "level": result["level"],
        "factors": result["factors"],
        "explanation": explanation,
        "recommendations": recommendations_for(result["level"]),
        "bars": impact_bars(result["factors"]),
        "created_at": result["assessment"].created_at,
    }


def get_latest(db: Session, patient_id: str):
    return latest_risk(db, patient_id)