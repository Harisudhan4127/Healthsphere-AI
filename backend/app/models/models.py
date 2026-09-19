import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_now, onupdate=_now, nullable=False
    )


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False, default="clinic")
    settings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    users = relationship("User", back_populates="organization")
    patients = relationship("Patient", back_populates="organization")


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(50), nullable=False, default="USER", index=True
    )
    organization_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("organizations.id"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    organization = relationship("Organization", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")


class Patient(Base, TimestampMixin):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    organization_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("organizations.id"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    date_of_birth: Mapped[str | None] = mapped_column(String(10), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)

    organization = relationship("Organization", back_populates="patients")
    health_records = relationship("HealthRecord", back_populates="patient")
    symptoms = relationship("Symptom", back_populates="patient")
    disease_assessments = relationship("DiseaseAssessment", back_populates="patient")
    medications = relationship("Medication", back_populates="patient")
    emergency_events = relationship("EmergencyEvent", back_populates="patient")
    alerts = relationship("Alert", back_populates="patient")
    risk_assessments = relationship("RiskAssessment", back_populates="patient")

    @property
    def age(self) -> int | None:
        if not self.date_of_birth:
            return None
        try:
            dob = datetime.strptime(self.date_of_birth, "%Y-%m-%d")
            now = datetime.utcnow()
            return now.year - dob.year - ((now.month, now.day) < (dob.month, dob.day))
        except ValueError:
            return None


class HealthRecord(Base):
    __tablename__ = "health_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id"), nullable=False, index=True
    )
    heart_rate: Mapped[float] = mapped_column(Float, nullable=True)
    spo2: Mapped[float] = mapped_column(Float, nullable=True)
    temperature: Mapped[float] = mapped_column(Float, nullable=True)
    activity: Mapped[float] = mapped_column(Float, nullable=True)
    sleep: Mapped[float] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False, index=True)

    patient = relationship("Patient", back_populates="health_records")


class Symptom(Base):
    __tablename__ = "symptoms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="mild", nullable=False)
    reported_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    patient = relationship("Patient", back_populates="symptoms")


class DiseaseAssessment(Base):
    __tablename__ = "disease_assessments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id"), nullable=False, index=True
    )
    assessment_type: Mapped[str] = mapped_column(String(100), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), default="LOW", nullable=False)
    factors: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    followup: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False, index=True)

    patient = relationship("Patient", back_populates="disease_assessments")


class Medication(Base, TimestampMixin):
    __tablename__ = "medications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_requirements: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="SAFE", nullable=False)

    patient = relationship("Patient", back_populates="medications")
    readings = relationship("MedicationReading", back_populates="medication")


class MedicationReading(Base):
    __tablename__ = "medication_readings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    medication_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("medications.id"), nullable=False, index=True
    )
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration: Mapped[float | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="SAFE", nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False, index=True)

    medication = relationship("Medication", back_populates="readings")


class EmergencyEvent(Base):
    __tablename__ = "emergency_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(100), default="UNKNOWN", nullable=False)
    severity: Mapped[str] = mapped_column(String(50), default="MODERATE", nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="DETECTED", nullable=False, index=True
    )
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    alerted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    responding_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="emergency_events")

    @property
    def current_state(self) -> str:
        if self.resolved_at:
            return "RESOLVED"
        if self.responding_at:
            return "RESPONDING"
        if self.alerted_at:
            return "ALERTED"
        if self.verified_at:
            return "VERIFYING"
        return "DETECTED"

    @property
    def timeline(self) -> list[dict]:
        entries = [
            {"time": self.detected_at, "label": "Event detected"},
            {"time": self.verified_at, "label": "Event verified"},
            {"time": self.alerted_at, "label": "Emergency alert created"},
            {"time": self.responding_at, "label": "Response initiated"},
            {"time": self.resolved_at, "label": "Event resolved"},
        ]
        return [e for e in entries if e["time"] is not None]


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id"), nullable=True, index=True
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), default="MODERATE", nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False, index=True)

    patient = relationship("Patient", back_populates="alerts")


class RiskAssessment(Base, TimestampMixin):
    __tablename__ = "risk_assessments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id"), nullable=False, index=True
    )
    score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    level: Mapped[str] = mapped_column(String(20), default="LOW", nullable=False)
    factors: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=_now, nullable=False, index=True
    )

    patient = relationship("Patient", back_populates="risk_assessments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    resource: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    data: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)

    user = relationship("User", back_populates="audit_logs")