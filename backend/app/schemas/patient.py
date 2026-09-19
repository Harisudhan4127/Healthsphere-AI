from datetime import datetime

from pydantic import BaseModel, Field


class PatientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    date_of_birth: str | None = None
    gender: str | None = None
    contact: str | None = None
    status: str = "ACTIVE"


class PatientUpdate(BaseModel):
    name: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    contact: str | None = None
    status: str | None = None


class PatientOut(BaseModel):
    id: str
    name: str
    date_of_birth: str | None = None
    gender: str | None = None
    contact: str | None = None
    status: str
    organization_id: str | None = None
    age: int | None = None
    risk_score: float | None = None
    risk_level: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True