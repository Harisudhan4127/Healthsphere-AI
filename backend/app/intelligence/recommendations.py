"""Deterministic follow-up recommendations based on the risk result.

Recommendations are conservative decision-support suggestions and never
override professional medical advice.
"""

from __future__ import annotations

RECOMMENDATIONS: dict[str, list[str]] = {
    "LOW": [
        "Continue routine health monitoring and log periodic health readings.",
        "Maintain regular sleep, activity and hydration patterns.",
        "Follow up at your next scheduled health review.",
    ],
    "MODERATE": [
        "Increase monitoring frequency and review recent health trends.",
        "Consider sharing the latest health assessment with a clinician.",
        "Watch for changes in reported symptoms over the coming days.",
    ],
    "ELEVATED": [
        "Schedule a clinician review of the current risk assessment.",
        "Prioritise close monitoring of the contributing health indicators.",
        "Revaluate any medication storage or administration conditions.",
    ],
    "HIGH": [
        "Seek prompt review by a qualified clinician.",
        "Ensure emergency contacts are aware of the current health state.",
        "Follow clinician guidance regarding immediate next steps.",
    ],
}


def recommendations_for(level: str) -> list[str]:
    return RECOMMENDATIONS.get(level.upper(), RECOMMENDATIONS["MODERATE"])


def recommended_followup(level: str) -> str:
    return " ".join(recommendations_for(level))