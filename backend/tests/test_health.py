from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_success():
    """
    Test GET /health returns 200 and expected service status metadata
    without leaking internal configuration or secrets.
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "hireflow-backend"
    assert "version" in data
    assert "database_configured" in data


def test_root_endpoint():
    """
    Test root endpoint provides service discovery links.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "docs" in data
    assert "health" in data
