"""Human-readable explanation of a risk-engine result.

Generates a deterministic narrative that explains WHY a risk level was
reached. Used as the fallback when the AI provider is unavailable, and as
the structural frame for AI-generated explanations.
"""

from __future__ import annotations


def impact_bars(factors: list[dict], max_bars: int = 10) -> list[dict]:
    """Convert factor contributions to a bar representation (0..max)."""
    raw = sum(f.get("contribution", 0) for f in factors) or 1.0
    bars = []
    for f in factors:
        share = f.get("contribution", 0) / raw
        bars.append(
            {
                "name": f.get("name", "Factor"),
                "impact": f.get("impact", "low"),
                "bars": round(share * max_bars),
                "detail": f.get("detail", ""),
            }
        )
    return bars


def factor_summary(factors: list[dict]) -> str:
    active = [f for f in factors if f.get("contribution", 0) > 0]
    if not active:
        return "No significant contributing factors were detected."
    parts = [f"{f['name']}: {f['impact']} impact ({f['contribution']:.1f}/100)" for f in active]
    return "; ".join(parts)


def deterministic_explanation(risk: dict, patient_name: str | None = None) -> str:
    score = risk["score"]
    level = risk["level"]
    factors = risk["factors"]
    subject = patient_name or "The patient"

    if level == "LOW":
        opening = f"{subject}'s overall health risk is currently LOW with a score of {score}/100."
    elif level == "MODERATE":
        opening = f"{subject} presents a MODERATE overall health risk with a score of {score}/100."
    elif level == "ELEVATED":
        opening = f"{subject} shows an ELEVATED overall health risk with a score of {score}/100."
    else:
        opening = f"{subject} currently faces a HIGH overall health risk with a score of {score}/100."

    return f"{opening} {factor_summary(factors)} This assessment is for decision-support purposes and is not a medical diagnosis."