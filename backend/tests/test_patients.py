def test_create_and_get_patient(client, auth_headers):
    res = client.post(
        "/api/v1/patients",
        headers=auth_headers,
        json={"name": "Arun Kumar", "gender": "male"},
    )
    assert res.status_code == 201
    pid = res.json()["id"]

    got = client.get(f"/api/v1/patients/{pid}", headers=auth_headers)
    assert got.status_code == 200
    assert got.json()["name"] == "Arun Kumar"


def test_list_patients_and_search(client, auth_headers, patient_id):
    client.post("/api/v1/patients", headers=auth_headers, json={"name": "Priya Sharma"})
    res = client.get("/api/v1/patients", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 2

    search = client.get("/api/v1/patients?search=priya", headers=auth_headers)
    assert len(search.json()) == 1
    assert search.json()[0]["name"] == "Priya Sharma"


def test_update_patient(client, auth_headers, patient_id):
    res = client.put(f"/api/v1/patients/{patient_id}", headers=auth_headers, json={"status": "ARCHIVED"})
    assert res.status_code == 200
    assert res.json()["status"] == "ARCHIVED"


def test_delete_patient_requires_admin(client, auth_headers, patient_id):
    db_user = client.post(
        "/api/v1/auth/register", json={"name": "Clinician", "email": "clinician@example.com", "password": "secret123"}
    )
    clinician_headers = {"Authorization": f"Bearer {db_user.json()['access_token']}"}
    res = client.delete(f"/api/v1/patients/{patient_id}", headers=clinician_headers)
    assert res.status_code == 403

    res = client.delete(f"/api/v1/patients/{patient_id}", headers=auth_headers)
    assert res.status_code == 204


def test_patient_not_found(client, auth_headers):
    res = client.get("/api/v1/patients/nonexistent", headers=auth_headers)
    assert res.status_code == 404