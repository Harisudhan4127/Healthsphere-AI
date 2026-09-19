def test_risk_calculation(client, auth_headers, patient_id):
    client.post(
        f"/api/v1/patients/{patient_id}/health",
        headers=auth_headers,
        json={"heart_rate": 118, "spo2": 93, "temperature": 38.0, "activity": 8, "sleep": 5.0},
    )
    client.post(
        f"/api/v1/patients/{patient_id}/symptoms",
        headers=auth_headers,
        json={"name": "Fever", "severity": "high"},
    )
    res = client.post(f"/api/v1/patients/{patient_id}/risk/recalculate", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert 0 <= data["score"] <= 100
    assert data["level"] in {"LOW", "MODERATE", "ELEVATED", "HIGH"}
    assert isinstance(data["factors"], list)
    assert len(data["factors"]) >= 4
    assert data["explanation"]


def test_risk_factors_explainable(client, auth_headers, patient_id):
    res = client.post(f"/api/v1/patients/{patient_id}/risk/recalculate", headers=auth_headers)
    factor_names = {f["name"] for f in res.json()["factors"]}
    assert "Health" in factor_names
    assert "Symptom" in factor_names
    assert "Emergency" in factor_names


def test_get_risk_returns_recent(client, auth_headers, patient_id):
    client.post(f"/api/v1/patients/{patient_id}/risk/recalculate", headers=auth_headers)
    res = client.get(f"/api/v1/patients/{patient_id}/risk", headers=auth_headers)
    assert res.status_code == 200
    assert "score" in res.json()