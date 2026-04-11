# DATA LAYER WARNING AUDIT (point-in-time)

Дата аудита: 2026-04-11 (UTC)

## 1) Warning generation map (`scripts/export_airtable.py`)

Текущие reason-коды warning и точки генерации:

- `legacy_fallback_longitude` — в `map_record()`, fallback `longitude_num -> longitude` через `append_warning_once(...)`.
- `legacy_fallback_latitude` — в `map_record()`, fallback `latitude_num -> latitude` через `append_warning_once(...)`.
- `legacy_fallback_source_license` — в `map_record()`, fallback `source_license_enum -> source_license`.
- `legacy_fallback_coordinates_confidence` — в `map_record()`, fallback `coordinates_confidence_enum -> coordinates_confidence`.
- `legacy_string_layer_id` — в `map_record()`, когда `layer_id` приходит строкой вместо linked record (legacy format).

Примечание: категоризация warnings в `aggregate_warning_categories()` основана на префиксе `legacy_`: такие warning считаются `expected_fallback`; остальные считаются `data_quality`.

## 2) Snapshot по артефактам экспорта

Проверены:
- `data/export_meta.json`
- `data/validation_report.json`
- `data/rejected.json`

Фактическое состояние:

- Warnings всего: `4`
- `warning_stats`:
  - `legacy_fallback_longitude`: 1
  - `legacy_fallback_latitude`: 1
  - `legacy_fallback_source_license`: 1
  - `legacy_fallback_coordinates_confidence`: 1
- `warning_categories`: `{ "expected_fallback": 4 }`
- `data_quality` warnings: `0`
- `errors_count`: `0`
- `rejected.json`: пустой список

## 3) Classification (expected vs data-quality)

### expected_fallback (оставить явными)

- `legacy_fallback_longitude`
- `legacy_fallback_latitude`
- `legacy_fallback_source_license`
- `legacy_fallback_coordinates_confidence`
- `legacy_string_layer_id` (в текущем снапшоте не сработал, но по смыслу тот же класс)

Обоснование: это наблюдаемые fallback-пути совместимости (legacy schema), а не дефект данных как таковой.

### data_quality (в текущем снапшоте отсутствуют)

Правило из кода: любой warning reason без префикса `legacy_` пойдёт в `data_quality`.
Сейчас таких reason в artifacts нет.

## 4) Что убрать нормализацией vs что оставить

Можно убрать нормализацией источника (schema hygiene в Airtable):
- миграция записей на `*_enum` и `*_num` поля без reliance на legacy fallback.
- унификация `layer_id` как linked-record (чтобы не появлялся `legacy_string_layer_id`).

Должно остаться явным (даже после нормализации):
- signal о fallback-пути, пока legacy-поля поддерживаются в коде для backward compatibility.

## 5) Audit conclusion

Warning-noise после стабилизации уже низкий и контролируемый: в текущем запуске остались только expected fallback warnings, data-quality warnings не наблюдаются.
