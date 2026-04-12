# Auth / Scaling Audit

## 1. Scope
Audited runtime auth/session implementation and release docs in locked scope:
- `app/auth/*`, `app/main.py`
- auth/session related settings in code (`AUTH_SECRET_KEY`, cookie settings, token TTL)
- `README.md`, `RELEASE_VERIFICATION.md`
- `docs/FINAL_RELEASE_READINESS_AUDIT.md`, `docs/CONTROLLED_RELEASE_DECISION.md`

## 2. Current model
- **Identity persistence:** users are persisted in local SQLite (`sqlite:///./artemis_auth.db`) and initialized at app startup (`init_auth_db()` in `app.main`).
- **Access token model:** short-lived JWT access token, stateless validation by signature + claims (`type=access`, `user_id`, `jti`).
- **Refresh/session model:** refresh JWT is stored in HttpOnly cookie, but validity is additionally gated by process-local in-memory map `active_refresh_tokens[jti] -> user_id`.
- **Rotation semantics:** `/auth/refresh` requires refresh cookie + in-memory `jti` presence; on success old `jti` is removed and a new one is inserted.
- **Startup/shutdown behavior:** all in-memory refresh/session state is wiped on process restart/redeploy; existing refresh cookies then fail as invalid until user logs in again.
- **Secret management behavior:** if `AUTH_SECRET_KEY` is missing, process generates ephemeral secret at boot; restart invalidates all previously issued access/refresh JWTs (signature mismatch).
- **Process-local assumptions:** auth refresh lifecycle assumes one long-lived process memory domain (or strict sticky routing to same process with unchanged memory), which is not guaranteed in horizontal scaling.

## 3. Remaining gaps
- **HIGH — Multi-instance refresh incompatibility.**
  Refresh token accepted by instance A is rejected by instance B when B lacks corresponding in-memory `jti` entry. Practical impact: random 401 refresh failures behind load balancer without strict stickiness.
- **HIGH — Restart invalidates server-side refresh state.**
  Any process restart clears `active_refresh_tokens`; active sessions lose refresh continuity and require re-login.
- **MEDIUM — Ephemeral JWT secret fallback risks broad session invalidation.**
  Missing `AUTH_SECRET_KEY` causes per-process random secret generation; restart (or multi-instance with different env) invalidates JWT verification.
- **LOW — SQLite auth DB constrains deployment topology/IO profile.**
  Acceptable for single-node controlled baseline, but limits concurrent write scaling and shared-state deployment options.

(Deliberately not inflated: no blocker-level gap for current single-node controlled release baseline.)

## 4. Final status
**ACCEPTABLE WITH EXPLICIT DEPLOYMENT CONSTRAINT**

Interpretation:
- Current model is acceptable for the existing controlled-release baseline **only under explicit single-node constraints**:
  1) one backend instance,
  2) persistent local disk for `artemis_auth.db`,
  3) stable configured `AUTH_SECRET_KEY`,
  4) restart/redeploy treated as potential session refresh reset event.
- Ephemeral `AUTH_SECRET_KEY` fallback is a development safeguard only and is not an acceptable steady-state deployment mode.
- Without these constraints, auth/session behavior becomes operationally unstable (mostly on refresh continuity).

## 5. Recommended next action
Run a **targeted auth hardening cycle before horizontal scaling** (next growth phase), focused on making refresh/session state and token verification keys deployment-stable across restarts and instances.
