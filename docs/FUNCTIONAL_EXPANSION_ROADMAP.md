# Functional Expansion Roadmap

## 1. Current baseline
- Controlled-release baseline is stabilized across data/release/UI-UX and verified by release gate + tests.
- Core runtime already contains foundations for expansion:
  - map exploration primitives (search, filters, layers, timeline, map theme, display mode, cards/detail panel),
  - courses/live UI state and loaders,
  - import/export scripts and data contract,
  - authenticated user contribution flow (drafts/uploads/moderation).
- Auth/session remains an explicit single-node deployment constraint; multi-instance behavior is not a current baseline target.

## 2. Candidate tracks

### Track A — Courses / educational flow completion
- **User value:** high (guided learning path over existing map data; strong retention/education fit).
- **Architectural fit:** high (courses panel/buttons, state model, and `courses.json` loading already exist).
- **Implementation risk:** medium (mostly frontend product logic + content contract hardening; low backend coupling).
- **Dependency on unresolved constraints:** low (not blocked by current auth/scaling constraint if kept read-focused).

### Track B — Richer map exploration (filters/layers/timeline ergonomics)
- **User value:** high (immediate discovery quality improvement for all users).
- **Architectural fit:** high (existing filter/layer/timeline/search/map APIs are stable and extensible).
- **Implementation risk:** low-to-medium (incremental UI/data-shaping changes; no architecture rewrite needed).
- **Dependency on unresolved constraints:** low (works in current single-node baseline).

### Track C — Import/export operator utilities (quality-of-life)
- **User value:** medium (operator productivity, better release throughput).
- **Architectural fit:** high (current ETL/import/export scripts and release checks are already canonical).
- **Implementation risk:** low (CLI/workflow-adjacent improvements with bounded blast radius).
- **Dependency on unresolved constraints:** low (independent from auth/session scaling limitations).

### Track D — Analytics / interpretive overlays (time aggregations, thematic summaries)
- **User value:** medium-to-high (better interpretation, not just browsing).
- **Architectural fit:** medium (frontend has preliminary aggregation primitives; backend feed is auxiliary and should stay non-canonical).
- **Implementation risk:** medium-to-high (data semantics, UX clarity, performance tuning scope).
- **Dependency on unresolved constraints:** medium (can start in static/data mode, but richer personalized analytics may later intersect auth/session limits).

## 3. Recommended order
1. **First:** Track A (Courses / educational flow completion).
2. **Second:** Track B (Richer map exploration).
3. **Third:** Track C (Import/export operator utilities).
4. **Later:** Track D (Analytics/overlays) after A+B stabilize and scope/perf envelope is explicit.

**Do not start yet:** any functionality that assumes multi-instance auth/session runtime guarantees before dedicated auth hardening cycle.

## 4. Risks / dependencies
- Primary systemic dependency: auth/session remains single-node constrained; roadmap items should avoid introducing horizontal-session coupling assumptions.
- Keep governance invariant unchanged: `data/*` remains canonical public map source; runtime `/api/map/feed` remains auxiliary/internal.
- Preserve release discipline: each track should ship through the existing `audit -> patch -> verification` loop.

## 5. Next implementation target
**Track A — Courses / educational flow completion** (single target for next delivery cycle).
