# Controlled Release Decision

## 1. Current verified baseline
- Automated verification chain is currently passing in baseline runs: `python scripts/release_check.py` and `python -m pytest` pass, with intermittent backend/integration pytest instability tracked as a post-baseline hardening signal.
- Release gate is enforced in CI and before export in ETL workflow.
- Release gate now includes behavioral PWA verification (in addition to static/pattern checks), so private/auth bypass/no-cache semantics are verified by executable behavior in gating path.
- Governance boundary is explicit and aligned across docs/code/tests/workflows (canonical `data/*`, auxiliary `/api/map/feed`, no direct runtime publish path).
- Manual smoke discipline exists as documented baseline artifacts.
- Auth/session baseline is accepted with explicit deployment constraint: single-node backend mode, explicitly configured `AUTH_SECRET_KEY`, and no multi-instance support in current cycle.

Release unit (current baseline contract):
- required artifacts: `data/features.geojson`, `data/features.json`, `data/export_meta.json`, `data/rejected.json`;
- canonical public map dataset: `data/features.geojson`;
- supporting/derived artifacts: `features.json`, `export_meta.json`, `rejected.json`;
- release gate blocks if required artifacts are missing, if record counts diverge, or if warning thresholds exceed policy.

## 2. Remaining gaps and classification
- Gap: No remaining release-blocking gaps are open for entry into the controlled baseline scope after current-cycle manual evidence closure (`docs/MANUAL_SMOKE_EVIDENCE_2026-04-11.md`); architectural/scaling hardening limitations remain open outside this gate.
- Classification: Remaining items are **POST-BASELINE GAP** only (continuous quality hardening, not release blockers).
- Clarification: baseline decision is intentionally controlled-release (not a broad production-ready claim); production-grade multi-node envelope remains next-phase hardening scope.

Status sync after current hardening evidence (2026-04-16):
- already proven strongly: release/runtime baseline integrity, Redis auth/session continuity proofs (single-instance + multi-instance + restart), consume-once refresh invalidation;
- proven at baseline level: migration discipline (minimal version registry + idempotent apply), moderation failure/retry behavior with operator runbook support;
- still remaining: production-grade persistence model/governance depth, broader environment-level scaling matrix, and deeper observability/ops hardening tails.

## 3. Decision
**MOVE TO CONTROLLED RELEASE BASELINE**

## 4. Required next action
Start controlled release baseline execution under current governance/release gate model; track only post-baseline quality improvements in regular release cycles.
Auth/scaling hardening beyond already-proven session continuity (persistence governance + operational scaling envelope) is a dedicated next cycle, not part of current baseline execution.
