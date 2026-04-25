import os
import sqlite3
import threading
import time
from pathlib import Path
from uuid import uuid4

import requests
import uvicorn
from fastapi import HTTPException

from tests.db_rebind_helper import rebind_test_db

SERVER_PORT = 8024
BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"


def _wait_for_server_ready(session: requests.Session) -> None:
    for _ in range(60):
        try:
            response = session.get(f"{BASE_URL}/api/health", timeout=0.5)
            if response.status_code == 200:
                return
        except requests.RequestException:
            pass
        time.sleep(0.2)
    raise RuntimeError("Failed to start moderation integration test server")


def _register_and_login(session: requests.Session, email: str, password: str = "password123") -> str:
    register = session.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": password}, timeout=5)
    assert register.status_code == 201

    login = session.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=5)
    assert login.status_code == 200
    token = login.json().get("access_token")
    assert token
    return token


def test_moderation_failure_failed_state_and_stable_retry_signal(monkeypatch, tmp_path: Path) -> None:
    db_path = tmp_path / "moderation-integration.db"

    os.environ["AUTH_DATABASE_URL"] = f"sqlite:///{db_path}"
    os.environ["AUTH_SECRET_KEY"] = "test-secret-moderation-integration"
    os.environ["AUTH_SESSION_BACKEND"] = "memory"
    os.environ["APP_ENV"] = "test"
    os.environ["COOKIE_HTTPONLY"] = "true"
    os.environ["COOKIE_SAMESITE"] = "lax"

    rebound = rebind_test_db(db_path, reload_app_main=True)
    auth_service = rebound.auth_service
    drafts_service = rebound.drafts_service
    moderation_service = rebound.moderation_service
    app_main = rebound.app_main
    effective_db_path = Path(auth_service.engine.url.database or str(db_path))

    db = auth_service.SessionLocal()
    try:
        db.query(drafts_service.Draft).delete()
        db.query(auth_service.User).delete()
        db.commit()
    finally:
        db.close()
        auth_service.reset_refresh_sessions_for_tests()

    attempts = {"create_calls": 0}

    def _fake_find_existing(_draft, fields=None):
        return None

    def _fake_create_airtable_feature(_draft, fields=None):
        if attempts["create_calls"] == 0:
            attempts["create_calls"] += 1
            raise HTTPException(status_code=502, detail="Airtable request failed: 503")
        attempts["create_calls"] += 1
        return {"id": "rec-retry-success"}

    monkeypatch.setattr(moderation_service, "find_existing_airtable_feature", _fake_find_existing)
    monkeypatch.setattr(moderation_service, "create_airtable_feature", _fake_create_airtable_feature)

    config = uvicorn.Config(app_main.app, host="127.0.0.1", port=SERVER_PORT, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    user_session = requests.Session()
    mod_session = requests.Session()
    try:
        _wait_for_server_ready(user_session)

        user_token = _register_and_login(user_session, f"user-{uuid4().hex}@example.com")
        user_headers = {"Authorization": f"Bearer {user_token}"}

        created = user_session.post(
            f"{BASE_URL}/api/drafts",
            headers=user_headers,
            json={
                "name_ru": "Moderation integration draft",
                "date_start": "2026-01-01",
                "source_url": "https://example.com/source",
                "description": "desc",
            },
            timeout=5,
        )
        assert created.status_code == 201
        draft_id = created.json()["id"]

        submitted = user_session.post(f"{BASE_URL}/api/drafts/{draft_id}/submit", headers=user_headers, timeout=5)
        assert submitted.status_code == 200

        moderator_email = f"moderator-{uuid4().hex}@example.com"
        _register_and_login(mod_session, moderator_email)

        with sqlite3.connect(effective_db_path) as conn:
            conn.execute("UPDATE users SET is_admin = 1 WHERE email = ?", (moderator_email,))
            conn.commit()

        relogin = mod_session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": moderator_email, "password": "password123"},
            timeout=5,
        )
        assert relogin.status_code == 200
        mod_headers = {"Authorization": f"Bearer {relogin.json()['access_token']}"}

        review_stage_1 = mod_session.post(f"{BASE_URL}/api/moderation/{draft_id}/approve", headers=mod_headers, timeout=5)
        assert review_stage_1.status_code == 200
        assert review_stage_1.headers.get("X-Moderation-Result") == "review_stage_1_passed"

        approve_fail = mod_session.post(f"{BASE_URL}/api/moderation/{draft_id}/approve", headers=mod_headers, timeout=5)
        assert approve_fail.status_code == 502

        with sqlite3.connect(effective_db_path) as conn:
            status_value, publish_status, airtable_record_id = conn.execute(
                "SELECT status, publish_status, airtable_record_id FROM drafts WHERE id = ?", (draft_id,)
            ).fetchone()
        assert status_value == "review"
        assert publish_status == "failed"
        assert airtable_record_id is None

        approve_retry = mod_session.post(f"{BASE_URL}/api/moderation/{draft_id}/approve", headers=mod_headers, timeout=5)
        assert approve_retry.status_code == 200
        assert approve_retry.headers.get("X-Moderation-Result") == "published_created"

        approve_stable = mod_session.post(f"{BASE_URL}/api/moderation/{draft_id}/approve", headers=mod_headers, timeout=5)
        assert approve_stable.status_code == 200
        assert approve_stable.headers.get("X-Moderation-Result") == "approved_already_published"

        with sqlite3.connect(effective_db_path) as conn:
            status_value, publish_status, airtable_record_id = conn.execute(
                "SELECT status, publish_status, airtable_record_id FROM drafts WHERE id = ?", (draft_id,)
            ).fetchone()
        assert status_value == "approved"
        assert publish_status == "published"
        assert airtable_record_id == "rec-retry-success"
    finally:
        user_session.close()
        mod_session.close()
        server.should_exit = True
        thread.join(timeout=10)
