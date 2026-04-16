import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from scripts import release_check


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / "scripts" / "release_check.py"


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _build_fixture(
    root: Path,
    *,
    empty_features: bool = False,
    frontend_fallback: bool = False,
    include_sw: bool = True,
    unsafe_sw: bool = False,
    expected_fallback_warnings: int = 0,
    data_quality_warnings: int = 0,
    records_total_source: int | None = None,
    records_rejected: int | None = None,
    rejected_items: list[dict] | None = None,
) -> None:
    features = [] if empty_features else [{"type": "Feature", "geometry": None, "properties": {}}]
    rejected_payload = rejected_items or []
    resolved_records_rejected = len(rejected_payload) if records_rejected is None else records_rejected
    resolved_records_total_source = (
        len(features) + resolved_records_rejected
        if records_total_source is None
        else records_total_source
    )
    _write(
        root / "data" / "features.geojson",
        json.dumps({"type": "FeatureCollection", "features": features}),
    )
    _write(
        root / "data" / "features.json",
        json.dumps([{"id": "f1"} for _ in features]),
    )
    _write(
        root / "data" / "export_meta.json",
        json.dumps(
            {
                "records_exported": len(features),
                "records_rejected": resolved_records_rejected,
                "records_total_source": resolved_records_total_source,
                "warning_categories": {
                    "expected_fallback": expected_fallback_warnings,
                    "data_quality": data_quality_warnings,
                },
            }
        ),
    )
    _write(root / "data" / "rejected.json", json.dumps(rejected_payload))

    if frontend_fallback:
        data_js = """
const primary = 'data/features.geojson';
function fallbackToMapFeed() {
  return fetch('/api/map/feed');
}
""".strip()
    else:
        data_js = """
const primary = 'data/features.geojson';
const auxiliary = '/api/map/feed';
export async function loadPrimary() {
  return fetch(primary);
}
""".strip()
    _write(root / "js" / "data.js", data_js)

    if include_sw:
        if unsafe_sw:
            _write(
                root / "sw.js",
                """
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/auth')) {
    event.respondWith(caches.open('runtime').then((cache) => cache.match(event.request)));
    return;
  }
  event.respondWith(fetch(event.request));
});
""".strip()
                + "\n",
            )
        else:
            _write(
                root / "sw.js",
                """
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const isPrivateApiRequest = url.pathname.startsWith('/api/');
  if (isPrivateApiRequest) {
    event.respondWith(fetch(request));
    return;
  }
  event.respondWith(fetch(request));
});
""".strip()
                + "\n",
            )

    _write(root / "app" / "__init__.py", "")
    _write(root / "app" / "main.py", "app = object()\n")
    _write(root / "scripts" / "export_airtable.py", "# fixture export script\n")


def _run_release_check(
    root: Path,
    *,
    env_overrides: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["RELEASE_CHECK_ROOT"] = str(root)
    env.pop("PYTHONPATH", None)
    if env_overrides:
        env.update(env_overrides)
    return subprocess.run(
        [sys.executable, str(SCRIPT)],
        cwd=str(REPO_ROOT),
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )


def test_release_check_happy_path(tmp_path: Path) -> None:
    _build_fixture(tmp_path)
    result = _run_release_check(tmp_path)

    assert result.returncode == 0, result.stdout + result.stderr
    assert "[PASS] Data layer" in result.stdout
    assert "[PASS] Backend" in result.stdout
    assert "[PASS] Frontend" in result.stdout
    assert "[PASS] PWA" in result.stdout
    assert "[PASS] Governance" in result.stdout


def test_release_check_fails_on_empty_geojson(tmp_path: Path) -> None:
    _build_fixture(tmp_path, empty_features=True)
    result = _run_release_check(tmp_path)

    assert result.returncode == 1
    assert "[FAIL] Data layer: features.geojson is empty" in result.stdout


def test_release_check_fails_when_features_json_missing(tmp_path: Path) -> None:
    _build_fixture(tmp_path)
    (tmp_path / "data" / "features.json").unlink()
    result = _run_release_check(tmp_path)

    assert result.returncode == 1
    assert "[FAIL] Data layer: data/features.json is missing" in result.stdout


def test_release_check_fails_on_frontend_fallback_pattern(tmp_path: Path) -> None:
    _build_fixture(tmp_path, frontend_fallback=True)
    result = _run_release_check(tmp_path)

    assert result.returncode == 1
    assert "[FAIL] Frontend:" in result.stdout
    assert "js/data.js contains fallback marker" in result.stdout
    assert '"fallbacktomapfeed"' in result.stdout


def test_release_check_fails_when_sw_missing(tmp_path: Path) -> None:
    _build_fixture(tmp_path, include_sw=False)
    result = _run_release_check(tmp_path)

    assert result.returncode == 1
    assert "[FAIL] PWA: sw.js is missing" in result.stdout


def test_release_check_fails_when_private_requests_are_cache_eligible(tmp_path: Path) -> None:
    _build_fixture(tmp_path, unsafe_sw=True)
    result = _run_release_check(tmp_path)

    assert result.returncode == 1
    assert "[FAIL] PWA:" in result.stdout


def test_release_check_fails_when_expected_fallback_exceeds_threshold(tmp_path: Path) -> None:
    _build_fixture(tmp_path, expected_fallback_warnings=11)
    result = _run_release_check(tmp_path)

    assert result.returncode == 1
    assert "[FAIL] Data layer: expected_fallback warnings exceed threshold (11 > 10)" in result.stdout


def test_release_check_fails_when_data_quality_exceeds_threshold(tmp_path: Path) -> None:
    _build_fixture(tmp_path, data_quality_warnings=1)
    result = _run_release_check(tmp_path)

    assert result.returncode == 1
    assert "[FAIL] Data layer: data_quality warnings exceed threshold (1 > 0)" in result.stdout


def test_release_check_fails_on_legacy_upload_path_assumption(tmp_path: Path) -> None:
    _build_fixture(tmp_path)
    _write(
        tmp_path / "js" / "uploads.js",
        "const legacy = `/api/uploads/${filename}`;\n",
    )
    result = _run_release_check(tmp_path)

    assert result.returncode == 1
    assert "[FAIL] Frontend: js/uploads.js contains legacy /api/uploads/{filename} assumption" in result.stdout


def test_release_check_fails_when_records_rejected_mismatches_rejected_json(tmp_path: Path) -> None:
    _build_fixture(tmp_path, records_rejected=2, rejected_items=[{"id": "r1"}])
    result = _run_release_check(tmp_path)

    assert result.returncode == 1
    assert "[FAIL] Data layer: records mismatch:" in result.stdout
    assert "records_rejected=2, rejected_json=1" in result.stdout


def test_release_check_fails_when_records_total_source_arithmetic_mismatch(tmp_path: Path) -> None:
    _build_fixture(tmp_path, records_total_source=99)
    result = _run_release_check(tmp_path)

    assert result.returncode == 1
    assert "[FAIL] Data layer: records mismatch:" in result.stdout
    assert "records_total_source=99, records_exported_plus_rejected=1" in result.stdout


def test_release_check_fails_without_auth_secret_key_outside_dev_test(tmp_path: Path) -> None:
    _build_fixture(tmp_path)
    result = _run_release_check(
        tmp_path,
        env_overrides={
            "APP_ENV": "prod",
            "AUTH_SECRET_KEY": "",
        },
    )

    assert result.returncode == 1
    assert "[FAIL] Runtime/deployment: AUTH_SECRET_KEY is required outside dev/test" in result.stdout


def test_release_check_fails_when_redis_backend_without_redis_url(tmp_path: Path) -> None:
    _build_fixture(tmp_path)
    result = _run_release_check(
        tmp_path,
        env_overrides={
            "APP_ENV": "prod",
            "AUTH_SECRET_KEY": "super-secret",
            "AUTH_SESSION_BACKEND": "redis",
            "REDIS_URL": "",
        },
    )

    assert result.returncode == 1
    assert "[FAIL] Runtime/deployment: REDIS_URL is required when AUTH_SESSION_BACKEND=redis" in result.stdout


def test_release_check_fails_when_session_backend_invalid(tmp_path: Path) -> None:
    _build_fixture(tmp_path)
    result = _run_release_check(
        tmp_path,
        env_overrides={
            "AUTH_SESSION_BACKEND": "sqlite",
        },
    )

    assert result.returncode == 1
    assert '[FAIL] Runtime/deployment: AUTH_SESSION_BACKEND must be "memory" or "redis"' in result.stdout


def test_release_check_passes_with_valid_runtime_deployment_config(tmp_path: Path) -> None:
    _build_fixture(tmp_path)
    result = _run_release_check(
        tmp_path,
        env_overrides={
            "APP_ENV": "prod",
            "AUTH_SECRET_KEY": "super-secret",
            "AUTH_SESSION_BACKEND": "redis",
            "REDIS_URL": "redis://localhost:6379/0",
        },
    )

    assert result.returncode == 0, result.stdout + result.stderr
    assert "[PASS] Runtime/deployment" in result.stdout


def test_release_check_warns_for_memory_backend(tmp_path: Path) -> None:
    _build_fixture(tmp_path)
    result = _run_release_check(
        tmp_path,
        env_overrides={
            "AUTH_SESSION_BACKEND": "memory",
        },
    )

    assert result.returncode == 0, result.stdout + result.stderr
    assert "[WARN] Runtime/deployment: memory session backend -> single-node baseline only" in result.stdout


def test_release_check_invokes_pwa_behavioral_pytest(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    behavioral_test = tmp_path / "tests" / "test_sw_fetch_behavior.py"
    _write(behavioral_test, "def test_placeholder():\n    assert True\n")
    monkeypatch.setattr(release_check, "BEHAVIORAL_PWA_TEST_PATH", behavioral_test)

    calls: list[tuple[list[str], str]] = []

    def _fake_run(cmd, **kwargs):
        calls.append((cmd, kwargs.get("cwd", "")))
        return subprocess.CompletedProcess(cmd, 0, stdout="ok", stderr="")

    monkeypatch.setattr(release_check.subprocess, "run", _fake_run)

    release_check.check_pwa_behavioral()

    assert calls, "behavioral PWA subprocess must be invoked"
    cmd, cwd = calls[0]
    assert cmd[0] == sys.executable
    assert cmd[1:3] == ["-m", "pytest"]
    assert str(behavioral_test) in cmd
    assert cwd == str(REPO_ROOT)


def test_release_check_fails_when_behavioral_pwa_verification_fails(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    behavioral_test = tmp_path / "tests" / "test_sw_fetch_behavior.py"
    _write(behavioral_test, "def test_placeholder():\n    assert True\n")
    monkeypatch.setattr(release_check, "BEHAVIORAL_PWA_TEST_PATH", behavioral_test)

    def _fake_run(cmd, **_kwargs):
        return subprocess.CompletedProcess(cmd, 1, stdout="failure", stderr="")

    monkeypatch.setattr(release_check.subprocess, "run", _fake_run)

    with pytest.raises(release_check.CheckFailed, match="PWA behavioral verification failed"):
        release_check.check_pwa_behavioral()
