"""Tests de autenticación (US-01, US-01.2, US-01.3, US-10)."""

import bcrypt

from fastapi.testclient import TestClient


def test_setup_crea_admin(client: TestClient, seeded):
    response = client.post(
        "/api/v1/auth/setup",
        json={"username": "admin", "password": "admin123", "email": "admin@bannedbyabrejeet.io"},
    )

    assert response.status_code == 200
    assert "creada exitosamente" in response.json()["message"]


def test_setup_duplicado_devuelve_400(client: TestClient, seeded):
    client.post(
        "/api/v1/auth/setup",
        json={"username": "admin", "password": "admin123", "email": "admin@bannedbyabrejeet.io"},
    )

    response = client.post(
        "/api/v1/auth/setup",
        json={"username": "otro", "password": "x", "email": "otro@mail.com"},
    )

    assert response.status_code == 400
    assert "Ya existe" in response.json()["detail"]


def test_login_exitoso(client: TestClient, seeded):
    client.post(
        "/api/v1/auth/setup",
        json={"username": "admin", "password": "admin123", "email": "admin@bannedbyabrejeet.io"},
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"].startswith("jwt_session_")
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 86400


def test_login_por_email(client: TestClient, seeded):
    client.post(
        "/api/v1/auth/setup",
        json={"username": "admin", "password": "admin123", "email": "admin@bannedbyabrejeet.io"},
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "ADMIN@bannedbyabrejeet.io", "password": "admin123"},
    )

    assert response.status_code == 200


def test_login_password_incorrecta(client: TestClient, seeded):
    client.post(
        "/api/v1/auth/setup",
        json={"username": "admin", "password": "admin123", "email": "admin@bannedbyabrejeet.io"},
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "mal"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales inválidas"


def test_login_sin_admin_configurado(client: TestClient, seeded):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )

    assert response.status_code == 400
    assert "No existe un administrador" in response.json()["detail"]


def test_auth_status_inicializado(client: TestClient, seeded):
    client.post(
        "/api/v1/auth/setup",
        json={"username": "admin", "password": "admin123", "email": "admin@bannedbyabrejeet.io"},
    )

    response = client.get("/api/v1/auth/status")

    assert response.status_code == 200
    body = response.json()
    assert body["is_initialized"] is True
    assert body["username"] == "admin"
    assert body["email"] == "admin@bannedbyabrejeet.io"


def test_forgot_password_emite_token(client: TestClient, seeded):
    client.post(
        "/api/v1/auth/setup",
        json={"username": "admin", "password": "admin123", "email": "admin@bannedbyabrejeet.io"},
    )

    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "admin@bannedbyabrejeet.io"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reset_token"].startswith("rst_")
    assert body["expires_in_seconds"] == 900
    assert body["redis_key"].startswith("auth:reset_token:")


def test_forgot_password_email_desconocido(client: TestClient, seeded):
    client.post(
        "/api/v1/auth/setup",
        json={"username": "admin", "password": "admin123", "email": "admin@bannedbyabrejeet.io"},
    )

    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "otro@mail.com"},
    )

    assert response.status_code == 404


def test_reset_password_cambia_clave(client: TestClient, seeded):
    client.post(
        "/api/v1/auth/setup",
        json={"username": "admin", "password": "admin123", "email": "admin@bannedbyabrejeet.io"},
    )

    forgot = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "admin@bannedbyabrejeet.io"},
    )
    token = forgot.json()["reset_token"]

    response = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "nuevaClave123"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Contraseña actualizada correctamente"

    # la nueva clave funciona
    login = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "nuevaClave123"},
    )
    assert login.status_code == 200


def test_reset_password_token_invalido(client: TestClient, seeded):
    response = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "no-existe", "new_password": "nuevaClave123"},
    )

    assert response.status_code == 400
    assert "caducado" in response.json()["detail"]
