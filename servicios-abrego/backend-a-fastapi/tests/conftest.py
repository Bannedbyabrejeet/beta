"""Configuración compartida de los tests del Backend A (FastAPI).

Se usa fakeredis para no depender de un servidor Redis real: la suite debe
poder correr en CI sin servicios externos.
"""

import os
import sys

import fakeredis
import pytest

# El backend vive un nivel arriba del directorio de tests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import main  # noqa: E402


@pytest.fixture
def fake_redis():
    """Redis en memoria, compartido por todos los endpoints de un test."""
    fake = fakeredis.FakeRedis(decode_responses=True)
    main.r = fake
    return fake


@pytest.fixture
def client(fake_redis):
    """TestClient de FastAPI con Redis falso inyectado."""
    from fastapi.testclient import TestClient

    return TestClient(main.app)


@pytest.fixture
def seeded(fake_redis):
    """Redis con la configuración inicial (como la deja startup_db_init)."""
    fake_redis.hset("config:settings", mapping={
        "max_retries": 5,
        "ban_time_min": 60,
        "findtime_min": 10,
    })
    fake_redis.sadd("config:whitelist", "127.0.0.1", "::1", "192.168.220.123")
    return fake_redis
