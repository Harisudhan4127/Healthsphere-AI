"""Deterministic, transparent risk scoring engine.

The risk engine owns all risk calculation. It combines weighted health,
symptom, disease, medication, emergency and trend factors into a single
normalized 0-100 score. The AI layer only explains the result produced here
and never determines risk itself. Threshold bands are software demonstration
categories, not clinical diagnostic thresholds.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from statistics import mean

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import (
    EmergencyEvent,
    HealthRecord,
    Medication,
    MedicationReading,
    RiskAssessment,
    Symptom,
)

SEVERITY_WEIGHT = {"low": 1, "mild": 1, "moderate": 2, "high": 3, "critical": 4}
EMERGENCY_WEIGHT = {"LOW": 30, "MODERATE": 50, "HIGH": 75, "CRITICAL": 90}

METRIC_BANDS = {
    "heart_rate": {"ideal_min": 60, "ideal_max": 100, "spread": 60},
    "spo2": {"ideal_min": 95, "ideal_max": 100, "spread": 10},
    "temperature": {"ideal_min": 36.1, "ideal_max": 37.2, "spread": 1.6},
    "activity": {"ideal_min": 20, "ideal_max": 100, "spread": 60},
    "sleep": {"ideal_min": 7, "ideal_max": 9, "spread": 5},
}

WEIGHTS = {
    "health": 0.30,
    "symptom": 0.20,
    "disease": 0.20,
    "medication": 0.10,
    "emergency": 0.10,
    "trend": 0.10,
}


def metric_risk(name: str, value: float) -> float:
    """Score one metric 0-100 where 0 = ideal and 100 = severe deviation."""
    band = METRIC_BANDS.get(name)
    if band is None or value is None:
        return 0.0
    if band["ideal_min"] <= value <= band["ideal_max"]:
        return 0.0
    distance = (band["ideal_min"] - value) / band["spread"] if value < band["ideal_min"] else (value - band["ideal_max"]) / band["spread"]
    return max(0.0, min(100.0, distance * 100.0))


def _health_factor(records: list[HealthRecord]) -> tuple[float, list[dict]]:
    if not records:
        return 0.0, [{"name": "Health metrics", "contribution": 0.0, "detail": "No recent health records"}]
    latest = records[-1]
    scores: list[float] = []
    details: list[dict] = []
    for key, label in (("heart_rate", "Heart rate"), ("spo2", "Oxygen saturation"), ("temperature", "Temperature"), ("activity", "Activity"), ("sleep", "Sleep")):
        value = getattr(latest, key)
        score = metric_risk(key, value)
        if value is not None:
            scores.append(score)
            direction = "elevated" if (value > METRIC_BANDS[key]["ideal_max"] and score > 0) else "reduced"
            details.append({"name": label, "contribution": round(score, 1), "detail": f"{direction} ({value})"})
    return (mean(scores) if scores else 0.0), details


def _symptom_factor(symptoms: list[Symptom]) -> tuple[float, list[dict]]:
    cutoff = datetime.utcnow() - timedelta(days=7)
    recent = [s for s in symptoms if s.reported_at and s.reported_at >= cutoff]
    if not recent:
        return 0.0, [{"name": "Reported symptoms", "contribution": 0.0, "detail": "No symptoms in last 7 days"}]
    weight = sum(SEVERITY_WEIGHT.get(s.severity.lower(), 1) for s in recent)
    count = len(recent)
    score = min(100.0, weight * 12.0)
    detail = f"{count} symptom(s) in the last 7 days"
    return score, [{"name": "Reported symptoms", "contribution": round(score, 1), "detail": detail}]


def _disease_factor_query(db: Session, patient_id: str) -> tuple[float, list[dict]]:
    from app.models.models import DiseaseAssessment

    latest = (
        db.query(DiseaseAssessment)
        .filter(DiseaseAssessment.patient_id == patient_id)
        .order_by(DiseaseAssessment.created_at.desc())
        .first()
    )
    if latest is None:
        return 0.0, [{"name": "Disease risk indicators", "contribution": 0.0, "detail": "No assessment on record"}]
    score = float(latest.risk_score)
    return score, [{"name": "Disease risk indicators", "contribution": round(score, 1), "detail": latest.assessment_type}]


def _medication_factor(db: Session, patient_id: str) -> tuple[float, list[dict]]:
    meds = db.query(Medication).filter(Medication.patient_id == patient_id).all()
    if not meds:
        return 0.0, [{"name": "Medication status", "contribution": 0.0, "detail": "No medications tracked"}]
    worst = 0.0
    details: list[dict] = []
    for med in meds:
        last = (
            db.query(MedicationReading)
            .filter(MedicationReading.medication_id == med.id)
            .order_by(MedicationReading.recorded_at.desc())
            .first()
        )
        status = last.status if last else med.status
        score = {"SAFE": 0, "WARNING": 45, "HIGH": 80}[status.upper()]
        worst = max(worst, score)
        details.append({"name": med.name, "contribution": score, "detail": status})
    return worst, details


def _emergency_factor(db: Session, patient_id: str) -> tuple[float, list[dict]]:
    active = (
        db.query(EmergencyEvent)
        .filter(
            EmergencyEvent.patient_id == patient_id,
            EmergencyEvent.resolved_at.is_(None),
        )
        .order_by(EmergencyEvent.detected_at.desc())
        .first()
    )
    if active is None:
        return 0.0, [{"name": "Emergency status", "contribution": 0.0, "detail": "No active emergency"}]
    score = EMERGENCY_WEIGHT.get(active.severity.upper(), 50)
    return float(score), [{"name": "Emergency status", "contribution": score, "detail": f"{active.severity} event in progress"}]


def _trend_factor(records: list[HealthRecord]) -> tuple[float, list[dict]]:
    if len(records) < 2:
        return 0.0, [{"name": "Health trend", "contribution": 0.0, "detail": "Insufficient history"}]
    recent = records[-1]
    older = records[0]
    delta = 0.0
    for key in ("heart_rate", "temperature"):
        a, b = getattr(older, key), getattr(recent, key)
        if a is not None and b is not None:
            band = METRIC_BANDS[key]
            if key == "heart_rate":
                delta += (b - a) / band["spread"]
            else:
                delta += (b - a) / 1.0
    direction = delta * 40.0
    score = max(-30.0, min(60.0, direction))
    detail = "metrics trending upward" if score != 0 else "metrics stable"
    return max(0.0, score), [{"name": "Health trend", "contribution": round(max(0.0, score), 1), "detail": detail}]


def compute_risk(db: Session, patient) -> dict:
    """Compute the overall risk assessment for a patient and persist it."""
    records = (
        db.query(HealthRecord)
        .filter(HealthRecord.patient_id == patient.id)
        .order_by(HealthRecord.recorded_at.asc())
        .all()
    )
    symptoms = db.query(Symptom).filter(Symptom.patient_id == patient.id).all()

    factor_fn = [
        ("health", _health_factor(records)),
        ("symptom", _symptom_factor(symptoms)),
        ("disease", _disease_factor_query(db, patient.id)),
        ("medication", _medication_factor(db, patient.id)),
        ("emergency", _emergency_factor(db, patient.id)),
        ("trend", _trend_factor(records)),
    ]

    total = 0.0
    factor_out: list[dict] = []
    for name, (score, details) in factor_fn:
        contribution = WEIGHTS[name] * score
        total += contribution
        impact = _impact_level(contribution)
        factor_out.append(
            {"name": name.replace("_", " ").title(), "impact": impact, "contribution": round(contribution, 1), "weight": WEIGHTS[name], "details": details}
        )

    total = max(0.0, min(100.0, total))
    level = settings.risk_level(round(total))

    assessment = RiskAssessment(
        patient_id=patient.id,
        score=round(total, 1),
        level=level,
        factors=factor_out,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return {"assessment": assessment, "factors": factor_out, "score": round(total, 1), "level": level}


def _impact_level(contribution: float) -> str:
    if contribution < 5:
        return "low"
    if contribution < 15:
        return "moderate"
    return "high"


def latest_risk(db: Session, patient_id: str):
    return (
        db.query(RiskAssessment)
        .filter(RiskAssessment.patient_id == patient_id)
        .order_by(RiskAssessment.created_at.desc())
        .first()
    )