# Release Verification

## Canonical backend entrypoint
- `app.main:app`

## Manual smoke checks
- ✅ ETL self-check executed in current verification cycle: `python scripts/export_airtable.py --self-test`.
- ⚠️ Full backend/API smoke (`/api/health`, `/api/me`, auth маршруты) **not re-verified in this update**.
- ⚠️ Full UI/manual browser smoke **not re-verified in this update**.

## Known risks
- Airtable remains an external dependency: network/rate-limit failures can still affect export/publish runs.
- Current verification confirms ETL contract checks covered by `scripts/export_airtable.py --self-test`, but does not replace full end-to-end API/UI smoke before production release.

## Legacy parts
- Historical MVP verification notes are kept in `RELEASE_VERIFICATION_MVP_2026-03-30.md` and may contain checks that were not re-run in the current cycle.
