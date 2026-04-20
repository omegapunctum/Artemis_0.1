# ARTEMIS

**ARTEMIS** is a map-first geo-historical research platform built with **MapLibre + GeoJSON**.  
It visualizes historical events, movements, and entities in space and time, and provides backend knowledge workflows around that map surface.

In the current canonical product framing, ARTEMIS should be understood not only as a map UI, but as an **explainable spatial-temporal research workspace** centered on research slices, guided stories/courses, and transparent context handoff for future AI-assisted layers.

---

## Overview

ARTEMIS combines:
- curated historical data (Airtable → ETL → GeoJSON)
- interactive map visualization (MapLibre)
- user-generated content (UGC)
- moderation/review runtime flow
- research slices (private/owner-only knowledge snapshots)
- stories (thin orchestration over research slices)
- courses (thin orchestration over stories)
- explain-context contract payloads for `slice|story|course`
- batch public publish pipeline
- progressive web app (PWA)

The system is designed to stay **simple, modular, and documentation-governed within the current controlled baseline**, without over-claiming capabilities that are not yet production-hardened.

---

## Architecture

### Data Pipeline
- Source: Airtable (curated data)
- ETL: `scripts/export_airtable.py`
- Output:
  - `/data/features.json`
  - `/data/features.geojson`
  - `/data/layers.json`
  - `/data/export_meta.json`
  - `/data/rejected.json`
- Publication chain:
  1. Airtable `Features` records are exported by ETL
  2. validated artifacts are written to `data/*`
  3. public dataset is published only by batch overwrite through ETL/export workflow
  4. artifacts are committed to GitHub `main`
  5. GitHub Pages serves the map from published `data/*`

### Frontend
Vanilla JavaScript (no frameworks):

- `data.js` — data loading
- `map.js` — MapLibre integration
- `ui.js` — filters, list, state
- `auth.js` — authentication (in-memory tokens)
- `ui.ugc.js` — user drafts
- `ui.moderation.js` — moderation panel
- `pwa.js` — PWA logic

### Backend (canonical)
- FastAPI app entrypoint: **`app.main:app`**
- Canonical API base path: **`/api`**
- Auth API (JWT + refresh cookie)
- Drafts API (CRUD)
- Research Slices API (private/owner-only MVP: save, list, open/restore, delete)
- Stories API (thin orchestration layer over research slices: private/owner-only CRUD)
- Courses API (thin orchestration layer over stories: private/owner-only CRUD)
- Explain Context Contract API (`/api/explain-context` context payload for `slice|story|course`; AI generation/explanation mode is not part of current baseline)
- Upload API (images)
- Moderation API (review/approve/reject + Airtable staging sync; not direct public dataset publish)
- Airtable integration (staging sync for review outcomes; canonical public publish remains ETL/export workflow only)
- Upload lifecycle cleanup: orphan `/uploads/*` files are cleaned safely when drafts are updated/deleted and by periodic orphan scan.

### CI/CD
- GitHub Actions
- The workflow layer covers ETL/export, deploy/pages, release/readiness, and targeted integration checks
- `scripts/release_check.py` remains a canonical executable release/readiness entrypoint, but exact enforcement points must be read from the current workflow files rather than inferred from simplified README prose
- Dedicated integration workflows cover moderation and Redis-backed auth/session scenarios
- Data export and checked-in release artifacts must stay aligned with canonical docs and workflow semantics

---

## Key Principles

- **No localStorage / sessionStorage**
- Access token stored **in memory only**
- Refresh token stored in **httpOnly cookie**
- **GeoJSON is the single source of truth** for the map
- Canonical public dataset for map rendering: **`data/features.geojson`** (served from `/data/*`)
- `/api/map/feed` is an auxiliary, non-canonical runtime support/read-model route (not the production-default public map source)
- No direct Airtable access from frontend
- Minimal, clean code (no overengineering)

---

## Data Validation Rules

- `data/features.geojson` MUST be a valid GeoJSON `FeatureCollection` and MUST be non-empty for release.
- `coordinates_source` uses a strict ETL allowlist; unknown values are rejected with `invalid_coordinates_source`.
- Rejected records are tracked in `data/rejected.json`, and aggregate reasons are exposed via `data/export_meta.json`.

## Static Runtime Constraints

- GitHub Pages is a static runtime: it serves frontend + published `data/*` without backend API execution.
- In static mode, auth refresh flow must not spam POST refresh attempts against unavailable endpoints.
- Auth refresh guard prevents recurring `405` noise on static runtime by using controlled fallback behavior.

## Auth / Deployment Constraints (Current Baseline)

- `AUTH_SECRET_KEY` **must** be explicitly configured for real runtime; ephemeral per-process fallback is dev-only and not an acceptable deployment mode.
- Current auth/session guarantees should be treated as **baseline-capable but not fully production-hardened for multi-instance deployments**.
- The project already includes hardening work beyond the original memory-only MVP, including Redis-backed/session continuity proof paths and related integration coverage, but this should **not** be described as a finished production-ready multi-node auth/session architecture.
- Multi-instance scaling, persistence, and ops hardening remain part of the next dedicated scaling/hardening cycle.

---

## API Contract (MVP)

- Auth (`/api/auth/*`):
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
- User/session:
  - `GET /api/me`
  - `GET /api/health`
- Drafts:
  - `GET /api/drafts`
  - `GET /api/drafts/my`
  - `POST /api/drafts`
  - `PUT /api/drafts/{draft_id}`
  - `DELETE /api/drafts/{draft_id}`
- Uploads:
  - `POST /api/uploads`
    - runtime upload endpoint; use backend-returned file URL in the response as source of truth
    - request (multipart/form-data):
      - required: `file`, `license`
    - response:
      - `id` (string)
      - `url` (string)
      - `filename` (string)
      - `license` (string)
  - `POST /api/uploads/image`
    - draft-image upload endpoint bound to an existing draft
    - request (multipart/form-data):
      - required: `draft_id`, `file`
    - response:
      - `url` (string)
  - public uploaded-file serving remains static via `/uploads/*`, not via a separate documented API read route
- Moderation (`/api/moderation/*`):
  - review/approve/reject runtime routes for moderation workflow
- Research slices (`/api/research-slices/*`):
  - `POST /api/research-slices` (save slice)
  - `GET /api/research-slices` (list my slices)
  - `GET /api/research-slices/{slice_id}` (open/restore)
  - `PATCH /api/research-slices/{slice_id}`
  - `DELETE /api/research-slices/{slice_id}`
  - current baseline visibility/access model: private-only, owner-only
- Stories (`/api/stories/*`):
  - `POST /api/stories`
  - `GET /api/stories`
  - `GET /api/stories/{story_id}`
  - `PATCH /api/stories/{story_id}`
  - `DELETE /api/stories/{story_id}`
  - current baseline model: thin orchestration layer, private-only, owner-only
- Courses (`/api/courses/*`):
  - `POST /api/courses`
  - `GET /api/courses`
  - `GET /api/courses/{course_id}`
  - `DELETE /api/courses/{course_id}`
  - current baseline model: thin orchestration layer, private-only, owner-only
- Explain Context Contract (`/api/explain-context`):
  - `POST /api/explain-context` with `scope ∈ {slice, story, course}`
  - returns normalized context payload for explainability/runtime handoff
  - current baseline is context contract only; AI generation/explanation runtime is not implemented
- Auxiliary runtime feed:
  - `GET /api/map/feed` (auxiliary, non-canonical runtime support/read-model endpoint for UI; canonical public map source remains `data/features.geojson`)
- Canonical public map data path:
  - `/data/*` (exported ETL datasets; `data/features.geojson` is the production-default canonical public source)

---

## Development

### Requirements
- Python 3.11+
- FastAPI backend
- Dependencies are pinned in `requirements.txt` for reproducible local/CI/prod environments.

Install dependencies:
```bash
pip install -r requirements.txt
```

### Run backend
```bash
uvicorn app.main:app --reload --port 8001
```

### Run frontend
```bash
python -m http.server 8000
```

By default frontend tries `window.ARTEMIS_API_BASE`/meta override, then `/api`.

### Import / Export datasets (local ETL input/output)
Without direct Airtable writes, you can import prepared CSV/GeoJSON datasets into local `data/*`
using the same validation contract as ETL:

```bash
python scripts/import_features.py import --input ./dataset.csv --format csv --layers data/layers.json --out-dir data
python scripts/import_features.py import --input ./dataset.geojson --format geojson --layers data/layers.json --out-dir data
```

Import output:
- `data/features.json` (validated records)
- `data/features.geojson` (validated RFC 7946 FeatureCollection)
- `data/rejected.json` (invalid records + reasons)

Export validated dataset for external usage:

```bash
python scripts/import_features.py export --geojson-in data/features.geojson --out-dir data/export
```

Optional raw export (if `data/features.json` exists):

```bash
python scripts/import_features.py export --geojson-in data/features.geojson --raw-json-in data/features.json --include-raw --out-dir data/export
```

## Documentation System

Repository documentation is organized into five pragmatic layers:

- **canonical** — source of truth documents that define current project rules and structure.
- **work** — active working documents for current implementation tracks.
- **audits** — verification, audit, and validation outputs.
- **archive** — historical snapshots kept for traceability.
- **reference** — diagnostic and supporting materials that are useful for analysis but are not normative.

Documentation governance is defined in `docs/DOCUMENTATION_SYSTEM.md`.

Canonical docs are maintained in root `README.md` and in `docs/` (including `docs/ARTEMIS_CONCEPT.md`, `docs/ARTEMIS_MASTER_PROMPT.md`, `docs/ARTEMIS_PRODUCT_SCOPE.md`, `docs/CONTROLLED_RELEASE_DECISION.md`, `docs/DATA_CONTRACT.md`, `docs/DOCUMENTATION_SYSTEM.md`, `docs/PRIORITIES.md`, `docs/PROJECT_PHASES.md`, `docs/PROJECT_STRUCTURE.md`).

Working strategy docs live in `docs/work/` (including `docs/work/ARTEMIS_AI_STRATEGY_v1_0.md`). UI/UX working specs live in `docs/work/uiux/`; `docs/work/uiux/ARTEMIS_UI_UX_SYSTEM.md` is the primary UI/UX working spec, and `docs/work/uiux/ARTEMIS_UI_UX_COMPONENT_MAP.md` is the system-level working implementation map derived from that spec.

Historical documents live in `docs/archive/`, and diagnostic/reference documents live in `docs/reference/`; for example, `docs/reference/Artemis_UI_UX_Report.md` is diagnostic/reference material and **not** the primary UI/UX specification.
