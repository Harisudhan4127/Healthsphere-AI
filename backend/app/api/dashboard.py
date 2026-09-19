from __future__ import annotations

from datetime import datetime
from statistics import mean

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.integrations.ai_provider import generate_insight
from app.models.models import (
    Alert,
    DiseaseAssessment,
    EmergencyEvent,
    Medication,
    MedicationReading,
    Patient,
    RiskAssessment,
)
from app.models.models import User
from app.schemas.dashboard import AnalyticsOut, DashboardSummaryOut

router = APIRouter(tags=["dashboard"])

DEFAULT_INSIGHT = (
    "The current risk distribution shows the fraction of monitored patients "
    "with LOW, MODERATE, ELEVATED and HIGH overall risk. Reviewing the patients "
    "driving active alerts and elevated risk is the recommended next step."
)


def _risk_levels(db: Session) -> dict[str, int]:
    rows = db.query(RiskAssessment.level, func.count(RiskAssessment.id)).group_by(RiskAssessment.level).all()
    return {level: count for level, count in rows}


@router.get("/dashboard/summary", response_model=DashboardSummaryOut)
def dashboard_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").all()
    active_emergencies = (
        db.query(EmergencyEvent).filter(EmergencyEvent.resolved_at.is_(None)).count()
    )
    medication_alerts = db.query(Alert).filter(Alert.status == "ACTIVE", Alert.type == "MEDICATION").count()
    levels = _risk_levels(db)

    recent_alerts = []
    for alert in db.query(Alert).order_by(Alert.created_at.desc()).limit(6).all():
        patient = db.query(Patient).filter(Patient.id == alert.patient_id).first() if alert.patient_id else None
        recent_alerts.append(
            {
                "id": alert.id,
                "type": alert.type,
                "severity": alert.severity,
                "message": alert.message,
                "status": alert.status,
                "patient_name": patient.name if patient else None,
                "created_at": alert.created_at.isoformat(),
            }
        )

    avg_risk = 0.0
    all_risks = db.query(RiskAssessment).all()
    if all_risks:
        avg_risk = round(mean(r.score for r in all_risks), 1)

    risk_distribution = {"LOW": 0, "MODERATE": 0, "ELEVATED": 0, "HIGH": 0}
    for patient in patients:
        level = _latest_level(db, patient.id, levels)
        risk_distribution[level] = risk_distribution.get(level, 0) + 1

    insight = generate_insight(len(patients), len(active_alerts), risk_distribution) or DEFAULT_INSIGHT

    return DashboardSummaryOut(
        total_patients=len(patients),
        active_alerts=len(active_alerts),
        risk_distribution=risk_distribution,
        average_risk=avg_risk,
        active_emergencies=active_emergencies,
        medication_alerts=medication_alerts,
        recent_alerts=recent_alerts,
        ai_insight=insight,
        generated_at=datetime.utcnow(),
    )


def _latest_level(db: Session, patient_id: str, levels=None) -> str:
    latest = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.patient_id == patient_id)
        .order_by(RiskAssessment.created_at.desc())
        .first()
    )
    return latest.level if latest else "LOW"


@router.get("/analytics", response_model=AnalyticsOut)
def analytics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    risk_trend_rows = (
        db.query(RiskAssessment.created_at, RiskAssessment.score)
        .order_by(RiskAssessment.created_at.asc())
        .limit(200)
        .all()
    )
    risk_trend = [{"date": row[0].isoformat(), "score": float(row[1])} for row in risk_trend_rows]

    alert_rows = db.query(Alert.created_at, Alert.severity).all()
    alert_trend = {}
    for created_at, severity in alert_rows:
        key = created_at.date().isoformat()
        alert_trend.setdefault(key, {"ACTIVE": 0, "RESOLVED": 0, "total": 0})
        alert_trend[key]["total"] += 1
        if severity in ("HIGH", "CRITICAL"):
            alert_trend[key]["ACTIVE"] += 1
        else:
            alert_trend[key]["RESOLVED"] += 1
    alert_trend = [{"date": k, **v} for k, v in sorted(alert_trend.items())]

    meds = db.query(Medication).count()
    med_readings = db.query(MedicationReading).count()
    unsafe_readings = db.query(MedicationReading).filter(MedicationReading.status != "SAFE").count()
    medication_safety = {
        "medications": meds,
        "readings": med_readings,
        "out_of_range": unsafe_readings,
        "safe_percent": round((med_readings - unsafe_readings) / med_readings * 100, 1) if med_readings else 100.0,
    }

    emergencies = []
    for event in db.query(EmergencyEvent).order_by(EmergencyEvent.detected_at.desc()).limit(30).all():
        patient = db.query(Patient).filter(Patient.id == event.patient_id).first()
        emergencies.append(
            {
                "id": event.id,
                "type": event.event_type,
                "severity": event.severity,
                "status": event.current_state,
                "patient_name": patient.name if patient else None,
                "detected_at": event.detected_at.isoformat(),
            }
        )

    gender_counts = (
        db.query(Patient.gender, func.count(Patient.id)).group_by(Patient.gender).all()
    )
    patient_statistics = {
        "total": len(db.query(Patient).all()),
        "gender": dict(gender_counts),
        "medications": meds,
        "assessments": db.query(DiseaseAssessment).count(),
    }

    return AnalyticsOut(
        risk_trend=risk_trend,
        patient_statistics=patient_statistics,
        alert_trend=alert_trend,
        medication_safety=medication_safety,
        emergency_events=emergencies,
    )