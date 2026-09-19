from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.models import HealthRecord, Symptom


def add_record(db: Session, patient_id: str, payload: dict) -> HealthRecord:
    record = HealthRecord(
        patient_id=patient_id,
        heart_rate=payload.get("heart_rate"),
        spo2=payload.get("spo2"),
        temperature=payload.get("temperature"),
        activity=payload.get("activity"),
        sleep=payload.get("sleep"),
        recorded_at=payload.get("recorded_at") or datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_records(db: Session, patient_id: str, limit: int = 50) -> list[HealthRecord]:
    return (
        db.query(HealthRecord)
        .filter(HealthRecord.patient_id == patient_id)
        .order_by(HealthRecord.recorded_at.desc())
        .limit(limit)
        .all()
    )


def trends(db: Session, patient_id: str, days: int = 14) -> list[HealthRecord]:
    cutoff = datetime.utcnow() - timedelta(days=days)
    return (
        db.query(HealthRecord)
        .filter(HealthRecord.patient_id == patient_id, HealthRecord.recorded_at >= cutoff)
        .order_by(HealthRecord.recorded_at.asc())
        .all()
    )


def summary(db: Session, patient_id: str) -> dict:
    records = list_records(db, patient_id, limit=50)
    if not records:
        return {"latest": None, "average": {}, "count": 0}
    latest = records[0]
    fields = ("heart_rate", "spo2", "temperature", "activity", "sleep")
    avg = {
        field: round(sum(r.__dict__.get(field) for r in records if r.__dict__.get(field) is not None) / count, 1)
        for field in fields
        if (count := sum(1 for r in records if r.__dict__.get(field) is not None))
    }
    return {"latest": latest, "average": avg, "count": len(records)}


def add_symptom(db: Session, patient_id: str, payload: dict) -> Symptom:
    symptom = Symptom(
        patient_id=patient_id,
        name=payload["name"],
        severity=payload.get("severity", "mild"),
        notes=payload.get("notes"),
        reported_at=payload.get("reported_at") or datetime.utcnow(),
    )
    db.add(symptom)
    db.commit()
    db.refresh(symptom)
    return symptom


def list_symptoms(db: Session, patient_id: str, limit: int = 20) -> list[Symptom]:
    return (
        db.query(Symptom)
        .filter(Symptom.patient_id == patient_id)
        .order_by(Symptom.reported_at.desc())
        .limit(limit)
        .all()
    )