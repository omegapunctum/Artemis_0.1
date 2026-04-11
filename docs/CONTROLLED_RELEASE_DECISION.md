# Controlled Release Decision

## 1. Current verified baseline
- Automated verification chain is stable: `python scripts/release_check.py` and `python -m pytest` pass.
- Release gate is enforced in CI and before export in ETL workflow.
- Governance boundary is explicit and aligned across docs/code/tests/workflows (canonical `data/*`, auxiliary `/api/map/feed`, no direct runtime publish path).
- Manual smoke discipline exists as documented baseline artifacts.
- Auth/session baseline is accepted with explicit deployment constraint: single-node backend mode, explicitly configured `AUTH_SECRET_KEY`, and no multi-instance support in current cycle.

## 2. Remaining gaps and classification
- Gap: No remaining release-blocking gaps are open after current-cycle manual evidence closure (`docs/MANUAL_SMOKE_EVIDENCE_2026-04-11.md`).
- Classification: Remaining items are **POST-BASELINE GAP** only (continuous quality hardening, not release blockers).

## 3. Decision
**MOVE TO CONTROLLED RELEASE BASELINE**

## 4. Required next action
Start controlled release baseline execution under current governance/release gate model; track only post-baseline quality improvements in regular release cycles.
Auth/scaling hardening for multi-instance-safe session continuity is a dedicated next cycle, not part of current baseline execution.
