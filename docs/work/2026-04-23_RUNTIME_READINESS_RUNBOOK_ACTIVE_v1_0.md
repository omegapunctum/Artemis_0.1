# ARTEMIS Runbook Light — Runtime/Release/Readiness (Baseline)

Status: working operator-facing guidance for current baseline (Phase 5 hardening start).  
Scope: quick interpretation of runtime health and release readiness signals without changing architecture or introducing a full ops manual.

## 1) How to read `GET /api/health`

Current payload fields:
- `ok`
- `status_reason`
- `recent_error_window_seconds`
- `counts.total_errors`
- `uptime`

Interpretation (baseline-level, process-local):
- `ok=true` + `status_reason=healthy_no_recent_server_errors`:
  no recent server errors in the active decay window for this process.
- `ok=false` + `status_reason=recent_server_error_within_decay_window`:
  at least one recent server error was observed in this process within the configured decay window.
- `recent_error_window_seconds`:
  the active decay window used by runtime health logic (default 120s, env-tunable).
- `counts.total_errors`:
  historical process-lifetime diagnostic counter; not a standalone outage verdict.
- `uptime`:
  process uptime context for interpreting counters/signals after restarts.

## 2) Transient vs actionable issue (baseline policy)

Treat as **transient warning** when:
- `ok=false` appears briefly and returns to `ok=true` after the decay window;
- no continuing 5xx/error logs are observed.

Treat as **actionable issue** when one or more apply:
- `ok=false` persists beyond expected decay behavior;
- repeated 5xx patterns continue in logs;
- `counts.total_errors` keeps rising together with recurring runtime errors.

## 3) Boundary reminder

`/api/health` is process-local runtime diagnostics.  
It is **not** a cluster/global readiness guarantee and **not** a production-grade SLO platform.

## 4) Release readiness vs runtime health

- Release blocking is governed by `scripts/release_check.py` (artifact integrity, contract checks, warning thresholds, behavioral checks).
- Runtime `health` reflects current process error recency/counters.
- Therefore:
  - release gate pass != guaranteed runtime incident-free operation;
  - transient runtime health warning != automatic release gate failure.

## 5) Operator checklist (quick 6-step)

1. Check `/api/health` and record `ok`, `status_reason`, `recent_error_window_seconds`, `counts.total_errors`, `uptime`.
2. If `ok=false`, wait for one decay window and re-check before declaring sustained issue.
3. Correlate with recent 5xx/runtime logs (use request IDs where available).
4. Compare `counts.total_errors` trend across checks (rising vs stable).
5. Distinguish runtime signal from release-gate signal; if release concerns exist, run/inspect `scripts/release_check.py` outputs.
6. Escalate as actionable only when signal persists or error pattern continues.

## 6) Migration preflight/apply failure guidance (baseline)

### A. If preflight check fails (`scripts/preflight_migration_check.py`)

Interpretation:
- This is a **stop-before-apply** event.
- Do not proceed to migration/apply start until the preflight error is understood.

Check first:
1. Exact failing message/code from preflight output (missing source file, extraction failure, duplicate/non-monotonic versions, DB read/connect issue).
2. Whether the failure is structural (migration declaration discipline) vs environment-specific (DB path/permissions/connectivity).
3. Whether `schema_version` absence is expected pre-init state (warning) or a different DB-read failure.

Action baseline:
- Safe retry is acceptable only after correcting an obvious transient/env issue (e.g., wrong DB path/temporary connectivity).
- If failure is structural (version collision/order/extraction contract), escalate to maintainer-level fix before any apply attempt.

### B. If migration/apply fails during startup (`init_db()` path)

Interpretation:
- This is a **fail-fast operational event** in current baseline, not silent retry semantics.

Check first:
1. Startup error context and failing migration step/version.
2. DB lock/contention signals vs migration logic/DDL error.
3. Whether another instance may have attempted concurrent first-boot apply (guardrail violation).

Action baseline:
- One controlled retry is acceptable only after confirming cause is transient and concurrency-safe.
- Escalate immediately when the same apply failure repeats or points to migration-definition/ordering issues.
- Do not normalize repeated startup apply failures as “expected transient behavior”.

---

Non-goals of this runbook:
- no observability-platform redesign;
- no new runtime endpoints/signals;
- no multi-node/global readiness model claims.
