# Map Ribbon Audit

## 1. Scope
- Audited runtime ribbon/list discoverability behavior in map exploration.
- Code reviewed: `js/ui.js`, `index.html`, and ribbon-related styles in `css/style.css`.
- Out of scope: implementation changes, backend/ETL, map engine, and non-ribbon UX domains.

## 2. Confirmed working behavior
- Ribbon renders from the current filtered feature set (`state.filteredFeatures`) and remains synchronized with filters/search/timeline because those constraints are applied before ribbon render.
- Top counters and filter panel summary expose full visible dataset counts (`filteredFeatures.length` and map visible count), independent of ribbon card count.
- Search dropdown has explicit truncation messaging for search results (separate surface), which helps avoid ambiguity there.

## 3. Issues
- **HIGH** — Ribbon silently truncates to first **80** objects.
  - Confirmed in render path: both card cache key and card rendering slice to `0..80`.
  - No explicit truncation indicator is added in ribbon state/message when `filteredFeatures.length > 80`.
  - Result: user can misread ribbon as full visible set, while actual visible dataset (and map/counters) can be larger.

- **MEDIUM** — Ribbon state message is factually misleading in truncated scenarios.
  - Current state label says `"N objects в ленте и на карте"` where `N = filteredFeatures.length`.
  - When `N > 80`, this implies all `N` are in ribbon though only first 80 are rendered.

- **LOW** — Discoverability of “more than shown” depends on cross-surface inference.
  - User can infer mismatch only by comparing ribbon visually with top counters/filter summary.
  - This is real but secondary because data is technically visible elsewhere.

No BLOCKER issues found.

## 4. Final status
- Core ribbon interaction and integration with active constraints are stable.
- One unresolved discoverability gap remains: explicit communication of ribbon truncation at 80.

## 5. Recommended next step
Implement **one minimal fix**: add an explicit ribbon truncation note in `cards-state` when `filteredFeatures.length > 80`, e.g.:
- `Показаны первые 80 из N объектов`.

This single change addresses the discoverability gap without changing data flow, map rendering, filter logic, or ribbon architecture.
