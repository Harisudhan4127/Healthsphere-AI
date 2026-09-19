def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_register(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "secret123", "organization_name": "Clinic"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["access_token"]
    assert data["user"]["role"] == "ADMIN"
    assert data["user"]["email"] == "alice@example.com"


def test_register_duplicate_email(client):
    payload = {"name": "Alice", "email": "dup@example.com", "password": "secret123"}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    assert client.post("/api/v1/auth/register", json=payload).status_code == 400


def test_login_and_me(client, auth_headers):
    res = client.post(
        "/api/v1/auth/login", json={"email": "admin@example.com", "password": "secret123"}
    )
    assert res.status_code == 200
    token = res.json()["access_token"]

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "admin@example.com"


def test_login_invalid_credentials(client):
    res = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "wrong"})
    assert res.status_code == 401


def test_invalid_token(client):
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-token"})
    assert res.status_code == 401


def test_missing_token(client):
    assert client.get("/api/v1/auth/me").status_code == 401