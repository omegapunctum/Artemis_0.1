# Data Layer Final Audit

## 1. Scope
Audit covered:
- `scripts/export_airtable.py`
- `scripts/release_check.py`
- `tests/test_release_check.py`
- `data/export_meta.json`
- `data/validation_report.json`
- `data/rejected.json`
- `docs/DATA_LAYER_WARNING_AUDIT.md`

## 2. Confirmed improvements
- Warning reasons are stable and categorized by deterministic logic (`legacy_*` -> `expected_fallback`, other -> `data_quality`).
- Fallback semantics are narrowed: canonical-first, legacy-second, with explicit transitional handling retained for `legacy_string_layer_id`.
- Reject boundary is clearer for geometry (`missing_geometry`, `missing_geometry_coordinate`, `invalid_coordinates`).
- Export counters/stat logic is aligned in code (`total/exported/geojson/rejected` derived once and reused).
- Release gate now enforces warning thresholds:
  - `MAX_EXPECTED_FALLBACK_WARNINGS = 10`
  - `MAX_DATA_QUALITY_WARNINGS = 0`
  with explicit FAIL messages and test coverage.

## 3. Remaining gaps
- **LOW** — Legacy transitional paths still exist by design (`legacy_string_layer_id` and legacy fallbacks), so full schema de-legacy is not complete yet.
- **LOW** — Repository snapshot artifacts (`data/export_meta.json`) may lag the latest exporter schema until next non-dry-run refresh (gate remains backward-compatible via default `data_quality=0` when key is absent).
- **LOW** — Warning thresholds are static policy constants; acceptable for current gate, but should be periodically revalidated against production trend.

No MEDIUM/HIGH gaps evidenced in current state.

## 4. Final status
**STABLE WITH MINOR GAPS**

Rationale: data-layer quality controls are now explicit, test-covered, and release-gated; remaining risks are low-severity transitional/debt items and do not currently threaten controlled release quality.

## 5. Recommended next action
1. Refresh real (non-dry-run) export artifacts so `export_meta.json` fully reflects current deterministic fields (`warning_categories` full keys, `records_rejected`).
2. Plan deprecation window for remaining legacy field dependence (starting with `legacy_string_layer_id` source cleanup).
3. Revisit threshold constants after collecting trend history for several release cycles.
