#!/usr/bin/env python3
"""Standalone Airtable audit utility for ARTEMIS.

Reads records from Airtable tables `Features` and `Layers`, validates data,
writes `data/audit_report.json`, prints a summary, and exits with code 1 when
critical issues are found.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ALLOWED_LICENSES = {"CC0", "CC BY", "CC BY-SA", "PD"}
ALLOWED_COORDINATES_CONFIDENCE = {"exact", "approximate", "unknown"}
HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
AIRTABLE_API_URL = "https://api.airtable.com/v0"
PAGE_SIZE = 100
REQUEST_DELAY_SECONDS = 0.25
MAX_429_RETRIES = 5
REPORT_PATH = Path("data/audit_report.json")


def fetch_airtable_records(table_name: str) -> List[Dict[str, Any]]:
    """Fetch all Airtable records for a given table without modifying data."""
    token = os.getenv("AIRTABLE_TOKEN")
    base_id = os.getenv("AIRTABLE_BASE_ID")
    if not token or not base_id:
        raise RuntimeError("Environment variables AIRTABLE_TOKEN and AIRTABLE_BASE_ID are required.")

    encoded_table = urllib.parse.quote(table_name, safe="")
    url = f"{AIRTABLE_API_URL}/{base_id}/{encoded_table}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    records: List[Dict[str, Any]] = []
    offset: Optional[str] = None
    retries_429 = 0

    while True:
        query = {"pageSize": PAGE_SIZE}
        if offset:
            query["offset"] = offset
        request_url = f"{url}?{urllib.parse.urlencode(query)}"
        request = urllib.request.Request(request_url, headers=headers, method="GET")

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                retries_429 += 1
                if retries_429 > MAX_429_RETRIES:
                    raise RuntimeError(f"Airtable rate limit exceeded for table {table_name}.") from exc
                time.sleep(2**retries_429)
                continue
            if exc.code in (401, 403):
                raise RuntimeError("Airtable authorization failed. Check AIRTABLE_TOKEN permissions.") from exc
            error_body = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
            raise RuntimeError(f"Airtable request failed for {table_name}: HTTP {exc.code} {error_body[:300]}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Network error while fetching {table_name}: {exc}") from exc
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Invalid JSON response while fetching {table_name}: {exc}") from exc

        retries_429 = 0
        page_records = payload.get("records", [])
        if not isinstance(page_records, list):
            raise RuntimeError(f"Unexpected Airtable payload for {table_name}: 'records' must be a list.")
        records.extend(page_records)

        offset = payload.get("offset")
        if not offset:
            break
        time.sleep(REQUEST_DELAY_SECONDS)

    return records


def is_valid_iso_date(value: Any) -> bool:
    if value in (None, ""):
        return True
    if not isinstance(value, str):
        return False
    try:
        dt.date.fromisoformat(value)
    except ValueError:
        return False
    return True


def is_valid_color_hex(value: Any) -> bool:
    return isinstance(value, str) and HEX_COLOR_RE.fullmatch(value.strip()) is not None


def _normalize_string(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def _normalize_number(value: Any) -> Tuple[Optional[float], bool]:
    if value in (None, ""):
        return None, True
    if isinstance(value, bool):
        return None, False
    if isinstance(value, (int, float)):
        return float(value), True
    try:
        return float(str(value).strip()), True
    except (TypeError, ValueError):
        return None, False


def _is_boolean(value: Any) -> bool:
    return isinstance(value, bool)


def _extract_fields(record: Dict[str, Any]) -> Dict[str, Any]:
    fields = record.get("fields")
    return fields if isinstance(fields, dict) else {}


def _feature_identifier(feature: Dict[str, Any], fields: Dict[str, Any]) -> str:
    return _normalize_string(fields.get("id")) or _normalize_string(feature.get("id")) or "<missing>"


def _layer_identifier(layer: Dict[str, Any], fields: Dict[str, Any]) -> str:
    return _normalize_string(fields.get("layer_id")) or _normalize_string(layer.get("id")) or "<missing>"


def validate_feature(feature: Dict[str, Any], layers_set: set[str]) -> Dict[str, Any]:
    fields = _extract_fields(feature)
    feature_id = _feature_identifier(feature, fields)
    errors: List[str] = []
    warnings: List[str] = []

    logical_id = _normalize_string(fields.get("id"))
    layer_id = _normalize_string(fields.get("layer_id"))
    name_ru = _normalize_string(fields.get("name_ru"))
    source_url = _normalize_string(fields.get("source_url"))
    title_short = _normalize_string(fields.get("title_short"))
    description = _normalize_string(fields.get("description"))
    image_url = _normalize_string(fields.get("image_url"))
    tags = fields.get("tags")
    source_license = _normalize_string(fields.get("source_license"))
    coordinates_confidence = _normalize_string(fields.get("coordinates_confidence"))
    date_start = fields.get("date_start")
    date_end = fields.get("date_end")
    latitude, latitude_is_number = _normalize_number(fields.get("latitude"))
    longitude, longitude_is_number = _normalize_number(fields.get("longitude"))
    is_active = fields.get("is_active")

    if not logical_id:
        errors.append("missing required field: id")
    if not layer_id:
        errors.append("missing required field: layer_id")
    elif layer_id not in layers_set:
        errors.append(f"invalid layer_id: {layer_id}")
    if not name_ru:
        errors.append("missing required field: name_ru")
    if not source_url:
        errors.append("missing required field: source_url")

    if not latitude_is_number:
        errors.append("latitude must be a number or null")
    if not longitude_is_number:
        errors.append("longitude must be a number or null")

    if latitude is not None and not -90 <= latitude <= 90:
        errors.append("invalid coordinates: latitude out of range [-90, 90]")
    if longitude is not None and not -180 <= longitude <= 180:
        errors.append("invalid coordinates: longitude out of range [-180, 180]")

    if not _is_boolean(is_active):
        errors.append("is_active must be boolean")
    if source_license not in ALLOWED_LICENSES:
        errors.append("source_license must be one of: CC0, CC BY, CC BY-SA, PD")
    if coordinates_confidence not in ALLOWED_COORDINATES_CONFIDENCE:
        errors.append("coordinates_confidence must be one of: exact, approximate, unknown")

    if not is_valid_iso_date(date_start):
        errors.append("date_start must be ISO date or null")
    if not is_valid_iso_date(date_end):
        errors.append("date_end must be ISO date or null")
    if isinstance(date_start, str) and isinstance(date_end, str) and is_valid_iso_date(date_start) and is_valid_iso_date(date_end):
        if date_start > date_end:
            errors.append("date_start must be less than or equal to date_end")

    if title_short is not None and len(title_short) > 120:
        errors.append("title_short must be 120 characters or less")
    if description is not None and len(description) > 2000:
        errors.append("description must be 2000 characters or less")

    if tags is not None:
        if not isinstance(tags, str):
            errors.append("tags must be a string")
        else:
            if " " in tags:
                errors.append("tags must use format 'tag1,tag2' without spaces")
            if tags.startswith(",") or tags.endswith(",") or ",," in tags:
                errors.append("tags must use format 'tag1,tag2' without empty values")

    if not description:
        warnings.append("empty description")
    if not image_url:
        warnings.append("missing image_url")
    if not _normalize_string(tags):
        warnings.append("missing tags")
    if latitude is None and longitude is None:
        warnings.append("missing coordinates")

    return {"id": feature_id, "errors": errors, "warnings": warnings}


def validate_layer(layer: Dict[str, Any]) -> Dict[str, Any]:
    fields = _extract_fields(layer)
    layer_id = _layer_identifier(layer, fields)
    errors: List[str] = []

    logical_layer_id = _normalize_string(fields.get("layer_id"))
    name_ru = _normalize_string(fields.get("name_ru"))
    color_hex = _normalize_string(fields.get("color_hex"))
    is_enabled = fields.get("is_enabled")

    if not logical_layer_id:
        errors.append("missing required field: layer_id")
    if not name_ru:
        errors.append("missing required field: name_ru")
    if not is_valid_color_hex(color_hex):
        errors.append("color_hex must match #RRGGBB")
    if not _is_boolean(is_enabled):
        errors.append("is_enabled must be boolean")

    return {"layer_id": layer_id, "errors": errors}


def build_report(features: List[Dict[str, Any]], layers: List[Dict[str, Any]]) -> Dict[str, Any]:
    critical_errors = sum(len(item["errors"]) for item in features) + sum(len(item["errors"]) for item in layers)
    warnings = sum(len(item["warnings"]) for item in features)
    return {
        "summary": {
            "total_features": len(features),
            "total_layers": len(layers),
            "critical_errors": critical_errors,
            "warnings": warnings,
        },
        "features": features,
        "layers": layers,
    }


def write_report(report: Dict[str, Any]) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    try:
        feature_records = fetch_airtable_records("Features")
        layer_records = fetch_airtable_records("Layers")
    except RuntimeError as exc:
        print(f"Audit failed: {exc}", file=sys.stderr)
        return 1

    layer_results = [validate_layer(layer) for layer in layer_records]
    valid_layer_ids = {
        _normalize_string(_extract_fields(layer).get("layer_id"))
        for layer, result in zip(layer_records, layer_results)
        if not result["errors"] and _normalize_string(_extract_fields(layer).get("layer_id"))
    }
    feature_results = [validate_feature(feature, valid_layer_ids) for feature in feature_records]

    report = build_report(feature_results, layer_results)
    write_report(report)

    summary = report["summary"]
    print(f"total features: {summary['total_features']}")
    print(f"total layers: {summary['total_layers']}")
    print(f"critical errors: {summary['critical_errors']}")
    print(f"warnings: {summary['warnings']}")

    return 1 if summary["critical_errors"] > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
