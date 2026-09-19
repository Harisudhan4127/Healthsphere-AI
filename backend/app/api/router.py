from __future__ import annotations

from fastapi import APIRouter

from app.api import auth, alerts, dashboard, disease, emergency, health, medication, patients, risk, settings

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(patients.router)
api_router.include_router(health.router)
api_router.include_router(disease.router)
api_router.include_router(medication.router)
api_router.include_router(emergency.router)
api_router.include_router(risk.router)
api_router.include_router(alerts.router)
api_router.include_router(dashboard.router)
api_router.include_router(settings.router)