from __future__ import annotations

import importlib
import os
from pathlib import Path
from types import SimpleNamespace

_TRACKED_ENV_KEYS = (
    "AUTH_DATABASE_URL",
    "AUTH_SESSION_BACKEND",
    "REDIS_URL",
)

_PASSTHROUGH_ENV_KEYS = (
    "PATH",
    "PYTHONPATH",
    "HOME",
    "PYENV_ROOT",
    "VIRTUAL_ENV",
)


def snapshot_rebind_env() -> dict[str, str | None]:
    return {key: os.environ.get(key) for key in _TRACKED_ENV_KEYS}


def restore_rebind_env(snapshot: dict[str, str | None]) -> None:
    for key in _TRACKED_ENV_KEYS:
        value = snapshot.get(key)
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value


def build_clean_test_env(overrides: dict[str, str]) -> dict[str, str]:
    base = {
        "APP_ENV": "test",
        "AUTH_SECRET_KEY": "test-secret",
        "COOKIE_HTTPONLY": "true",
        "COOKIE_SAMESITE": "lax",
    }
    for key in _PASSTHROUGH_ENV_KEYS:
        value = os.environ.get(key)
        if value:
            base[key] = value
    base.update(overrides)
    return base


def rebind_test_db(
    db_path: Path,
    *,
    reload_app_main: bool = False,
    session_backend: str | None = None,
) -> SimpleNamespace:
    original_env = snapshot_rebind_env()
    os.environ["AUTH_DATABASE_URL"] = f"sqlite:///{db_path}"
    if session_backend is not None:
        os.environ["AUTH_SESSION_BACKEND"] = session_backend

    import app.auth.session_store as auth_session_store
    import app.auth.service as auth_service
    import app.drafts.service as drafts_service
    import app.moderation.service as moderation_service

    auth_session_store = importlib.reload(auth_session_store)
    auth_service = importlib.reload(auth_service)
    drafts_service = importlib.reload(drafts_service)
    moderation_service = importlib.reload(moderation_service)

    app_main = None
    if reload_app_main:
        import app.auth.routes as auth_routes
        import app.drafts.routes as drafts_routes
        import app.moderation.routes as moderation_routes
        import app.uploads.routes as uploads_routes
        import app.routes.map as map_routes
        import app.main as main_module

        importlib.reload(auth_routes)
        importlib.reload(drafts_routes)
        importlib.reload(moderation_routes)
        importlib.reload(uploads_routes)
        importlib.reload(map_routes)
        app_main = importlib.reload(main_module)

    auth_service.init_db()
    drafts_service.init_db()

    return SimpleNamespace(
        auth_session_store=auth_session_store,
        auth_service=auth_service,
        drafts_service=drafts_service,
        moderation_service=moderation_service,
        app_main=app_main,
        original_env=original_env,
    )
