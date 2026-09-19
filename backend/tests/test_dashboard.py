def test_alerts_list_and_resolve(client, auth_headers, patient_id):
    client.post(
        f"/api/v1/patients/{patient_id}/health",
        headers=auth_headers,
        json={"heart_rate": 130},
    )
    alerts = client.get("/api/v1/alerts", headers=auth_headers)
    assert alerts.status_code == 200

    if alerts.json():
        alert_id = alerts.json()[0]["id"]
        resolved = client.put(
            f"/api/v1/alerts/{alert_id}/status", headers=auth_headers, json={"status": "RESOLVED"}
        )
        assert resolved.json()["status"] == "RESOLVED"


def test_alerts_filter_resolved(client, auth_headers, patient_id):
    alerts = client.get("/api/v1/alerts?status=ACTIVE", headers=auth_headers).json()
    assert all(a["status"] == "ACTIVE" for a in alerts)


def test_dashboard_summary(client, auth_headers, patient_id):
    client.post(
        f"/api/v1/patients/{patient_id}/health",
        headers=auth_headers,
        json={"heart_rate": 80, "spo2": 96, "temperature": 36.7},
    )
    client.post(f"/api/v1/patients/{patient_id}/risk/recalculate", headers=auth_headers)
    res = client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_patients"] >= 1
    assert "risk_distribution" in data
    assert data["ai_insight"]


def test_analytics(client, auth_headers, patient_id):
    res = client.get("/api/v1/analytics", headers=auth_headers)
    assert res.status_code == 200
    assert set(res.json().keys()) == {"risk_trend", "patient_statistics", "alert_trend", "medication_safety", "emergency_events"}


def test_settings(client, auth_headers):
    res = client.get("/api/v1/settings", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["modules"]["health_monitoring"] is True