# Map Timeline Stabilization Audit

## 1. Scope
- Re-audit of timeline behavior after two targeted fixes: startup default and reset semantics.
- Files inspected: `js/ui.js`, `js/map.js`, `index.html`, `css/style.css`, `docs/MAP_TIMELINE_AUDIT.md`.
- Focus only on real interaction/state gaps in current runtime flow.

## 2. Resolved issues
1. **Startup empty-state risk** — **RESOLVED**
   - Startup state now initializes timeline in `range` mode and sets visible years to full bounds (`min..max`) during hydration.
   - This removes previous `point@max` first-load narrowing.

2. **Reset semantic gap** — **RESOLVED**
   - Reset now restores canonical default semantics explicitly:
     - `timelineMode = range`
     - `timelineRangeStart/timelineRangeEnd = min/max`
     - `currentStartYear/currentEndYear = min/max`
   - Timeline UI sync is triggered in reset path, so label/controls align with state.

## 3. Remaining gaps
1. **Keyboard operability dead-end on value control** — **HIGH** — **REMAINS**
   - Range inputs are removed from keyboard flow (`tabIndex = -1`) and pointer-disabled.
   - Visible knobs are non-focusable `<div>` handles without keyboard handlers.
   - Outcome: keyboard users can switch mode buttons, but cannot change timeline values.

No additional real timeline gaps were confirmed in scope.

## 4. Final status
**STABLE WITH MINOR GAPS**

Rationale:
- Core timeline state flow is now coherent for startup and reset.
- Map/list/counters synchronization remains intact.
- One non-architectural but important accessibility/operability gap remains (keyboard value control).

## 5. Recommended next action
- Implement a **single targeted keyboard operability fix** for timeline value adjustment (preserving current UI model, no redesign).
- Keep map/list/counters pipeline unchanged; scope only focusability + key handling path for timeline value controls.
