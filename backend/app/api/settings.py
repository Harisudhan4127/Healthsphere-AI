from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import default_modules, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.models import User
from app.schemas.settings import ModuleConfigOut, RiskConfigOut, SettingsOut

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsOut)
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    organization = None
    if current_user.organization_id:
        from app.models.models import Organization

        org_obj = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
        if org_obj:
            organization = {"id": org_obj.id, "name": org_obj.name, "type": org_obj.type, "settings": org_obj.settings}

    org_modules = organization["settings"].get("modules") if organization and organization["settings"] else None
    modules = ModuleConfigOut(**(org_modules or default_modules()))
    risk_config = RiskConfigOut(low_max=settings.risk_low_max, moderate_max=settings.risk_moderate_max, elevated_max=settings.risk_elevated_max)
    return SettingsOut(organization=organization, modules=modules, risk_config=risk_config)