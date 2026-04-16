import os
import subprocess
import time
from uuid import uuid4

import requests

from tests.db_rebind_helper import rebind_test_db


INSTANCE_A_PORT = 8014
INSTANCE_B_PORT = 8015
BASE_URL_A = f"http://127.0.0.1:{INSTANCE_A_PORT}"
BASE_URL_B = f"http://127.0.0.1:{INSTANCE_B_PORT}"


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


def test_refresh_token_shared_between_instances_with_real_redis(tmp_path) -> None:
    auth_db_path = tmp_path / "auth-redis-multi-instance.db"
    rebind_test_db(auth_db_path, session_backend="memory")

    common_env = os.environ.copy()
    common_env.update(
        {
            "APP_ENV": "test",
            "AUTH_SECRET_KEY": "test-secret-auth-redis-multi-instance",
            "AUTH_SESSION_BACKEND": "redis",
            "REDIS_URL": os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0"),
            "AUTH_DATABASE_URL": f"sqlite:///{auth_db_path}",
            "COOKIE_HTTPONLY": "true",
            "COOKIE_SAMESITE": "lax",
        }
    )

    server_a = _start_server(port=INSTANCE_A_PORT, env=common_env)
    server_b: subprocess.Popen | None = None

    session = requests.Session()
    try:
        _wait_for_server_ready(BASE_URL_A, session, server_a)
        server_b = _start_server(port=INSTANCE_B_PORT, env=common_env)
        _wait_for_server_ready(BASE_URL_B, session, server_b)

        email = f"redis-multi-{uuid4().hex}@example.com"
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

        refresh_on_b = session.post(f"{BASE_URL_B}/api/auth/refresh", timeout=5)
        assert refresh_on_b.status_code == 200
        assert refresh_on_b.json().get("access_token")

        rotated_refresh_token = session.cookies.get("refresh_token")
        assert rotated_refresh_token
        assert rotated_refresh_token != initial_refresh_token

        replay_old_on_a = session.post(
            f"{BASE_URL_A}/api/auth/refresh",
            cookies={"refresh_token": initial_refresh_token},
            timeout=5,
        )
        assert replay_old_on_a.status_code == 401
        replay_error = replay_old_on_a.json().get("error") or replay_old_on_a.json().get("detail")
        assert replay_error == "Invalid refresh token"
    finally:
        session.close()
        if server_a.poll() is None:
            server_a.terminate()
            server_a.wait(timeout=5)
        if server_b is not None and server_b.poll() is None:
            server_b.terminate()
            server_b.wait(timeout=5)
