"""Seed HealthSphere AI with realistic demonstration data.

Run from the backend directory:

    python -m scripts.seed_demo_data

Creates an organization, admin/clinician/emergency users and a set of
patients covering stable, moderate and elevated risk scenarios, health
records, symptoms, disease assessments, medications (including a storage
warning), emergency events (one active, one resolved), alerts and risk
assessments.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.intelligence.risk_engine import compute_risk
from app.models.models import (
    Alert,
    DiseaseAssessment,
    EmergencyEvent,
    HealthRecord,
    Medication,
    MedicationReading,
    Organization,
    Patient,
    Symptom,
    User,
)

random.seed(42)

DEMO_ORGANIZATION = "Aarogya Community Health"
MODULES = {
    "health_monitoring": True,
    "disease_risk": True,
    "medication_safety": True,
    "emergency_response": True,
    "advanced_analytics": False,
}


def _dt(days_ago: float, hour=9) -> datetime:
    return datetime.utcnow() - timedelta(days=days_ago, hours=12 - hour)


def _health_trend(patient, db, days: int, base: dict, swing: dict, end_shift: dict | None = None):
    end_shift = end_shift or {}
    for i in range(days, -1, -1):
        factor = 1.0
        if i <= 2 and end_shift:
            factor = end_shift.get("factor", 1.2)
        record = HealthRecord(
            patient_id=patient.id,
            heart_rate=round(base["heart_rate"] + random.uniform(-swing["heart_rate"], swing["heart_rate"]) + (end_shift.get("heart_rate", 0) if i <= 2 else 0), 1),
            spo2=round(min(100, base["spo2"] + random.uniform(-swing["spo2"], swing["spo2"]) + (end_shift.get("spo2", 0) if i <= 2 else 0)), 1),
            temperature=round(base["temperature"] + random.uniform(-swing["temperature"], swing["temperature"]) + (end_shift.get("temperature", 0) if i <= 2 else 0), 2),
            activity=round(max(0, base["activity"] + random.uniform(-swing["activity"], swing["activity"]) + (end_shift.get("activity", 0) if i <= 2 else 0)), 1),
            sleep=round(base["sleep"] + random.uniform(-swing["sleep"], swing["sleep"]) + (end_shift.get("sleep", 0) if i <= 2 else 0), 1),
            recorded_at=_dt(days - i),
        )
        db.add(record)
    db.commit()


def _assess(patient, db, kind: str, score: float, factors: list):
    level = settings.risk_level(round(score))
    db.add(
        DiseaseAssessment(
            patient_id=patient.id,
            assessment_type=kind,
            risk_score=round(score, 1),
            risk_level=level,
            factors=factors,
            followup="Schedule a clinician review of this risk assessment."
            if level in ("ELEVATED", "HIGH")
            else "Continue routine monitoring.",
            created_at=_dt(1),
        )
    )
    db.commit()


SCENARIOS = [
    {
        "name": "Arun Kumar",
        "dob": "1985-04-12",
        "gender": "male",
        "contact": "+91 90000 10001",
        "status": "ACTIVE",
        "base": {"heart_rate": 74, "spo2": 98, "temperature": 36.8, "activity": 45, "sleep": 7.5},
        "swing": {"heart_rate": 4, "spo2": 1, "temperature": 0.2, "activity": 8, "sleep": 0.6},
        "symptoms": [],
        "meds": [{"name": "Vitamin D3", "min_temp": 15, "max_temp": 30}],
        "med_readings": [[22.0, 12]],
        "assessment": ("Preventive review", 15, [{"name": "Biomarker observations", "impact": "low"}, {"name": "Health history", "impact": "low"}]),
        "emergency": None,
    },
    {
        "name": "Priya Sharma",
        "dob": "1978-08-23",
        "gender": "female",
        "contact": "+91 90000 10002",
        "status": "ACTIVE",
        "base": {"heart_rate": 88, "spo2": 95, "temperature": 37.1, "activity": 22, "sleep": 6.2},
        "swing": {"heart_rate": 6, "spo2": 1, "temperature": 0.3, "activity": 6, "sleep": 0.7},
        "end_shift": {"heart_rate": 10, "temperature": 0.2, "spo2": -1, "activity": -4, "sleep": -0.6, "factor": 1.0},
        "symptoms": [("Fatigue", "moderate"), ("Occasional headache", "mild")],
        "meds": [{"name": "Metformin", "min_temp": 15, "max_temp": 30}],
        "med_readings": [[19.0, 30]],
        "assessment": ("Cardiometabolic profile", 42, [{"name": "Biomarker observations", "impact": "moderate"}, {"name": "Risk factors", "impact": "moderate"}]),
        "emergency": None,
    },
    {
        "name": "Rajesh Menon",
        "dob": "1965-01-30",
        "gender": "male",
        "contact": "+91 90000 10003",
        "status": "ACTIVE",
        "base": {"heart_rate": 102, "spo2": 93, "temperature": 37.6, "activity": 12, "sleep": 5.4},
        "swing": {"heart_rate": 6, "spo2": 1, "temperature": 0.2, "activity": 4, "sleep": 0.5},
        "end_shift": {"heart_rate": 14, "temperature": 0.4, "spo2": -2, "activity": -3, "sleep": -0.4, "factor": 1.0},
        "symptoms": [("Shortness of breath", "high"), ("Fever", "moderate"), ("Chest discomfort", "moderate")],
        "meds": [
            {"name": "Insulin (refrigerated)", "min_temp": 2, "max_temp": 8},
            {"name": "Losartan", "min_temp": 15, "max_temp": 30},
        ],
        "med_readings": [[7.0, 100], [16.5, 140]],
        "assessment": ("Cardiovascular risk profile", 68, [{"name": "Biomarker observations", "impact": "high"}, {"name": "Reported symptoms", "impact": "high"}]),
        "emergency": {"type": "COLLISION", "severity": "HIGH", "status": "ALERTED"},
    },
    {
        "name": "Meena Iyer",
        "dob": "1990-11-05",
        "gender": "female",
        "contact": "+91 90000 10004",
        "status": "ACTIVE",
        "base": {"heart_rate": 72, "spo2": 99, "temperature": 36.6, "activity": 52, "sleep": 7.8},
        "swing": {"heart_rate": 4, "spo2": 1, "temperature": 0.2, "activity": 9, "sleep": 0.5},
        "symptoms": [],
        "meds": [{"name": "Iron supplement", "min_temp": 15, "max_temp": 30}],
        "med_readings": [[21.0, 20]],
        "assessment": ("Preventive review", 8, [{"name": "Biomarker observations", "impact": "low"}]),
        "emergency": None,
    },
    {
        "name": "Suresh Reddy",
        "dob": "2001-07-19",
        "gender": "male",
        "contact": "+91 90000 10005",
        "status": "ACTIVE",
        "base": {"heart_rate": 80, "spo2": 97, "temperature": 36.9, "activity": 38, "sleep": 6.9},
        "swing": {"heart_rate": 5, "spo2": 1, "temperature": 0.2, "activity": 7, "sleep": 0.6},
        "symptoms": [("Mild fever", "mild")],
        "meds": [],
        "med_readings": [],
        "assessment": ("Preventive review", 22, [{"name": "Reported symptoms", "impact": "low"}]),
        "emergency": {"type": "MOTOR_ACCIDENT", "severity": "MODERATE", "status": "RESOLVED"},
    },
    {
        "name": "Kavitha Nair",
        "dob": "1958-03-14",
        "gender": "female",
        "contact": "+91 90000 10006",
        "status": "ACTIVE",
        "base": {"heart_rate": 96, "spo2": 94, "temperature": 37.3, "activity": 16, "sleep": 6.0},
        "swing": {"heart_rate": 5, "spo2": 1, "temperature": 0.2, "activity": 5, "sleep": 0.5},
        "end_shift": {"heart_rate": 12, "temperature": 0.3, "spo2": -1, "activity": -2, "sleep": -0.5, "factor": 1.0},
        "symptoms": [("Joint pain", "moderate"), ("Fatigue", "moderate")],
        "meds": [{"name": "Insulin (refrigerated)", "min_temp": 2, "max_temp": 8}],
        "med_readings": [[24.0, 30]],
        "assessment": ("Metabolic risk profile", 71, [{"name": "Biomarker observations", "impact": "high"}, {"name": "Age group", "impact": "moderate"}]),
        "emergency": None,
    },
]


def run() -> None:
    db = SessionLocal()
    try:
        if db.query(Organization).first() is not None:
            print("Database already seeded. Skipping.")
            return

        org = Organization(name=DEMO_ORGANIZATION, type="clinic", settings={"modules": MODULES})
        db.add(org)
        db.flush()

        admin = User(
            name="Dr. Ananya Rao",
            email=settings.seed_admin_email,
            password_hash=hash_password(settings.seed_admin_password),
            role="ADMIN",
            organization_id=org.id,
        )
        clinician = User(
            name="Dr. Vikram Iyer",
            email="clinician@healthsphere.ai",
            password_hash=hash_password("clinician123"),
            role="CLINICIAN",
            organization_id=org.id,
        )
        operator = User(
            name="Operations Desk",
            email="emergency@healthsphere.ai",
            password_hash=hash_password("emergency123"),
            role="EMERGENCY_OPERATOR",
            organization_id=org.id,
        )
        db.add_all([admin, clinician, operator])
        db.commit()

        for scenario in SCENARIOS:
            patient = Patient(
                name=scenario["name"],
                date_of_birth=scenario["dob"],
                gender=scenario["gender"],
                contact=scenario["contact"],
                status=scenario["status"],
                organization_id=org.id,
            )
            db.add(patient)
            db.flush()

            _health_trend(patient, db, 14, scenario["base"], scenario["swing"], scenario.get("end_shift"))

            for symptom_name, severity in scenario["symptoms"]:
                db.add(
                    Symptom(
                        patient_id=patient.id,
                        name=symptom_name,
                        severity=severity,
                        notes="Reported during routine review.",
                        reported_at=_dt(1),
                    )
                )
            db.commit()

            kind, score, factors = scenario["assessment"]
            _assess(patient, db, kind, score, factors)

            med_warning: str | None = None
            for med_spec in scenario["meds"]:
                med = Medication(
                    patient_id=patient.id,
                    name=med_spec["name"],
                    storage_requirements={
                        "min_temp": med_spec["min_temp"],
                        "max_temp": med_spec["max_temp"],
                        "max_duration_hours": 720,
                        "label": "Refrigerated" if med_spec["name"].startswith("Insulin") else "Room temperature",
                    },
                    status="SAFE",
                )
                db.add(med)
                db.flush()
                for temp, duration in scenario["med_readings"]:
                    reading_status = "SAFE"
                    if temp > med_spec["max_temp"]:
                        reading_status = "HIGH"
                    elif temp < med_spec["min_temp"]:
                        reading_status = "WARNING"
                    db.add(
                        MedicationReading(
                            medication_id=med.id,
                            temperature=temp,
                            duration=duration,
                            status=reading_status,
                            recorded_at=_dt(1),
                        )
                    )
                    med.status = reading_status
                    if reading_status != "SAFE" and med_spec["name"].startswith("Insulin"):
                        med_warning = med.name
                db.commit()

            if scenario["emergency"]:
                event = EmergencyEvent(
                    patient_id=patient.id,
                    event_type=scenario["emergency"]["type"],
                    severity=scenario["emergency"]["severity"],
                    latitude=12.9716 + random.uniform(-0.02, 0.02),
                    longitude=77.5946 + random.uniform(-0.02, 0.02),
                    detected_at=_dt(0, hour=10),
                )
                if scenario["emergency"]["status"] == "RESOLVED":
                    event.verified_at = _dt(0.01)
                    event.alerted_at = _dt(0.01)
                    event.responding_at = _dt(0.01)
                    event.resolved_at = _dt(0.02)
                    event.status = "RESOLVED"
                else:
                    event.verified_at = _dt(0.01)
                    event.alerted_at = _dt(0.01)
                    event.status = scenario["emergency"]["status"]
                db.add(event)
                db.commit()

            if scenario["emergency"] and scenario["emergency"]["status"] != "RESOLVED":
                db.add(
                    Alert(
                        patient_id=patient.id,
                        type="EMERGENCY",
                        severity=scenario["emergency"]["severity"],
                        message=f"{scenario['emergency']['type']} emergency event detected ({scenario['emergency']['severity']})",
                        status="ACTIVE",
                        created_at=_dt(0.01),
                    )
                )
            if med_warning and any(m["name"] == med_warning for m in scenario["meds"]):
                db.add(
                    Alert(
                        patient_id=patient.id,
                        type="MEDICATION",
                        severity="HIGH",
                        message=f"{med_warning}: temperature above storage range",
                        status="ACTIVE",
                        created_at=_dt(0.5),
                    )
                )
            db.commit()

            compute_risk(db, patient)
            print(f"  seeded patient: {patient.name}")

        print(f"Seeding complete. {len(SCENARIOS)} patients.")
        print(f"Admin login: {settings.seed_admin_email} / {settings.seed_admin_password}")
    finally:
        db.close()


if __name__ == "__main__":
    run()