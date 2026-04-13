# ARTEMIS Data Contract

## coordinates_source

Allowed values (curated Airtable enum + ETL allowlist):

- UNESCO
- Britannica
- Official Site
- Vatican
- Pompidou Site
- Wikipedia
- PBS
- Dezeen
- Saylor

## Synchronization Rule

Airtable enum **MUST** be synchronized with ETL allowlist.

Adding a new `coordinates_source` value in Airtable requires updating ETL allowlist/normalization first; otherwise records with the new value will be rejected as `invalid_coordinates_source`.

## Release Artifact Contract (Current Baseline)

Required release artifacts:
- `data/features.geojson`
- `data/features.json`
- `data/export_meta.json`
- `data/rejected.json`

Contract rules:
- canonical public map dataset is `data/features.geojson`;
- `features.json`, `export_meta.json`, and `rejected.json` are supporting/derived release artifacts;
- `records_exported` in `export_meta.json` must match record counts in both `features.geojson` and `features.json`;
- release gate blocks on missing required artifacts, mismatched record counts, invalid warning categories, or warning threshold violations.
