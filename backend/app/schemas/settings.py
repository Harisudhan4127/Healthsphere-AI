from pydantic import BaseModel


class ModuleConfigOut(BaseModel):
    health_monitoring: bool
    disease_risk: bool
    medication_safety: bool
    emergency_response: bool
    advanced_analytics: bool


class RiskConfigOut(BaseModel):
    low_max: int
    moderate_max: int
    elevated_max: int


class SettingsOut(BaseModel):
    organization: dict | None
    modules: ModuleConfigOut
    risk_config: RiskConfigOut