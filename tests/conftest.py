import os
from pathlib import Path

import pytest

from app.security.rate_limit import login_block_store, login_failure_store, rate_limit_store


def _configure_isolated_test_db() -> None:
    if os.getenv("AUTH_DATABASE_URL"):
        return

    worker_id = os.getenv("PYTEST_XDIST_WORKER", "main")
    db_dir = Path(".pytest_dbs")
    db_dir.mkdir(exist_ok=True)
    db_path = (db_dir / f"artemis_auth_{worker_id}_{os.getpid()}.db").resolve()
    os.environ["AUTH_DATABASE_URL"] = f"sqlite:///{db_path}"


_configure_isolated_test_db()


@pytest.fixture(autouse=True)
def reset_rate_limit_state():
    rate_limit_store.clear()
    login_failure_store.clear()
    login_block_store.clear()
    yield
    rate_limit_store.clear()
    login_failure_store.clear()
    login_block_store.clear()
