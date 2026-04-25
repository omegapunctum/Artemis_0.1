# Controlled Release Decision

## 1. Current verified baseline
- Automated verification chain is currently passing in baseline runs: `python scripts/release_check.py` passes, and pytest responsibility is split across CI workflows (ETL lane + dedicated integration lanes) rather than a single all-in-one deploy/export path.
- Release gate is enforced in CI and before export in ETL workflow.
- Release gate now includes behavioral PWA verification (in addition to static/pattern checks), so private/auth bypass/no-cache semantics are verified by executable behavior in gating path.
- Governance boundary is explicit and aligned across docs/code/tests/workflows (canonical `data/*`, auxiliary `/api/map/feed`, no direct runtime publish path).
- Moderation governance baseline includes executable two-step review invariant: `pending -> review -> approved/publish-attempt`; first approve is stage advancement only, not direct publish-attempt.
- Auxiliary map runtime boundary is accepted for the current controlled baseline: `/api/map/feed` remains explicitly non-canonical and may operate as an MVP adapter/read-model route for authenticated/runtime UX flows; it is not part of the public map release contract and must not be described as production-grade public dataset access.
- Manual smoke discipline exists as documented baseline artifacts.
- Auth/session baseline is accepted for the current controlled baseline with explicit constraints: `AUTH_SECRET_KEY` must be explicitly configured for real runtime, current guarantees are baseline-capable but not fully production-hardened for multi-instance deployments, and scaling/persistence/ops hardening remains a dedicated next cycle.

Release unit (current baseline contract):
- required artifacts: `data/features.geojson`, `data/features.json`, `data/export_meta.json`, `data/rejected.json`;
- canonical public map dataset: `data/features.geojson`;
- supporting/derived artifacts: `features.json`, `export_meta.json`, `rejected.json`;
- release gate blocks if required artifacts are missing, if record counts diverge, or if warning thresholds exceed policy.

## 2. Remaining gaps and classification
- Gap: No remaining release-blocking gaps are open for entry into the controlled baseline scope after current-cycle manual evidence closure (`docs/MANUAL_SMOKE_EVIDENCE_2026-04-11.md`); architectural/scaling hardening limitations remain open outside this gate.
- Gap: `/api/map/feed` remains an auxiliary MVP adapter rather than a production-grade read model over the published dataset; this is acceptable inside the current controlled baseline envelope but remains part of later runtime/data hardening scope.
- Classification: Remaining items are **POST-BASELINE GAP** only (continuous quality hardening, not release blockers).
- Clarification: baseline decision is intentionally controlled-release and should not be read as a broad production-ready claim; production-grade multi-node envelope remains next-phase hardening scope.

Status sync after current hardening evidence (2026-04-16):
- already proven strongly: release/runtime baseline integrity, Redis auth/session continuity proof paths, consume-once refresh invalidation;
- proven at baseline level: migration discipline (minimal version registry + idempotent apply), moderation failure/retry behavior with operator runbook support;
- not yet equivalent to finished production-ready multi-node architecture: broader persistence governance, deeper environment-level scaling matrix, and observability/ops hardening tails.

## 3. Decision
**MOVE TO CONTROLLED RELEASE BASELINE**

Interpretation rule:
- this decision closes the controlled baseline gate for the current project scope;
- it does not upgrade the project to a blanket production-ready claim outside the documented baseline envelope;
- post-baseline hardening remains mandatory in later cycles.

## 4. Required next action
Start controlled release baseline execution under current governance/release gate model; track only post-baseline quality improvements in regular release cycles.
Auth/scaling hardening beyond already-proven session continuity (persistence governance + operational scaling envelope) is a dedicated next cycle, not part of current baseline execution.

## 5. Interpretation matrix: controlled baseline vs production-grade

Acceptable inside the current controlled baseline:
- static/public map delivery from published `/data/*`, with `data/features.geojson` as the canonical public dataset;
- auxiliary authenticated/runtime usage of `/api/map/feed` as a non-canonical support route for UX flows;
- moderation runtime remaining separate from public dataset overwrite path, with two-step review gate enforced before publish-attempt;
- single-instance-oriented auth/session baseline with explicit operational constraints and no production-ready multi-node claim;
- split CI/workflow model where release gate, ETL/export, and dedicated integration lanes prove different parts of the system rather than one monolithic pipeline.

Not yet to be described as production-grade:
- `/api/map/feed` as a mature public read model over the published dataset;
- multi-instance/high-availability auth/session guarantees as an already-finished operational truth;
- broader persistence governance, scaling envelope, and observability/ops hardening as completed scope;
- blanket claims that the whole runtime/deployment model is production-ready outside the controlled baseline envelope.
