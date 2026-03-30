#!/usr/bin/env python3
"""Import architectural objects from CSV into Airtable table "Features".

Usage:
    python scripts/import_features.py gothic.csv
"""

import argparse
import csv
import os
import re
import sys
import time
from typing import Any, Dict, Optional

import requests

BASE_ID = "appHmf8ubeUF9nfkO"
TABLE_NAME = "Features"
API_URL = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_NAME}"
ALLOWED_LICENSES = {"CC0", "CC BY", "CC BY-SA", "PD"}
DATE_RE = re.compile(r"^(\d{4}|\d{4}-\d{2}-\d{2})$")
REQUIRED_FIELDS = [
    "id",
    "layer_id",
    "layer_type",
    "name_ru",
    "name_en",
    "date_start",
    "date_end",
    "longitude",
    "latitude",
    "coordinates_confidence",
    "coordinates_source",
    "influence_radius_km",
    "sequence_order",
    "title_short",
    "description",
    "image_url",
    "source_url",
    "source_license",
    "tags",
    "is_active",
]


class ValidationError(Exception):
    """Raised when CSV row validation fails."""


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Import CSV records into Airtable Features table."
    )
    parser.add_argument("csv_file", help="Path to UTF-8 CSV file")
    return parser.parse_args()


def empty_to_none(value: Optional[str]) -> Optional[str]:
    """Normalize empty values from CSV."""
    if value is None:
        return None
    stripped = value.strip()
    if stripped == "" or stripped.lower() == "null":
        return None
    return stripped


def validate_date(value: Optional[str], field_name: str) -> None:
    """Validate date format (YYYY or YYYY-MM-DD) if value exists."""
    if value is None:
        return
    if not DATE_RE.fullmatch(value):
        raise ValidationError(f"{field_name}: неверный формат даты ({value})")


def validate_license(value: Optional[str]) -> None:
    """Validate source license if provided."""
    if value is None:
        return
    if value not in ALLOWED_LICENSES:
        raise ValidationError(
            f"source_license: недопустимое значение ({value}); разрешено: {', '.join(sorted(ALLOWED_LICENSES))}"
        )


def parse_float(value: Optional[str], field_name: str) -> Optional[float]:
    """Parse optional float field."""
    if value is None:
        return None
    try:
        return float(value)
    except ValueError as exc:
        raise ValidationError(f"{field_name}: не число ({value})") from exc


def parse_int(value: Optional[str], field_name: str) -> Optional[int]:
    """Parse optional integer field."""
    if value is None:
        return None
    try:
        return int(value)
    except ValueError as exc:
        raise ValidationError(f"{field_name}: не целое число ({value})") from exc


def parse_bool(value: Optional[str], field_name: str) -> Optional[bool]:
    """Parse optional boolean field."""
    if value is None:
        return None
    lowered = value.lower()
    if lowered in {"true", "1", "yes", "y"}:
        return True
    if lowered in {"false", "0", "no", "n"}:
        return False
    raise ValidationError(f"{field_name}: неверное булево значение ({value})")


def normalize_coordinates_confidence(value: Optional[str]) -> Optional[str]:
    """Normalize coordinates confidence enum, including legacy values."""
    if value is None:
        return None
    raw = value.strip()
    upper_raw = raw.upper()
    if upper_raw == "EXACT":
        return "exact"
    if upper_raw.startswith("APPROXIMATE"):
        return "approximate"
    if upper_raw == "CONDITIONAL":
        return "conditional"
    lowered = raw.lower()
    return lowered if lowered in {"exact", "approximate", "conditional"} else raw


def validate_coordinates(longitude: Optional[float], latitude: Optional[float]) -> None:
    """Validate coordinate constraints and null-pair rule."""
    if longitude is None and latitude is None:
        return
    if longitude is None or latitude is None:
        raise ValidationError("longitude/latitude: если координаты неизвестны, оба поля должны быть null")
    if not (-180 <= longitude <= 180):
        raise ValidationError(f"longitude: вне диапазона [-180, 180] ({longitude})")
    if not (-90 <= latitude <= 90):
        raise ValidationError(f"latitude: вне диапазона [-90, 90] ({latitude})")


def validate_and_transform(row: Dict[str, str]) -> Dict[str, Any]:
    """Validate one CSV row and convert values to Airtable-ready payload."""
    normalized: Dict[str, Optional[str]] = {
        key: empty_to_none(row.get(key)) for key in REQUIRED_FIELDS
    }

    validate_date(normalized["date_start"], "date_start")
    validate_date(normalized["date_end"], "date_end")
    validate_license(normalized["source_license"])

    longitude = parse_float(normalized["longitude"], "longitude")
    latitude = parse_float(normalized["latitude"], "latitude")
    validate_coordinates(longitude, latitude)

    influence_radius_km = parse_float(
        normalized["influence_radius_km"], "influence_radius_km"
    )
    sequence_order = parse_int(normalized["sequence_order"], "sequence_order")
    is_active = parse_bool(normalized["is_active"], "is_active")

    payload: Dict[str, Any] = {
        "id": normalized["id"],
        "layer_id": normalized["layer_id"],
        "layer_type": normalized["layer_type"],
        "name_ru": normalized["name_ru"],
        "name_en": normalized["name_en"],
        "date_start": normalized["date_start"],
        "date_end": normalized["date_end"],
        "longitude": longitude,
        "latitude": latitude,
        "coordinates_confidence": normalize_coordinates_confidence(normalized["coordinates_confidence"]),
        "coordinates_source": normalized["coordinates_source"],
        "influence_radius_km": influence_radius_km,
        "sequence_order": sequence_order,
        "title_short": normalized["title_short"],
        "description": normalized["description"],
        "image_url": normalized["image_url"],
        "source_url": normalized["source_url"],
        "source_license": normalized["source_license"],
        "tags": normalized["tags"],
        "is_active": is_active,
    }

    return {k: v for k, v in payload.items() if v is not None}


def check_csv_header(fieldnames: Optional[list]) -> None:
    """Ensure CSV columns exactly match expected Airtable schema fields."""
    if fieldnames is None:
        raise ValidationError("CSV пустой или заголовок отсутствует")

    expected = set(REQUIRED_FIELDS)
    actual = set(fieldnames)
    missing = expected - actual
    extra = actual - expected
    if missing or extra:
        parts = []
        if missing:
            parts.append(f"нет полей: {', '.join(sorted(missing))}")
        if extra:
            parts.append(f"лишние поля: {', '.join(sorted(extra))}")
        raise ValidationError("Некорректный заголовок CSV: " + "; ".join(parts))


def main() -> int:
    """Read CSV, validate rows, and upload records to Airtable."""
    args = parse_args()

    token = os.getenv("AIRTABLE_TOKEN")
    if not token:
        print("Ошибка: AIRTABLE_TOKEN не задан в переменных окружения")
        return 1

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    success_count = 0
    error_count = 0

    try:
        with open(args.csv_file, "r", encoding="utf-8", newline="") as csvfile:
            reader = csv.DictReader(csvfile, delimiter=",")
            check_csv_header(reader.fieldnames)

            session = requests.Session()

            for row in reader:
                name_ru = (row.get("name_ru") or "<без имени>").strip() or "<без имени>"
                try:
                    fields_payload = validate_and_transform(row)
                    response = session.post(
                        API_URL,
                        headers=headers,
                        json={"fields": fields_payload},
                        timeout=30,
                    )
                    if response.status_code >= 400:
                        raise RuntimeError(
                            f"Airtable API {response.status_code}: {response.text}"
                        )

                    success_count += 1
                    print(f"Загружено: {name_ru}")
                except Exception as exc:
                    error_count += 1
                    print(f"Ошибка: {name_ru} — {exc}")
                finally:
                    time.sleep(0.2)

    except FileNotFoundError:
        print(f"Ошибка: файл не найден — {args.csv_file}")
        return 1
    except ValidationError as exc:
        print(f"Ошибка: CSV — {exc}")
        return 1
    except UnicodeDecodeError:
        print("Ошибка: CSV должен быть в UTF-8")
        return 1

    print(f"Успешно: {success_count} | Ошибок: {error_count}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
  
