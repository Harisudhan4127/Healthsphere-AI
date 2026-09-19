from datetime import datetime

from pydantic import BaseModel


class AlertOut(BaseModel):
    id: str
    patient_id: str | None
    patient_name: str | None = None
    type: str
    severity: str
    message: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AlertStatusUpdate(BaseModel):
    status: str = "RESOLVED"