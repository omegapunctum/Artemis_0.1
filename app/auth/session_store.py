from __future__ import annotations

from typing import Protocol


class RefreshSessionStore(Protocol):
    def store_refresh_session(self, jti: str, user_id: str) -> None:
        ...

    def get_refresh_session_user(self, jti: str) -> str | None:
        ...

    def delete_refresh_session(self, jti: str) -> None:
        ...


class InMemoryRefreshSessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, str] = {}

    def store_refresh_session(self, jti: str, user_id: str) -> None:
        self._sessions[jti] = user_id

    def get_refresh_session_user(self, jti: str) -> str | None:
        return self._sessions.get(jti)

    def delete_refresh_session(self, jti: str) -> None:
        self._sessions.pop(jti, None)

    def clear(self) -> None:
        self._sessions.clear()

    @property
    def raw_sessions(self) -> dict[str, str]:
        return self._sessions


default_refresh_session_store = InMemoryRefreshSessionStore()
