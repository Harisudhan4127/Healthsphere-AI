def test_medication_create_and_status(client, auth_headers, patient_id):
    res = client.post(
        f"/api/v1/patients/{patient_id}/medications",
        headers=auth_headers,
        json={
            "name": "Insulin",
            "storage_requirements": {"min_temp": 2, "max_temp": 8, "max_duration_hours": 720, "label": "Refrigerated"},
        },
    )
    assert res.status_code == 201
    mid = res.json()["id"]

    status = client.get(f"/api/v1/medications/{mid}/status", headers=auth_headers)
    assert status.status_code == 200
    assert status.json()["status"] == "SAFE"


def test_medication_reading_alert(client, auth_headers, patient_id):
    med = client.post(
        f"/api/v1/patients/{patient_id}/medications",
        headers=auth_headers,
        json={"name": "Insulin", "storage_requirements": {"min_temp": 2, "max_temp": 8, "label": "Refrigerated"}},
    ).json()
    reading = client.post(
        f"/api/v1/medications/{med['id']}/readings",
        headers=auth_headers,
        json={"temperature": 15.0, "duration": 10},
    )
    assert reading.status_code == 201
    assert reading.json()["status"] == "HIGH"

    status = client.get(f"/api/v1/medications/{med['id']}/status", headers=auth_headers)
    assert status.json()["status"] == "HIGH"

    alerts = client.get("/api/v1/alerts", headers=auth_headers).json()
    assert any(a["type"] == "MEDICATION" for a in alerts)


def test_medication_not_found(client, auth_headers):
    res = client.get("/api/v1/medications/does-not-exist/status", headers=auth_headers)
    assert res.status_code == 404