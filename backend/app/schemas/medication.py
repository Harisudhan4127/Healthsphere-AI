from datetime import datetime

from pydantic import BaseModel, Field


class StorageRequirement(BaseModel):
    min_temp: float = Field(default=2.0, ge=-50, le=60)
    max_temp: float = Field(default=8.0, ge=-50, le=60)
    max_duration_hours: int = Field(default=720, ge=1, le=100000)
    label: str = "Refrigerated"


class MedicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    storage_requirements: StorageRequirement = StorageRequirement()


class MedicationOut(BaseModel):
    id: str
    patient_id: str
    name: str
    storage_requirements: dict
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MedicationReadingCreate(BaseModel):
    temperature: float | None = Field(default=None, ge=-50, le=60)
    duration: int | None = Field(default=None, ge=0)
    recorded_at: datetime | None = None


class MedicationReadingOut(BaseModel):
    id: str
    medication_id: str
    temperature: float | None
    duration: int | None
    status: str
    recorded_at: datetime

    class Config:
        from_attributes = True


class MedicationStatusOut(BaseModel):
    medication: MedicationOut
    status: str
    condition: str
    last_check: datetime | None
    readings: list[MedicationReadingOut]