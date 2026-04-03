import pytest

from app.security.rate_limit import login_block_store, login_failure_store, rate_limit_store


@pytest.fixture(autouse=True)
def reset_rate_limit_state():
    rate_limit_store.clear()
    login_failure_store.clear()
    login_block_store.clear()
    yield
    rate_limit_store.clear()
    login_failure_store.clear()
    login_block_store.clear()
