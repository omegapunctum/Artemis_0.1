import importlib
import os
import sqlite3
from pathlib import Path
from uuid import uuid4

import pytest


def _reload_services(monkeypatch: pytest.MonkeyPatch, db_path: Path):
    monkeypatch.setenv("AUTH_DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("AUTH_SECRET_KEY", "test-secret-schema-migrations")
    monkeypatch.setenv("AUTH_SESSION_BACKEND", "memory")

    import app.auth.service as auth_service
    import app.drafts.service as drafts_service

    auth_service = importlib.reload(auth_service)
    drafts_service = importlib.reload(drafts_service)
    return auth_service, drafts_service


def _table_columns(db_path: Path, table_name: str) -> set[str]:
    with sqlite3.connect(db_path) as conn:
        rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row[1] for row in rows}


def _schema_versions(db_path: Path) -> list[int]:
    with sqlite3.connect(db_path) as conn:
        rows = conn.execute("SELECT version FROM schema_version ORDER BY version").fetchall()
    return [int(row[0]) for row in rows]


def test_schema_migrations_apply_on_fresh_db(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    db_path = tmp_path / "fresh.db"
    auth_service, drafts_service = _reload_services(monkeypatch, db_path)

    auth_service.init_db()
    drafts_service.init_db()

    assert "is_admin" in _table_columns(db_path, "users")

    draft_columns = _table_columns(db_path, "drafts")
    assert {"image_url", "status", "publish_status", "airtable_record_id", "published_at", "payload"}.issubset(draft_columns)

    assert _schema_versions(db_path) == [1, 101, 102, 103, 104, 105, 106]


def test_schema_migrations_are_idempotent(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    db_path = tmp_path / "idempotent.db"
    auth_service, drafts_service = _reload_services(monkeypatch, db_path)

    auth_service.init_db()
    drafts_service.init_db()
    first_versions = _schema_versions(db_path)

    auth_service.init_db()
    drafts_service.init_db()
    second_versions = _schema_versions(db_path)

    assert first_versions == second_versions == [1, 101, 102, 103, 104, 105, 106]


def test_schema_migrations_upgrade_partially_evolved_db(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    db_path = tmp_path / "partial.db"

    with sqlite3.connect(db_path) as conn:
        conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, password_hash TEXT NOT NULL)")
        conn.execute(
            """
            CREATE TABLE drafts (
                id INTEGER PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                geometry TEXT,
                created_at DATETIME,
                updated_at DATETIME
            )
            """
        )
        conn.commit()

    auth_service, drafts_service = _reload_services(monkeypatch, db_path)
    auth_service.init_db()
    drafts_service.init_db()

    assert "is_admin" in _table_columns(db_path, "users")
    draft_columns = _table_columns(db_path, "drafts")
    assert {"image_url", "status", "publish_status", "airtable_record_id", "published_at", "payload"}.issubset(draft_columns)
    assert _schema_versions(db_path) == [1, 101, 102, 103, 104, 105, 106]


def test_auth_and_drafts_flow_works_after_migration_init(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    db_path = tmp_path / "flow.db"
    auth_service, drafts_service = _reload_services(monkeypatch, db_path)

    auth_service.init_db()
    drafts_service.init_db()

    db = auth_service.SessionLocal()
    try:
        email = f"migration-flow-{uuid4().hex}@example.com"
        auth_service.register_user(db, email, "password123")
        user = db.query(auth_service.User).filter(auth_service.User.email == email).first()
        assert user is not None

        draft = drafts_service.create_draft(
            db,
            user,
            "Draft title",
            "Draft description",
            {"type": "Point", "coordinates": [37.6, 55.7]},
            payload={"name_ru": "Draft title"},
        )
        assert draft.id is not None
        assert draft.status == "draft"
    finally:
        db.close()
