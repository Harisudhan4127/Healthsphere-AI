"""AI provider integration.

The AI provider generates human-readable explanations of deterministic
risk results. It never computes or modifies risk. When the provider is
unavailable or not configured, callers fall back to template explanations.
"""

from __future__ import annotations

import json

import httpx

from app.core.config import settings


def _build_prompt(risk: dict, patient_name: str | None, context: dict | None = None) -> str:
    factors = risk.get("factors", [])
    factor_text = json.dumps(factors)
    context_text = json.dumps(context or {})
    return (
        "You are a clinical communication assistant inside HealthSphere AI, a "
        "decision-support platform. A deterministic risk engine has already computed "
        "a patient's risk score. Your task is ONLY to convert the provided factors "
        "into a clear, human-readable, non-alarming explanation. Do not produce a "
        "diagnosis, do not prescribe treatment, do not invent data.\n\n"
        f"Patient: {patient_name or 'Unnamed'}\n"
        f"Overall risk score: {risk.get('score')}/100\n"
        f"Risk level: {risk.get('level')}\n"
        "Contributing factors (JSON): "
        f"{factor_text}\n\nAdditional context (JSON): {context_text}\n\n"
        "Return a short summary (2-3 sentences) that explains why this risk level "
        "was reached and suggests a conservative follow-up. Begin with 'The current "
        "risk assessment indicates'."
    )


def generate_ai_explanation(
    risk: dict, patient_name: str | None = None, context: dict | None = None
) -> str | None:
    """Call the configured AI provider. Returns None when unavailable."""
    if not settings.ai_api_key:
        return None
    url = settings.ai_api_url
    if not url:
        return None

    payload = {
        "model": settings.ai_model,
        "messages": [
            {
                "role": "system",
                "content": "You produce clear, conservative, non-diagnostic health decision-support explanations.",
            },
            {"role": "user", "content": _build_prompt(risk, patient_name, context)},
        ],
        "temperature": 0.3,
        "max_tokens": 300,
    }
    headers = {
        "Authorization": f"Bearer {settings.ai_api_key}",
        "Content-Type": "application/json",
    }
    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=20.0)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


def generate_insight(patient_count: int, active_alerts: int, risk_levels: dict) -> str | None:
    """Optional AI insight for the dashboard summary."""
    if not settings.ai_api_key:
        return None
    url = settings.ai_api_url
    if not url:
        return None
    payload = {
        "model": settings.ai_model,
        "messages": [
            {
                "role": "system",
                "content": "You write a single concise healthcare operations insight (1-2 sentences). No diagnosis.",
            },
            {
                "role": "user",
                "content": (
                    f"Patient count: {patient_count}. Active alerts: {active_alerts}. "
                    f"Risk distribution: {json.dumps(risk_levels)}. Provide one operational "
                    "insight for a clinic monitoring these patients."
                ),
            },
        ],
        "temperature": 0.3,
        "max_tokens": 120,
    }
    headers = {
        "Authorization": f"Bearer {settings.ai_api_key}",
        "Content-Type": "application/json",
    }
    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=20.0)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None