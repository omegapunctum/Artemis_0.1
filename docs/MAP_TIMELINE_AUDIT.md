# Map Timeline Audit

## 1. Scope
- Audited timeline behavior in `js/ui.js`, map visibility coupling in `js/map.js`, timeline markup in `index.html`, and interaction-impacting timeline styles in `css/style.css`.
- Focus: startup state, map/list/counter synchronization, reset behavior, keyboard operability, dead-end states.

## 2. Confirmed working behavior
- Timeline state is a first-class filter input for visibility: `state.currentStartYear/currentEndYear` drive both feature filtering (`isFeatureVisible`) and MapLibre layer filters (`setMapLayerFilter` + `applyLayerFilters`).
- Map/list/counters remain synchronized through one `applyState()` cycle: filtered features, map source update, layer filter update, cards render, counters update.
- Timeline point/range modes are functionally wired: mode buttons update state/UI, range application normalizes values, timeline visuals and labels update consistently.
- Pointer interaction on timeline track/knobs is implemented with drag handling and snapping.

## 3. Issues

### BLOCKER
1. **Startup visibility dead-on-arrival in common datasets**
   - On timeline hydration, app starts in point mode at `years.max` (`timelinePointYear = years.max`, `currentStartYear = currentEndYear = years.max`).
   - This creates immediate empty/near-empty exploration for datasets where latest year is sparse, despite valid data in earlier periods.
   - Impact: first impression of "no data", increased abandonment risk, misleading baseline before user action.

### HIGH
2. **Keyboard dead-end on timeline value control**
   - Native `input[type="range"]` elements are removed from keyboard flow (`tabIndex = -1`) and pointer-disabled.
   - Visual knobs are `<div>` elements with no focusability/keyboard handlers.
   - Result: keyboard-only users cannot change timeline values, only mode buttons are operable.

### MEDIUM
3. **Reset coherence gap while in point mode**
   - `resetExploreConstraints()` sets start=min and end=max regardless of timeline mode.
   - In point mode, label semantics imply a single point, but reset restores a full-span range in filter state.
   - Impact: semantic mismatch and potential confusion after Reset.

### LOW
- No additional low-severity timeline defects confirmed in scoped files.

## 4. Final status
- Timeline-map coupling is technically stable and synchronized with list/counters.
- Two previously known timeline defects are confirmed as real and still present:
  - startup empty-state risk,
  - keyboard operability dead-end.
- One additional coherence issue is confirmed on Reset in point mode.

## 5. Recommended next step
**Single minimal next fix:** set startup timeline default to **full visible range** (min..max) instead of point at max year.

Why this is the highest-value minimal step:
- Maximum immediate user impact: removes "empty on load" failure mode for all users.
- Lowest implementation risk/scope: localized initialization change in timeline hydration/state defaults; no architecture changes.
- Preserves existing filter pipeline and map/list/counter synchronization.

(Keyboard operability should be the next follow-up after startup default is corrected.)
