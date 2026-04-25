from app import main as app_main


def test_owner_role_runs_startup_apply_sequence() -> None:
    calls: list[str] = []

    def _init_auth() -> None:
        calls.append("auth")

    def _init_drafts() -> None:
        calls.append("drafts")

    ran = app_main._run_startup_migration_apply_sequence(
        startup_role="owner",
        init_functions=(_init_auth, _init_drafts),
    )

    assert ran is True
    assert calls == ["auth", "drafts"]


def test_non_owner_role_skips_startup_apply_sequence() -> None:
    calls: list[str] = []

    def _init_auth() -> None:
        calls.append("auth")

    ran = app_main._run_startup_migration_apply_sequence(
        startup_role="non-owner",
        init_functions=(_init_auth,),
    )

    assert ran is False
    assert calls == []


def test_runtime_env_requires_explicit_role_outside_dev_like() -> None:
    try:
        app_main._resolve_migration_startup_role(runtime_env="production", configured_role=None)
    except RuntimeError as exc:
        assert "MIGRATION_STARTUP_ROLE must be explicitly set" in str(exc)
    else:  # pragma: no cover - defensive branch
        raise AssertionError("expected RuntimeError for missing role outside dev-like envs")


def test_runtime_env_defaults_to_owner_in_dev_like() -> None:
    role = app_main._resolve_migration_startup_role(runtime_env="development", configured_role=None)
    assert role == "owner"
