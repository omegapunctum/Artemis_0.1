# ARTEMIS

**ARTEMIS** is an interactive geo-historical map built with **MapLibre + GeoJSON**.  
It visualizes historical events, movements, and entities in space and time.

---

## Overview

ARTEMIS combines:
- curated historical data (Airtable → ETL → GeoJSON)
- interactive map visualization (MapLibre)
- user-generated content (UGC)
- moderation/review runtime flow
- batch public publish pipeline
- progressive web app (PWA)

The system is designed to be **simple, modular, and scalable**.

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
- Upload API (images)
- Moderation API (review/approve/reject + Airtable staging sync; not direct public dataset publish)
- Airtable integration (staging sync for review outcomes; canonical public publish remains ETL/export workflow only)
- Upload lifecycle cleanup: orphan `/uploads/*` files are cleaned safely when drafts are updated/deleted and by periodic orphan scan.

### CI/CD
- GitHub Actions
- ETL validation
- Data export

---

## Key Principles

- **No localStorage / sessionStorage**
- Access token stored **in memory only**
- Refresh token stored in **httpOnly cookie**
- **GeoJSON is the single source of truth** for the map
- Canonical public dataset for map rendering: **`data/features.geojson`** (served from `/data/*`)
- `/api/map/feed` is an auxiliary internal/read-only runtime route, not the production-default public map source
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

- Controlled-release baseline auth/session mode is **single-node backend only**.
- `AUTH_SECRET_KEY` **must** be explicitly configured for real runtime; ephemeral per-process fallback is dev-only and not an acceptable deployment mode.
- Refresh/session continuity depends on process-local in-memory state; restart/redeploy may invalidate refresh continuity and require re-login.
- Multi-instance auth/session behavior is **not currently supported**.
- Auth/scaling hardening for multi-instance support is planned as a dedicated future cycle.

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
  - `GET|POST|PUT|DELETE /api/drafts`
- Uploads:
  - `POST /api/uploads`
  - `GET /api/uploads/{filename}`
- Moderation (`/api/moderation/*`):
  - review/approve/reject runtime routes for moderation workflow
- Auxiliary runtime feed:
  - `GET /api/map/feed` (auxiliary/internal read-only route)
- Canonical public map data path:
  - `/data/*` (with `data/features.geojson` as production-default public source)

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

Repository documentation is organized into four pragmatic layers:

- **canonical** — source of truth documents that define current project rules and structure.
- **work** — active working documents for current implementation tracks.
- **audits** — verification, audit, and validation outputs.
- **archive** — historical snapshots and superseded materials kept for traceability.

Canonical docs live in `docs/`, while supporting layers are in `docs/work/`, `docs/audits/`, and `docs/archive/`.
