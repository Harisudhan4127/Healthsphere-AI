from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.models import Alert, Medication, MedicationReading


def create_medication(db: Session, patient_id: str, name: str, storage_requirements: dict) -> Medication:
    med = Medication(
        patient_id=patient_id,
        name=name,
        storage_requirements=storage_requirements,
        status="SAFE",
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


def list_medications(db: Session, patient_id: str) -> list[Medication]:
    return db.query(Medication).filter(Medication.patient_id == patient_id).all()


def add_reading(db: Session, medication_id: str, temperature: float | None, duration: int | None) -> dict:
    med = db.query(Medication).filter(Medication.id == medication_id).first()
    if med is None:
        raise ValueError("medication not found")
    requirements = med.storage_requirements or {}
    temp_low = requirements.get("min_temp")
    temp_high = requirements.get("max_temp")
    max_duration = requirements.get("max_duration_hours")

    issues: list[str] = []
    status = "SAFE"
    if temperature is not None:
        if temp_low is not None and temperature < temp_low:
            status = "WARNING"
            issues.append(f"temperature below storage range ({temp_low} C)")
        elif temp_high is not None and temperature > temp_high:
            status = "HIGH"
            issues.append(f"temperature above storage range ({temp_high} C)")
    if max_duration and duration is not None and duration > max_duration:
        status = "HIGH" if status == "SAFE" else status
        if status == "SAFE":
            status = "WARNING"
        issues.append(f"storage duration exceeds configured limit ({max_duration} h)")

    reading = MedicationReading(
        medication_id=medication_id,
        temperature=temperature,
        duration=duration,
        status=status if status else "SAFE",
        recorded_at=datetime.utcnow(),
    )
    db.add(reading)
    med.status = reading.status
    db.commit()
    db.refresh(reading)

    alert = None
    if status != "SAFE":
        alert = Alert(
            patient_id=med.patient_id,
            type="MEDICATION",
            severity="HIGH" if status == "HIGH" else "MODERATE",
            message=f"{med.name}: storage condition issue ({', '.join(issues) or 'outside range'})",
            status="ACTIVE",
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

    return {"reading": reading, "alert": alert, "status": status}


def status(db: Session, medication_id: str) -> dict:
    med = db.query(Medication).filter(Medication.id == medication_id).first()
    if med is None:
        raise ValueError("medication not found")
    readings = (
        db.query(MedicationReading)
        .filter(MedicationReading.medication_id == medication_id)
        .order_by(MedicationReading.recorded_at.desc())
        .limit(20)
        .all()
    )
    last = readings[0] if readings else None
    condition = "Within configured range"
    if last and last.status != "SAFE":
        condition = "Outside configured range — review required"
    elif readings and last:
        condition = "Within configured range"
    meds = {
        "medication": med,
        "status": last.status if last else med.status,
        "condition": condition,
        "last_check": last.recorded_at if last else None,
        "readings": readings,
    }
    return meds