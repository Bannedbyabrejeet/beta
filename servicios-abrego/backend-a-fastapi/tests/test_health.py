"""Tests de health y estado inicial del Backend A."""

from fastapi.testclient import TestClient


def test_health_degraded_sin_redis_configurado(client: TestClient):
    # Sin config:settings, redis_connected puede ser true pero los endpoints de
    # configuración fallan. El health reporta el estado real del ping.
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    body = response.json()
    assert "status" in body
    assert "redis_connected" in body
    assert "redis_target" in body


def test_health_healthy_con_redis(client: TestClient, seeded):
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["redis_connected"] is True


def test_auth_status_no_inicializado(client: TestClient):
    response = client.get("/api/v1/auth/status")

    assert response.status_code == 200
    assert response.json()["is_initialized"] is False
