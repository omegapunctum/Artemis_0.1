# Manual Smoke Evidence — 2026-04-11

## 1. Scope
Release-critical manual verification for Artemis runtime/UI before controlled release baseline decision.

## 2. Environment
- Runtime: production-default static map flow
- Canonical dataset path: `/data/*` (primary `data/features.geojson`)
- Auxiliary runtime route under observation: `/api/map/feed`

## 3. Results by block

### Map / Data
- Map load and main explore render — **PASS**
- Canonical `/data/*` (primary `data/features.geojson`) — **PASS**
- No production-default fallback/substitution to `/api/map/feed` — **PASS**

### UI / Interaction
- Object interaction + map/list/detail flow — **PASS**
- Preview → full detail panel — **PASS**
- No blocking UI bug — **PASS**

### System states
- Loading behavior — **PASS**
- Error/recovery (retry path) — **PASS**

### Auth / Session
- Baseline auth/session runtime stability — **PASS**

### PWA
- Installability/basic runtime scope status — **PASS**

## 4. Summary
- Total checks: **10**
- Passed: **10**
- Failed: **0**

## 5. Final manual status
**PASS**

## 6. Decision impact
- All release-critical manual checks covered.
- No ambiguous results.
- This artifact closes the manual-evidence gap for controlled release baseline decision.
