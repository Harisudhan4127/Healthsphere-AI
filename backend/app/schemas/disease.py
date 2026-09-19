from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DiseaseAssessmentCreate(BaseModel):
    assessment_type: str = Field(min_length=1, max_length=100)
    biomarker_observations: dict[str, Any] = Field(default_factory=dict)
    symptom_indicators: list[str] = Field(default_factory=list)
    health_history: list[str] = Field(default_factory=list)
    age_group: str | None = None
    risk_factors: list[str] = Field(default_factory=list)


class DiseaseAssessmentOut(BaseModel):
    id: str
    patient_id: str
    assessment_type: str
    risk_score: float
    risk_level: str
    factors: Any = None
    followup: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class DiseaseAssessmentRunOut(BaseModel):
    assessment: DiseaseAssessmentOut
    explanation: str
    disclaimer: str = (
        "This assessment is intended for informational and decision-support purposes "
        "and is not a medical diagnosis."
    )