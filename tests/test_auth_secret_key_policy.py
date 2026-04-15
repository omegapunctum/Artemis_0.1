import importlib
import sys

import pytest


def _reload_auth_utils(*, app_env: str | None, env: str | None, auth_secret_key: str | None, monkeypatch: pytest.MonkeyPatch):
    for key, value in (("APP_ENV", app_env), ("ENV", env), ("AUTH_SECRET_KEY", auth_secret_key)):
        if value is None:
            monkeypatch.delenv(key, raising=False)
        else:
            monkeypatch.setenv(key, value)

    sys.modules.pop("app.auth.utils", None)
    return importlib.import_module("app.auth.utils")


def test_ephemeral_fallback_allowed_for_dev_without_auth_secret_key(monkeypatch: pytest.MonkeyPatch) -> None:
    auth_utils = _reload_auth_utils(app_env="development", env=None, auth_secret_key=None, monkeypatch=monkeypatch)
    assert isinstance(auth_utils.SECRET_KEY, str)
    assert len(auth_utils.SECRET_KEY) > 0


def test_ephemeral_fallback_allowed_for_test_without_auth_secret_key(monkeypatch: pytest.MonkeyPatch) -> None:
    auth_utils = _reload_auth_utils(app_env=None, env="testing", auth_secret_key=None, monkeypatch=monkeypatch)
    assert isinstance(auth_utils.SECRET_KEY, str)
    assert len(auth_utils.SECRET_KEY) > 0


def test_runtime_error_for_non_dev_without_auth_secret_key(monkeypatch: pytest.MonkeyPatch) -> None:
    with pytest.raises(RuntimeError, match="AUTH_SECRET_KEY is required outside development/test environments"):
        _reload_auth_utils(app_env="production", env=None, auth_secret_key=None, monkeypatch=monkeypatch)


def test_explicit_auth_secret_key_works_in_non_dev(monkeypatch: pytest.MonkeyPatch) -> None:
    auth_utils = _reload_auth_utils(
        app_env="production",
        env=None,
        auth_secret_key="prod-secret-value",
        monkeypatch=monkeypatch,
    )
    assert auth_utils.SECRET_KEY == "prod-secret-value"
