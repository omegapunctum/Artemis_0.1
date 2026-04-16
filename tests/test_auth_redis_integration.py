import os
import subprocess
import time
from uuid import uuid4

import requests

from tests.db_rebind_helper import rebind_test_db


SERVER_PORT = 8013
BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"


def _wait_for_server_ready(session: requests.Session, server: subprocess.Popen | None = None) -> None:
    for _ in range(60):
        try:
            response = session.get(f"{BASE_URL}/api/health", timeout=0.5)
            if response.status_code == 200:
                return
        except requests.RequestException:
            pass
        time.sleep(0.2)
    stderr_tail = ""
    if server is not None and server.poll() is not None and server.stderr is not None:
        stderr_tail = server.stderr.read().decode("utf-8", errors="replace").strip()
    raise RuntimeError(
        "Failed to start auth redis integration test server"
        + (f"; uvicorn stderr: {stderr_tail}" if stderr_tail else "")
    )


def test_auth_refresh_lifecycle_with_real_redis_backend(tmp_path) -> None:
    auth_db_path = tmp_path / "auth-redis-integration.db"
    rebind_test_db(auth_db_path, session_backend="memory")

    env = os.environ.copy()
    env.update(
        {
            "APP_ENV": "test",
            "AUTH_SECRET_KEY": "test-secret-auth-redis-integration",
            "AUTH_SESSION_BACKEND": "redis",
            "REDIS_URL": os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0"),
            "AUTH_DATABASE_URL": f"sqlite:///{auth_db_path}",
            "COOKIE_HTTPONLY": "true",
            "COOKIE_SAMESITE": "lax",
        }
    )

    server = subprocess.Popen(
        [
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(SERVER_PORT),
            "--log-level",
            "warning",
        ],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )

    session = requests.Session()
    try:
        _wait_for_server_ready(session, server)

        email = f"redis-int-{uuid4().hex}@example.com"
        password = "password123"

        register = session.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": password},
            timeout=5,
        )
        assert register.status_code == 201

        login = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password},
            timeout=5,
        )
        assert login.status_code == 200
        assert login.json().get("access_token")

        initial_refresh_token = session.cookies.get("refresh_token")
        assert initial_refresh_token

        refresh = session.post(f"{BASE_URL}/api/auth/refresh", timeout=5)
        assert refresh.status_code == 200
        assert refresh.json().get("access_token")

        rotated_refresh_token = session.cookies.get("refresh_token")
        assert rotated_refresh_token
        assert rotated_refresh_token != initial_refresh_token

        replay_old_refresh = session.post(
            f"{BASE_URL}/api/auth/refresh",
            cookies={"refresh_token": initial_refresh_token},
            timeout=5,
        )
        assert replay_old_refresh.status_code == 401
        replay_error = replay_old_refresh.json().get("error") or replay_old_refresh.json().get("detail")
        assert replay_error == "Invalid refresh token"
    finally:
        session.close()
        server.terminate()
        server.wait(timeout=5)
