def test_post_health_record(client, auth_headers, patient_id):
    res = client.post(
        f"/api/v1/patients/{patient_id}/health",
        headers=auth_headers,
        json={"heart_rate": 76, "spo2": 97, "temperature": 36.8},
    )
    assert res.status_code == 201
    assert res.json()["heart_rate"] == 76


def test_get_health_summary_and_trends(client, auth_headers, patient_id):
    for _ in range(3):
        client.post(f"/api/v1/patients/{patient_id}/health", headers=auth_headers, json={"heart_rate": 80})

    summary = client.get(f"/api/v1/patients/{patient_id}/health/summary", headers=auth_headers)
    assert summary.status_code == 200
    assert summary.json()["latest"]["heart_rate"] == 80
    assert len(summary.json()["trend"]) == 3
    assert summary.json()["average"]["heart_rate"] == 80.0

    trends = client.get(f"/api/v1/patients/{patient_id}/health/trends", headers=auth_headers)
    assert len(trends.json()) == 3


def test_health_validation(client, auth_headers, patient_id):
    res = client.post(
        f"/api/v1/patients/{patient_id}/health",
        headers=auth_headers,
        json={"heart_rate": 999, "spo2": 999},
    )
    assert res.status_code == 422


def test_symptoms(client, auth_headers, patient_id):
    res = client.post(
        f"/api/v1/patients/{patient_id}/symptoms",
        headers=auth_headers,
        json={"name": "Fever", "severity": "high"},
    )
    assert res.status_code == 201
    lst = client.get(f"/api/v1/patients/{patient_id}/symptoms", headers=auth_headers)
    assert len(lst.json()) == 1