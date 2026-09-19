from app.services.emergency.service import VALID_TRANSITIONS


def test_emergency_workflow(client, auth_headers, patient_id):
    created = client.post(
        "/api/v1/emergencies",
        headers=auth_headers,
        json={"patient_id": patient_id, "event_type": "COLLISION", "severity": "HIGH"},
    )
    assert created.status_code == 201
    event = created.json()
    assert event["status"] == "DETECTED"
    assert event["timeline"][0]["label"] == "Event detected"

    assert VALID_TRANSITIONS["DETECTED"] == {"VERIFYING", "RESOLVED"}
    verifying = client.put(
        f"/api/v1/emergencies/{event['id']}/status", headers=auth_headers, json={"status": "VERIFYING"}
    )
    assert verifying.json()["status"] == "VERIFYING"
    assert len(verifying.json()["timeline"]) == 2

    alerted = client.put(
        f"/api/v1/emergencies/{event['id']}/status", headers=auth_headers, json={"status": "ALERTED"}
    )
    responding = client.put(
        f"/api/v1/emergencies/{event['id']}/status", headers=auth_headers, json={"status": "RESPONDING"}
    )
    resolved = client.put(
        f"/api/v1/emergencies/{event['id']}/status", headers=auth_headers, json={"status": "RESOLVED"}
    )
    assert resolved.json()["status"] == "RESOLVED"
    assert len(resolved.json()["timeline"]) == 5


def test_emergency_invalid_status(client, auth_headers, patient_id):
    event = client.post(
        "/api/v1/emergencies", headers=auth_headers, json={"patient_id": patient_id}
    ).json()
    res = client.put(
        f"/api/v1/emergencies/{event['id']}/status", headers=auth_headers, json={"status": "RESPONDING"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "DETECTED"


def test_emergency_list_and_alert_created(client, auth_headers, patient_id):
    client.post("/api/v1/emergencies", headers=auth_headers, json={"patient_id": patient_id, "severity": "CRITICAL"})
    lst = client.get("/api/v1/emergencies", headers=auth_headers)
    assert len(lst.json()) == 1
    alerts = client.get("/api/v1/alerts", headers=auth_headers).json()
    assert any(a["type"] == "EMERGENCY" for a in alerts)


def test_emergency_not_found(client, auth_headers):
    res = client.get("/api/v1/emergencies/does-not-exist", headers=auth_headers)
    assert res.status_code == 404