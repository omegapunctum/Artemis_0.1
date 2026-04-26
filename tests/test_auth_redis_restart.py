import os
import subprocess
import time
from uuid import uuid4

import pytest
import requests
from redis import Redis

from tests.db_rebind_helper import build_clean_test_env, rebind_test_db, restore_rebind_env


SERVER_A_PORT = 8016
SERVER_B_PORT = 8017
BASE_URL_A = f"http://127.0.0.1:{SERVER_A_PORT}"
BASE_URL_B = f"http://127.0.0.1:{SERVER_B_PORT}"
TEST_REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")


def _skip_if_redis_unavailable() -> None:
    try:
        Redis.from_url(TEST_REDIS_URL).ping()
    except Exception:
        pytest.skip(f"Redis integration test skipped: Redis is unavailable at {TEST_REDIS_URL}")


def _wait_for_server_ready(base_url: str, session: requests.Session, server: subprocess.Popen | None = None) -> None:
    for _ in range(60):
        try:
            response = session.get(f"{base_url}/api/health", timeout=0.5)
            if response.status_code == 200:
                return
        except requests.RequestException:
            pass
        time.sleep(0.2)
    stderr_tail = ""
    if server is not None and server.poll() is not None and server.stderr is not None:
        stderr_tail = server.stderr.read().decode("utf-8", errors="replace").strip()
    raise RuntimeError(f"Failed to start server on {base_url}" + (f"; uvicorn stderr: {stderr_tail}" if stderr_tail else ""))


def _start_server(*, port: int, env: dict[str, str]) -> subprocess.Popen:
    return subprocess.Popen(
        [
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--log-level",
            "warning",
        ],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )


def test_refresh_survives_restart_with_real_redis(tmp_path) -> None:
    _skip_if_redis_unavailable()
    auth_db_path = tmp_path / "auth-redis-restart.db"
    rebound = rebind_test_db(auth_db_path, session_backend="memory")

    common_env = build_clean_test_env(
        {
            "AUTH_SECRET_KEY": "test-secret-auth-redis-restart",
            "AUTH_SESSION_BACKEND": "redis",
            "REDIS_URL": TEST_REDIS_URL,
            "AUTH_DATABASE_URL": f"sqlite:///{auth_db_path}",
        }
    )

    session = requests.Session()
    server_a = _start_server(port=SERVER_A_PORT, env=common_env)
    server_b: subprocess.Popen | None = None

    try:
        _wait_for_server_ready(BASE_URL_A, session, server_a)

        email = f"redis-restart-{uuid4().hex}@example.com"
        password = "password123"

        register = session.post(
            f"{BASE_URL_A}/api/auth/register",
            json={"email": email, "password": password},
            timeout=5,
        )
        assert register.status_code == 201

        login = session.post(
            f"{BASE_URL_A}/api/auth/login",
            json={"email": email, "password": password},
            timeout=5,
        )
        assert login.status_code == 200
        assert login.json().get("access_token")

        initial_refresh_token = session.cookies.get("refresh_token")
        assert initial_refresh_token

        server_a.terminate()
        server_a.wait(timeout=5)

        server_b = _start_server(port=SERVER_B_PORT, env=common_env)
        _wait_for_server_ready(BASE_URL_B, session, server_b)

        refresh_after_restart = session.post(
            f"{BASE_URL_B}/api/auth/refresh",
            cookies={"refresh_token": initial_refresh_token},
            timeout=5,
        )
        assert refresh_after_restart.status_code == 200
        assert refresh_after_restart.json().get("access_token")

        replay_old = session.post(
            f"{BASE_URL_B}/api/auth/refresh",
            cookies={"refresh_token": initial_refresh_token},
            timeout=5,
        )
        assert replay_old.status_code == 401
        replay_error = replay_old.json().get("error") or replay_old.json().get("detail")
        assert replay_error == "Invalid refresh token"
    finally:
        session.close()
        if server_a.poll() is None:
            server_a.terminate()
            server_a.wait(timeout=5)
        if server_b is not None and server_b.poll() is None:
            server_b.terminate()
            server_b.wait(timeout=5)
        restore_rebind_env(rebound.original_env)
