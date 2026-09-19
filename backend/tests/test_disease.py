def test_disease_assessment(client, auth_headers, patient_id):
    res = client.post(
        f"/api/v1/patients/{patient_id}/disease-assessment",
        headers=auth_headers,
        json={
            "assessment_type": "Cardiovascular risk profile",
            "biomarker_observations": {"alpha": 55},
            "symptom_indicators": ["fatigue", "chest discomfort"],
            "age_group": "senior",
            "risk_factors": ["sedentary"],
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["assessment"]["risk_level"] in {"LOW", "MODERATE", "ELEVATED", "HIGH"}
    assert "not a medical diagnosis" in data["explanation"]
    assert "not a medical diagnosis" in data["disclaimer"]


def test_disease_assessment_history(client, auth_headers, patient_id):
    client.post(
        f"/api/v1/patients/{patient_id}/disease-assessment",
        headers=auth_headers,
        json={"assessment_type": "General risk profile", "biomarker_observations": {"alpha": 20}},
    )
    res = client.get(f"/api/v1/patients/{patient_id}/disease-assessments", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1