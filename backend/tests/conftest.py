import os
import tempfile

TEST_DB = tempfile.NamedTemporaryFile(suffix=".db", delete=False).name
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["JWT_SECRET"] = "test-secret-key-that-is-long-enough-for-sha256-0123456789"
os.environ["AI_API_KEY"] = ""

import pytest
from fastapi.testclient import TestClient

from app.core.database import Base, engine, SessionLocal
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    os.unlink(TEST_DB)


@pytest.fixture(autouse=True)
def _clean_tables():
    yield
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    for table in reversed(inspector.get_table_names()):
        if table == "alembic_version":
            continue
        with engine.begin() as conn:
            conn.execute(text(f'DELETE FROM "{table}"'))


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers(client: TestClient) -> dict:
    res = client.post(
        "/api/v1/auth/register",
        json={"name": "Dr Test", "email": "admin@example.com", "password": "secret123", "organization_name": "Test Clinic"},
    )
    assert res.status_code == 201
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def patient_id(client: TestClient, auth_headers: dict) -> str:
    res = client.post(
        "/api/v1/patients",
        headers=auth_headers,
        json={"name": "Test Patient", "date_of_birth": "1985-04-12", "gender": "male"},
    )
    assert res.status_code == 201
    return res.json()["id"]