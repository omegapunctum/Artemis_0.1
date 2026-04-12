# Release Verification

## Canonical backend entrypoint
- `app.main:app`

## Governance boundary (canonical)
- Canonical public dataset for map rendering is published `data/*`, with `data/features.geojson` as primary map source.
- `/api/map/feed` is auxiliary internal/read-only runtime route and is not a direct public publish path.
- Moderation/runtime approve-review flow updates review/staging state and does not overwrite canonical public dataset directly.
- Public dataset publish happens only as batch overwrite via ETL/export workflow.

## Automated verification status
- ✅ Release gate executable checks pass: `python scripts/release_check.py`.
- ✅ Full automated test suite passes: `python -m pytest`.
- ✅ Export workflow enforces release gate before export/publish.
- ✅ ETL self-check executed in current verification cycle: `python scripts/export_airtable.py --self-test`.
- ✅ PWA gate verifies private/auth semantics by network-only bypass (not by naive route-string absence).

## Manual smoke status
- ✅ Manual smoke artifacts exist and remain reference baseline:
  - `docs/UI_MAINSCREEN_FINAL_SMOKE_2026-04-02.md`
  - `docs/UI_UX_TARGETED_SMOKE_2026-04-02.md`
  - `UI_UX_READINESS_CHECKLIST.md`
- ✅ Current-cycle manual smoke evidence recorded: `docs/MANUAL_SMOKE_EVIDENCE_2026-04-11.md`.
- ✅ Backend/API manual sanity baseline confirmed for release cycle.
- ✅ Browser/runtime manual smoke baseline confirmed for release cycle.
- ✅ PWA installability/basic runtime scope baseline confirmed for release cycle.

## Unresolved manual gaps
- No unresolved manual smoke gaps for current controlled release cycle.

## Known risks
- Airtable remains an external dependency: network/rate-limit failures can still affect export/publish runs.
- Current automated verification does not replace current-cycle manual smoke evidence for controlled release confidence.
- Auth/session baseline is constrained to single-node deployment; multi-instance refresh/session behavior is not supported in current baseline.
- `AUTH_SECRET_KEY` must be explicitly configured in real runtime; ephemeral per-process secret fallback is not an accepted deployment mode.
- Backend restart/redeploy may break refresh continuity due to process-local refresh/session state.

## Release conclusion
- Current state: **MOVE TO CONTROLLED RELEASE BASELINE**.
- Automated and manual baselines are both explicitly confirmed for this cycle.
- Operational rule for this baseline: run auth/session in explicit single-node mode until dedicated auth/scaling hardening cycle is completed.

## Legacy parts
- Historical MVP verification notes are kept in `RELEASE_VERIFICATION_MVP_2026-03-30.md` and may contain checks that were not re-run in the current cycle.
