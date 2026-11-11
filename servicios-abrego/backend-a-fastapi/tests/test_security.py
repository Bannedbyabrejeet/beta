"""Tests del puente de seguridad (unban y estado consolidado)."""

from fastapi.testclient import TestClient


def test_unban_publica_y_limpia_ip_baneada(client: TestClient, seeded):
    seeded.hset("ip:banned", "203.0.113.77", '{"ip":"203.0.113.77"}')

    response = client.post(
        "/api/v1/security/unban",
        json={"ip": "203.0.113.77", "reason": "prueba"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "channel:unban_events" in body["message"]
    assert body["subscribers_notified"] == 0  # no hay suscriptor en tests

    # la IP se elimina del hash de baneadas
    assert seeded.hexists("ip:banned", "203.0.113.77") == 0


def test_unban_sin_motivo_usa_default(client: TestClient, seeded):
    seeded.hset("ip:banned", "203.0.113.77", '{"ip":"203.0.113.77"}')

    response = client.post("/api/v1/security/unban", json={"ip": "203.0.113.77"})

    assert response.status_code == 200
    assert "channel:unban_events" in response.json()["message"]


def test_security_state_vacio(client: TestClient, seeded):
    response = client.get("/api/v1/security/state")

    assert response.status_code == 200
    body = response.json()
    assert body["banned"] == []
    assert body["failures"] == []
    assert body["logs"] == []
    assert body["pubsub"] == []
    assert body["ufw_ops"] == []
    assert "timestamp" in body


def test_security_state_con_datos(client: TestClient, seeded):
    seeded.hset("ip:banned", "203.0.113.77", '{"ip":"203.0.113.77","attempts":5}')
    seeded.rpush("ip:failures:10.0.0.5", "1000")
    seeded.lpush("security:logs", '{"id":"log-1","ip":"10.0.0.5","eventType":"FAILED_PASSWORD"}')
    seeded.lpush("security:pubsub", '{"id":"pub-1","payload":{"action":"BAN","ip":"203.0.113.77","timestamp":1}}')
    seeded.lpush("security:ufw_ops", '{"action":"BAN","ip":"203.0.113.77","ok":true}')

    response = client.get("/api/v1/security/state")

    assert response.status_code == 200
    body = response.json()
    assert len(body["banned"]) == 1
    assert body["banned"][0]["ip"] == "203.0.113.77"
    assert len(body["failures"]) == 1
    assert body["failures"][0]["ip"] == "10.0.0.5"
    assert body["logs"][0]["id"] == "log-1"
    assert body["pubsub"][0]["id"] == "pub-1"
    assert body["ufw_ops"][0]["action"] == "BAN"
