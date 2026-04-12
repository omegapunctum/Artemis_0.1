import json
import os
import subprocess
import sys
from pathlib import Path


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
) -> None:
    features = [] if empty_features else [{"type": "Feature", "geometry": None, "properties": {}}]
    _write(
        root / "data" / "features.geojson",
        json.dumps({"type": "FeatureCollection", "features": features}),
    )
    _write(
        root / "data" / "export_meta.json",
        json.dumps(
            {
                "records_exported": len(features),
                "warning_categories": {
                    "expected_fallback": expected_fallback_warnings,
                    "data_quality": data_quality_warnings,
                },
            }
        ),
    )
    _write(root / "data" / "rejected.json", "[]")

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


def _run_release_check(root: Path) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["RELEASE_CHECK_ROOT"] = str(root)
    env.pop("PYTHONPATH", None)
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


def test_release_check_fails_on_frontend_fallback_pattern(tmp_path: Path) -> None:
    _build_fixture(tmp_path, frontend_fallback=True)
    result = _run_release_check(tmp_path)

    assert result.returncode == 1
    assert "[FAIL] Frontend:" in result.stdout


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
