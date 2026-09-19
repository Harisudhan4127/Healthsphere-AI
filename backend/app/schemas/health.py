from datetime import datetime

from pydantic import BaseModel, Field


class HealthRecordCreate(BaseModel):
    heart_rate: float | None = Field(default=None, ge=0, le=400)
    spo2: float | None = Field(default=None, ge=0, le=100)
    temperature: float | None = Field(default=None, ge=30, le=45)
    activity: float | None = Field(default=None, ge=0, le=100)
    sleep: float | None = Field(default=None, ge=0, le=24)
    recorded_at: datetime | None = None


class HealthRecordOut(BaseModel):
    id: str
    patient_id: str
    heart_rate: float | None
    spo2: float | None
    temperature: float | None
    activity: float | None
    sleep: float | None
    recorded_at: datetime

    class Config:
        from_attributes = True


class SymptomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    severity: str = "mild"
    notes: str | None = None
    reported_at: datetime | None = None


class SymptomOut(BaseModel):
    id: str
    patient_id: str
    name: str
    severity: str
    notes: str | None = None
    reported_at: datetime

    class Config:
        from_attributes = True


class HealthSummaryOut(BaseModel):
    latest: HealthRecordOut | None
    average: dict
    trend: list[HealthRecordOut]


class FactorOut(BaseModel):
    name: str
    impact: str


class RiskOut(BaseModel):
    patient_id: str
    score: float
    level: str
    factors: list[FactorOut]
    created_at: datetime

    class Config:
        from_attributes = True