import types

import pytest

from app.auth import session_store


class _FakeRedisClient:
    def __init__(self) -> None:
        self.storage: dict[str, str] = {}
        self.calls: list[tuple] = []
        self.ping_called = False

    def ping(self) -> bool:
        self.ping_called = True
        return True

    def set(self, key: str, value: str, ex: int | None = None) -> bool:
        self.calls.append(("set", key, value, ex))
        self.storage[key] = value
        return True

    def get(self, key: str):
        self.calls.append(("get", key))
        value = self.storage.get(key)
        return value.encode("utf-8") if value is not None else None

    def delete(self, key: str) -> int:
        self.calls.append(("delete", key))
        existed = key in self.storage
        self.storage.pop(key, None)
        return int(existed)

    def getdel(self, key: str):
        self.calls.append(("getdel", key))
        value = self.storage.get(key)
        self.storage.pop(key, None)
        return value.encode("utf-8") if value is not None else None


class _FakeRedisClientWithoutGetDel(_FakeRedisClient):
    getdel = None

    def eval(self, script: str, numkeys: int, key: str):
        self.calls.append(("eval", script.strip(), numkeys, key))
        value = self.storage.get(key)
        self.storage.pop(key, None)
        return value.encode("utf-8") if value is not None else None


class _FakePipeline:
    def __init__(self, storage: dict[str, str], calls: list[tuple]) -> None:
        self.storage = storage
        self.calls = calls

    def watch(self, key: str) -> None:
        self.calls.append(("watch", key))

    def get(self, key: str):
        self.calls.append(("pipeline.get", key))
        value = self.storage.get(key)
        return value.encode("utf-8") if value is not None else None

    def multi(self) -> None:
        self.calls.append(("multi",))

    def delete(self, key: str) -> int:
        self.calls.append(("pipeline.delete", key))
        existed = key in self.storage
        self.storage.pop(key, None)
        return int(existed)

    def execute(self) -> list[int]:
        self.calls.append(("execute",))
        return [1]

    def reset(self) -> None:
        self.calls.append(("reset",))


class _FakeRedisClientWatchOnly(_FakeRedisClientWithoutGetDel):
    eval = None

    def pipeline(self):
        self.calls.append(("pipeline",))
        return _FakePipeline(self.storage, self.calls)


@pytest.mark.parametrize("app_env", ["development", "testing", "local", "dev", "test"])
def test_default_store_is_memory_when_backend_env_unset(
    monkeypatch: pytest.MonkeyPatch,
    app_env: str,
) -> None:
    monkeypatch.delenv("AUTH_SESSION_BACKEND", raising=False)
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.setenv("APP_ENV", app_env)

    store = session_store.create_default_refresh_session_store()
    assert isinstance(store, session_store.InMemoryRefreshSessionStore)


def test_memory_backend_is_rejected_outside_dev_test_local(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AUTH_SESSION_BACKEND", raising=False)
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.setenv("APP_ENV", "production")

    with pytest.raises(
        RuntimeError,
        match="AUTH_SESSION_BACKEND=memory is allowed only in dev/test/local environments",
    ):
        session_store.create_default_refresh_session_store()


def test_create_default_store_selects_redis_when_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_client = _FakeRedisClient()

    class _FakeRedisClass:
        @staticmethod
        def from_url(url: str, decode_responses: bool = False):
            assert url == "redis://redis.example:6379/0"
            assert decode_responses is False
            return fake_client

    monkeypatch.setenv("AUTH_SESSION_BACKEND", "redis")
    monkeypatch.setenv("REDIS_URL", "redis://redis.example:6379/0")
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setattr(session_store, "redis", types.SimpleNamespace(Redis=_FakeRedisClass))

    store = session_store.create_default_refresh_session_store()
    assert isinstance(store, session_store.RedisRefreshSessionStore)
    assert fake_client.ping_called is True


def test_create_default_store_fails_fast_when_redis_url_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AUTH_SESSION_BACKEND", "redis")
    monkeypatch.delenv("REDIS_URL", raising=False)

    with pytest.raises(RuntimeError, match="REDIS_URL is required when AUTH_SESSION_BACKEND=redis"):
        session_store.create_default_refresh_session_store()


def test_redis_refresh_session_store_passes_commands_and_ttl() -> None:
    client = _FakeRedisClient()
    store = session_store.RedisRefreshSessionStore(client=client, ttl_seconds=123)

    store.store_refresh_session("jti-1", "user-1")
    assert ("set", "auth:refresh:jti-1", "user-1", 123) in client.calls
    assert store.get_refresh_session_user("jti-1") == "user-1"
    assert ("get", "auth:refresh:jti-1") in client.calls
    assert store.consume_refresh_session("jti-1") == "user-1"
    assert ("getdel", "auth:refresh:jti-1") in client.calls
    assert store.consume_refresh_session("jti-1") is None
    store.delete_refresh_session("jti-1")
    assert ("delete", "auth:refresh:jti-1") in client.calls


def test_redis_refresh_session_store_uses_eval_when_getdel_unavailable() -> None:
    client = _FakeRedisClientWithoutGetDel()
    store = session_store.RedisRefreshSessionStore(client=client, ttl_seconds=123)

    store.store_refresh_session("jti-eval", "user-eval")
    assert store.consume_refresh_session("jti-eval") == "user-eval"
    assert any(call[0] == "eval" for call in client.calls)
    assert store.consume_refresh_session("jti-eval") is None


def test_redis_refresh_session_store_uses_watch_multi_when_eval_unavailable() -> None:
    client = _FakeRedisClientWatchOnly()
    store = session_store.RedisRefreshSessionStore(client=client, ttl_seconds=123)

    store.store_refresh_session("jti-watch", "user-watch")
    assert store.consume_refresh_session("jti-watch") == "user-watch"
    assert ("pipeline",) in client.calls
    assert ("watch", "auth:refresh:jti-watch") in client.calls
    assert ("pipeline.delete", "auth:refresh:jti-watch") in client.calls
    assert store.consume_refresh_session("jti-watch") is None
