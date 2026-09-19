from datetime import datetime

from pydantic import BaseModel


class DashboardSummaryOut(BaseModel):
    total_patients: int
    active_alerts: int
    risk_distribution: dict[str, int]
    average_risk: float
    active_emergencies: int
    medication_alerts: int
    recent_alerts: list
    ai_insight: str
    generated_at: datetime


class AnalyticsOut(BaseModel):
    risk_trend: list
    patient_statistics: dict
    alert_trend: list
    medication_safety: dict
    emergency_events: list