"""Tests de configuración y whitelist del Backend A."""

from fastapi.testclient import TestClient


def test_get_settings_defaults(client: TestClient, seeded):
    response = client.get("/api/v1/config/settings")

    assert response.status_code == 200
    body = response.json()
    assert body["max_retries"] == 5
    assert body["ban_time_min"] == 60
    assert body["findtime_min"] == 10
    assert body["auto_unban_enabled"] is True
    assert body["ufw_enabled"] is True
    assert body["ssh_port"] == 22


def test_put_settings_persiste(client: TestClient, seeded):
    response = client.put(
        "/api/v1/config/settings",
        json={"max_retries": 3, "ban_time_min": 30, "findtime_min": 5},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Settings updated"

    get = client.get("/api/v1/config/settings").json()
    assert get["max_retries"] == 3
    assert get["ban_time_min"] == 30
    assert get["findtime_min"] == 5


def test_get_whitelist(client: TestClient, seeded):
    response = client.get("/api/v1/config/whitelist")

    assert response.status_code == 200
    body = response.json()
    assert "127.0.0.1" in body["whitelist"]
    assert body["immutable_safeguard"] == "127.0.0.1"


def test_add_whitelist(client: TestClient, seeded):
    response = client.post("/api/v1/config/whitelist", json={"ip": "10.0.0.99"})

    assert response.status_code == 200
    assert "10.0.0.99" in response.json()["message"]

    whitelist = client.get("/api/v1/config/whitelist").json()["whitelist"]
    assert "10.0.0.99" in whitelist


def test_remove_whitelist(client: TestClient, seeded):
    client.post("/api/v1/config/whitelist", json={"ip": "10.0.0.99"})

    response = client.delete("/api/v1/config/whitelist/10.0.0.99")

    assert response.status_code == 200
    whitelist = client.get("/api/v1/config/whitelist").json()["whitelist"]
    assert "10.0.0.99" not in whitelist


def test_no_se_puede_quitar_loopback(client: TestClient, seeded):
    response = client.delete("/api/v1/config/whitelist/127.0.0.1")

    assert response.status_code == 403
    assert "loopback" in response.json()["detail"].lower()
