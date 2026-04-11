#!/usr/bin/env python3
from __future__ import annotations

import importlib
import json
import os
import re
import sys
from pathlib import Path


ROOT = Path(os.environ.get("RELEASE_CHECK_ROOT", Path(__file__).resolve().parents[1])).resolve()
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

MAX_EXPECTED_FALLBACK_WARNINGS = 10
MAX_DATA_QUALITY_WARNINGS = 0


class CheckFailed(Exception):
    pass


def fail(message: str) -> None:
    raise CheckFailed(message)


def read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"{path.as_posix()} is invalid JSON: {exc}")


def check_data_layer() -> None:
    features_path = ROOT / "data/features.geojson"
    if not features_path.exists():
        fail("data/features.geojson is missing")

    features_payload = read_json(features_path)
    features = features_payload.get("features") if isinstance(features_payload, dict) else None
    if not isinstance(features, list):
        fail("data/features.geojson has invalid features array")
    if len(features) == 0:
        fail("features.geojson is empty")

    export_meta_path = ROOT / "data/export_meta.json"
    if not export_meta_path.exists():
        fail("data/export_meta.json is missing")

    export_meta = read_json(export_meta_path)
    records_exported = export_meta.get("records_exported") if isinstance(export_meta, dict) else None
    if not isinstance(records_exported, int):
        fail("data/export_meta.json missing integer records_exported")

    if records_exported != len(features):
        fail(
            "records mismatch: "
            f"records_exported={records_exported}, records_geojson={len(features)}"
        )

    warning_categories = export_meta.get("warning_categories") if isinstance(export_meta, dict) else None
    if not isinstance(warning_categories, dict):
        fail("data/export_meta.json missing warning_categories object")

    expected_fallback = warning_categories.get("expected_fallback", 0)
    data_quality = warning_categories.get("data_quality", 0)
    if not isinstance(expected_fallback, int):
        fail("data/export_meta.json warning_categories.expected_fallback must be integer")
    if not isinstance(data_quality, int):
        fail("data/export_meta.json warning_categories.data_quality must be integer")

    if expected_fallback > MAX_EXPECTED_FALLBACK_WARNINGS:
        fail(
            "expected_fallback warnings exceed threshold "
            f"({expected_fallback} > {MAX_EXPECTED_FALLBACK_WARNINGS})"
        )
    if data_quality > MAX_DATA_QUALITY_WARNINGS:
        fail(
            "data_quality warnings exceed threshold "
            f"({data_quality} > {MAX_DATA_QUALITY_WARNINGS})"
        )

    rejected_path = ROOT / "data/rejected.json"
    if not rejected_path.exists():
        fail("data/rejected.json is missing")


def check_backend() -> None:
    try:
        module = importlib.import_module("app.main")
    except Exception as exc:
        fail(f"failed to import app.main: {exc}")

    app = getattr(module, "app", None)
    if app is None:
        fail("app.main:app is missing")


def check_frontend() -> None:
    data_js = ROOT / "js/data.js"
    if not data_js.exists():
        fail("js/data.js is missing")

    text = data_js.read_text(encoding="utf-8").lower()
    has_canonical_data_ref = "/data/" in text or "data/" in text
    if not has_canonical_data_ref:
        fail('js/data.js must reference canonical "/data/" source')

    if "/api/map/feed" not in text:
        return

    explicit_substitution_markers = (
        "fallbacktomapfeed",
        "loadmapfeedonerror",
        "retrywithruntimefeed",
    )
    for marker in explicit_substitution_markers:
        if marker in text:
            fail(f'js/data.js contains fallback marker: "{marker}"')

    substitution_words = (
        "fallback",
        "onerror",
        "catch",
        "retry",
        "alternate",
        "backup",
        "if fail",
        "if error",
    )

    for match in re.finditer(r"/api/map/feed", text):
        start = max(0, match.start() - 240)
        end = min(len(text), match.end() + 240)
        window = text[start:end]
        has_data_ref_in_window = "/data/" in window or "data/" in window
        if has_data_ref_in_window and any(word in window for word in substitution_words):
            fail("js/data.js contains suspicious /data/* -> /api/map/feed fallback pattern")
        if has_data_ref_in_window and re.search(r"(\|\||\?\?|:).{0,80}/api/map/feed|/api/map/feed.{0,80}(\|\||\?\?|:)", window):
            fail("js/data.js contains interchangeable source pattern with /api/map/feed")


def check_pwa() -> None:
    sw_path = ROOT / "sw.js"
    if not sw_path.exists():
        fail("sw.js is missing")

    sw_text = sw_path.read_text(encoding="utf-8")
    forbidden = ["/api/auth", "/api/drafts"]
    for token in forbidden:
        if token in sw_text:
            fail(f'sw.js contains forbidden cache path: "{token}"')


def check_governance() -> None:
    export_script = ROOT / "scripts/export_airtable.py"
    if not export_script.exists():
        fail("scripts/export_airtable.py is missing")

    runtime_roots = [ROOT / "app", ROOT / "js"]
    for runtime_root in runtime_roots:
        if not runtime_root.exists():
            continue
        for path in runtime_root.rglob("*"):
            if not path.is_file() or path.suffix not in {".py", ".js"}:
                continue
            rel = path.relative_to(ROOT)
            if "moderation" in rel.parts:
                continue

            text = path.read_text(encoding="utf-8", errors="ignore")
            if "publish(" in text:
                fail(f'direct runtime publish found outside moderation: "{rel.as_posix()}"')


def run_check(name: str, func) -> None:
    try:
        func()
    except CheckFailed as exc:
        print(f"[FAIL] {name}: {exc}")
        sys.exit(1)
    print(f"[PASS] {name}")


def main() -> None:
    run_check("Data layer", check_data_layer)
    run_check("Backend", check_backend)
    run_check("Frontend", check_frontend)
    run_check("PWA", check_pwa)
    run_check("Governance", check_governance)


if __name__ == "__main__":
    main()
