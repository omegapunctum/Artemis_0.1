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

Clarification (raw/source diagnostics vs release-quality signals):
- `data/features.json` is a raw/supporting source artifact and may include source-side diagnostic metadata from Airtable;
- raw diagnostic metadata (including `fields.id_status`) is not release-gating by itself;
- release warnings/rejections are derived from ETL validation/export pipeline signals (e.g., `export_meta.json` + `rejected.json`), not from raw source metadata alone.

## Runtime Map Feed Boundary (Current Baseline)

Boundary rules:
- canonical public map dataset remains `data/features.geojson`;
- `GET /api/map/feed` is an auxiliary, non-canonical runtime support/read-model endpoint for authenticated UI/runtime scenarios;
- current baseline implementation of `/api/map/feed` must be treated as a temporary MVP adapter, not as a production-grade public read model over the published dataset;
- `/api/map/feed` currently serves internal runtime feed semantics without transitional/mock-backed place payloads; any future entity expansion must remain internal/non-canonical and be introduced explicitly;
- frontend main map bootstrap path must keep `data/features.geojson` as default source; `/api/map/feed` may be used only as an explicit internal runtime toggle/path;
- runtime consumers must not treat `/api/map/feed` as a replacement for published `/data/*` artifacts or as a stable public export contract.

## Upload Runtime / File-Serving Boundary (Current Baseline)

Boundary rules:
- upload API surface is runtime-only and consists of `POST /api/uploads` and `POST /api/uploads/image`;
- public serving of uploaded files is static via `/uploads/*` mount;
- `/uploads/*` serving for user-uploaded files includes explicit baseline response-header policy at runtime;
- baseline serving-policy headers for `/uploads/*` are `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`, and `Cache-Control: no-store`;
- upload acceptance validates declared upload metadata (`content_type`) and applies server-side magic-bytes signature checks for supported image types (`PNG`, `JPEG/JPG`, `WEBP`);
- when declared type is allowlisted but the detected file signature does not match that declared type, the upload is rejected;
- upload acceptance (runtime API) and uploaded-file delivery (static path) are separate contract surfaces and must not be conflated;
- there is no contract route `GET /api/uploads/{filename}` in the current baseline;
- frontend must treat backend-returned `url` from upload responses as source of truth for file access paths.
