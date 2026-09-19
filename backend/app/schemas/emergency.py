from datetime import datetime

from pydantic import BaseModel, Field


class EmergencyEventCreate(BaseModel):
    patient_id: str
    event_type: str = "MEDICAL"
    severity: str = "MODERATE"
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    status: str = "DETECTED"


class EmergencyEventUpdate(BaseModel):
    status: str


class EmergencyTimelineEntry(BaseModel):
    time: datetime
    label: str


class EmergencyEventOut(BaseModel):
    id: str
    patient_id: str
    patient_name: str | None = None
    event_type: str
    severity: str
    latitude: float | None
    longitude: float | None
    status: str
    detected_at: datetime
    verified_at: datetime | None
    alerted_at: datetime | None
    responding_at: datetime | None
    resolved_at: datetime | None
    timeline: list[EmergencyTimelineEntry] = []

    class Config:
        from_attributes = True