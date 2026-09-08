# ARTEMIS — Temporal Map / Life Path v1.2

## Status

- Type: active product interaction contract for the Temporal Map time/path loop.
- Updated: 2026-09-08.
- Owner: issue `#355`.
- Implemented sequence: PR `#395` established the calendar life-path loop; PR `#396` implemented the first feedback correction; PR `#406` expanded the runtime proof to 11 coarse Presences across 1452–1519; PRs `#411–#412` completed the accepted bounded UX correction.
- Current lifecycle: Gate C remains `FREEZE`; Gate D is `COMPLETED / ADVANCE_TO_GATE_E`; PR `#415` prepared the bounded Gate E evidence protocol. E1 observations are not yet collected.
- Current implementation: one bottom timeline controls the published #412 runtime. The multi-scale Global Timeline + Focus Timeline direction in section 11 is an accepted future design decision, **not implemented and not authorized as current Gate E work**.

## 1. Product loop

The default experience answers one sequence of questions:

`object → time → path → place → information`

Leonardo is the selected object in the current proof. Map and timeline are synchronized controls over one Explorer State:

- `Range` selects a calendar interval and shows every documented Presence whose temporal extent overlaps that interval;
- `Scrub` keeps a selected build origin and one current-time cursor, accumulating documented Presences as the cursor moves forward;
- selecting a visible Presence opens concise place/date/activity information;
- source, locator and uncertainty remain available under progressive disclosure.

The timeline is a calendar scale, not an ordinal list of stops. Source-supported day/month precision may coexist with a coarser year-scale display. Whole-life and future multi-domain coverage must refine temporal detail without requiring a second historical time model.

## 2. Current interaction specification

The accepted published implementation through PR `#412` preserves the following interaction baseline.

### Range

- one full-width bottom calendar track in the current runtime;
- two handles: start and end;
- temporal overlap determines visible Presences;
- URL state uses stable calendar values and Presence identity;
- Range represents an interval, not an accumulated path mode.

### Scrub

- one full-width bottom calendar track in the current runtime;
- one current-time cursor;
- a separate `Build from` / origin value establishes where accumulation begins;
- visible Presences accumulate from that origin through the current cursor;
- Scrub does not become a disguised two-ended range.

### Selection and detail

- timeline, map, selected Presence and URL share one Explorer State;
- one marker click selects the Presence and opens a compact map popup;
- a single click must not move the camera;
- explicit `Open details` / further action may open the right detail drawer;
- double-click may explicitly focus/zoom the selected place;
- selection state and camera state remain separate concepts.

### Visual hierarchy

- time navigation remains the primary bottom-dock instrument;
- concise object/place meaning comes before diagnostic/source detail;
- sources and uncertainty use progressive disclosure rather than occupying the main canvas by default;
- dashed visible links express chronology only and are explicitly not travel-route geometry;
- advanced layer combinations and renderer diagnostics may remain underlying evidence, not default primary controls.

## 3. Canonical model boundary

`Trajectory` is the single semantic authority for the ordered life path. It binds `subject_ref` and contains ordered `presence`, `movement` or `inferred_gap` segments. Presentation configuration may select existing segments and supply stable UI identities, but it cannot create a second path model.

`Range` and `Scrub` are interaction modes over the same temporal/Trajectory semantics. They are not separate domain entities and do not define separate historical truth.

**There is one canonical temporal selection/query state.** Additional temporal UI controls may later provide different temporal scales or viewports, but they must remain synchronized projections/controls of that same state rather than introducing independent `global_time` and `focus_time` truths.

Time precision, spatial precision, route status and uncertainty are data. Display scale and temporal viewport are presentation/query-view concerns and must not strengthen source-supported precision.

A category is a graph/query grouping over objects and relations; it is not automatically a GIS Layer or checkbox.

## 4. Line and route semantics

The life path is a primary visual object, but a connector is not automatically a historical route.

- documented `movement` geometry may be rendered only when evidence authorizes it;
- `inferred_gap` keeps `route_geometry=null` and `route_status=unknown_route`;
- the UI may derive a thin dashed connector between two visible Presence anchors solely to express chronology;
- that connector is presentation-only, has no World Model identity and must be distinguishable from historical route geometry;
- smooth interpolation, shortest-path drawing or visually plausible roads must not silently become historical assertions.

Future refinement may add intermediate Presences or authorized movement geometry while preserving stable identities, earlier evidence and uncertainty history.

## 5. Current bounded corpus

The published M5 proof contains **11 coarse Presence anchors across 1452–1519**, organized into six periods:

- seven reviewed major-life Presence anchors from the PR #400 package;
- four source-bound Romagna Presences:
  - Rimini — 1502-08-08;
  - Cesena — 1502-08-10;
  - Cesenatico — 1502-09-06;
  - Imola — source-native autumn 1502 range.

This is an **interaction scaffold**, not Leonardo's complete biography or continuous residence history.

Present-day settlement point coordinates are reference anchors, not exact historical positions. Duration at every place and inter-place travel routes remain unknown where unsupported. A month/year/range Presence must not be rendered as a more exact instant simply because a more detailed timeline scale exists.

No change to this interaction contract authorizes additional Leonardo data by itself.

## 6. Implemented evidence

### PR #395 — initial calendar loop

Implemented:

- calendar-based `Range` and `Scrub`;
- canonical Presence/Trajectory bindings;
- interactive map/sequence Presence selection;
- URL-restorable calendar/Presence state;
- chronology-only dashed connectors with unknown route geometry preserved;
- the initial four-Presence Romagna interaction scaffold.

### First published check — `ITERATE`

The first manual check of #395 found:

- Range and Scrub appeared too similar;
- timeline hierarchy was too weak;
- selected-place information was too persistent/heavy;
- single-click camera movement was too aggressive.

This was recorded as `ITERATE` for the same loop, not as final product validation.

### PR #396 — first feedback correction

Implemented and published:

- full-width bottom timeline with primary visual weight;
- structurally distinct two-handle Range and single-current-time Scrub;
- popup-first Presence selection;
- optional right detail drawer;
- no camera movement on single click;
- explicit double-click focus;
- preserved shared Explorer State and URL restoration;
- preserved frozen Gate C bytes, draft/rejected historical Claims and unknown-route semantics.

### PR #406 — whole-life runtime proof

Expanded the same interaction path to 11 coarse Presences and six periods across 1452–1519 without introducing a second historical model or invented route geometry. The direct owner result was `ITERATE`.

### PRs #411–#412 — bounded UX correction

Completed the accepted correction: compact timeline/dock, chronology/period legibility, popup/drawer cleanup, EN/RU presentation and explicitly labelled renderer-only chronological links. Owner acceptance recorded `PROCEED_TO_GATE_D_REVIEW`; Gate D later completed with `ADVANCE_TO_GATE_E`.

## 7. Acceptance for the current published interaction

The current #412 interaction remains acceptable only if:

- Range and Scrub visibly produce their distinct temporal behaviors over the same canonical Presence set;
- an interval with no overlapping Presence produces an honest empty state;
- every visible marker is pointer- and keyboard-operable;
- one marker click selects/opens the compact popup without moving the camera;
- explicit further action opens the detail drawer;
- only explicit focus/double-click changes camera focus;
- URL state stores calendar values and stable Presence identity rather than stop-array indexes;
- `Trajectory.subject_ref` resolves to Leonardo and presentation bindings close to its canonical segments;
- all unknown gaps retain null route geometry while dashed connectors remain chronology-only;
- source/locator/uncertainty are available without becoming the primary visual surface;
- temporal display does not imply finer precision than the underlying Presence/source supports;
- frozen Gate C historical evidence remains unchanged/non-promoted;
- current Core and repository-boundary checks remain green.

Formal user value is not inferred from these implementation/acceptance conditions. Current Gate E evidence remains separately owned by the bounded protocol from PR #415.

## 8. Historical post-#396 check

The fresh user check of the published PR `#396` interface reported that the interaction was good enough to continue while remaining visual problems were non-priority.

The recorded result was `ITERATE`. That result opened the completed major-life source branch; it did not itself validate user value or authorize the later runtime proof.

This section remains historical evidence. Current acceptance/validation status is owned by Gate D closeout and the Gate E protocol.

## 9. Completed expansion after the post-#396 branch

The supported post-#396 `ITERATE` led to:

- PR #400 — reviewed seven-anchor major-life candidate package;
- PRs #401/#403 — one-source and two-source semantic proofs;
- PR #405 — M4 `ADOPT` for the source-federated semantic direction;
- PR #406 — whole-life runtime proof;
- PRs #409/#411/#412 — bounded whole-life UX correction;
- PRs #413/#414 — Gate D review and explicit `ADVANCE_TO_GATE_E` exit;
- PR #415 — bounded Gate E task/evidence protocol.

Local/global context, thematic layers, curation/editorial storage, persistence/sharing and broad renderer/provider work remain unopened unless a later evidence-backed decision opens them.

## 10. Final rule

The Temporal Map interface must remain a projection/control surface over the shared spatial-temporal model:

`World Model → Explorer State → Temporal/Spatial Render Projection → Globe + temporal controls`

UI convenience must not create a second path model, a second historical time, invented route/time precision, collapse selection into camera movement or turn future product hypotheses into current implementation scope.

## 11. Accepted future multi-scale temporal navigation

### 11.1 Decision

ARTEMIS accepts a **two-level temporal-navigation direction** for future scale growth:

- **Global Timeline** — persistent broad temporal context for the explored world;
- **Focus Timeline** — smaller contextual timeline for the one explicitly focused temporal object.

Both control and display **one canonical temporal state**. They are not independent timelines with different historical/query times.

Conceptually:

```text
                    canonical temporal state
                             │
                ┌────────────┴────────────┐
                │                         │
         Focus Timeline             Global Timeline
      object temporal lens          world temporal lens
                │                         │
                └────────────┬────────────┘
                             ↓
                       Explorer State
```

### 11.2 Global Timeline

The Global Timeline answers: **what part of world time is being examined?**

It may use a coarse display scale such as centuries/decades/years even when canonical time or selected records have finer source-supported precision.

It remains available independently of object selection and synchronizes every temporal projection through shared Explorer State.

### 11.3 Focus Timeline

The Focus Timeline answers: **what is happening to the focused object inside that temporal context?**

Rules:

- appears only when a temporal knowledge object is explicitly focused;
- its natural window is derived from the focused object's relevant `temporal_extent`/trajectory/state/process span;
- may expose a finer display scale such as years/months/days where supported;
- may visualize object-specific Presences, Events, States, stages or Region changes;
- is generalized across Person/Trajectory, Region, Event, State, Process and later temporal object types;
- is a UI/query-view projection, not a new World Model entity.

The canonical name is **Focus Timeline**, not `Life Timeline`, because the concept must generalize beyond persons.

### 11.4 Synchronization rules

- `Range` or `Scrub` remains one shared mode; do not create separate Global Range/Scrub and Focus Range/Scrub state machines.
- Moving either timeline updates the same canonical temporal selection; the other timeline reflects it at its own display scale.
- A fine canonical value such as `1502-08-10` may be shown only as `1502` on a year-scale Global Timeline while the Focus Timeline shows day/month detail.
- selecting/focusing an object outside the current world-time context must not silently jump canonical time; a future explicit action may navigate to that object's lifetime/extent.
- multiple selected/comparison objects do not produce an uncontrolled stack of Focus timelines. Ordinary navigation has at most one focused object; multi-object temporal comparison is a separate future interaction.

### 11.5 Precision versus viewport

Keep these concepts separate:

```text
Temporal value      = canonical selected/query time
Data precision      = what evidence supports (day/month/year/range/unknown)
Display scale       = labels/granularity used by a timeline view
Temporal viewport   = visible temporal window/zoom of that timeline view
```

A temporal viewport is analogous to spatial camera/view intent: it changes how the user examines time, not what historical fact is true.

Current Explorer State v1 keeps `temporal_selection` as shared semantic/query state. A future implementation may add renderer-neutral temporal view intent/viewport state, but **must not modify the v1 executable schema or fixtures until a separate specification/review authorizes that change**.

### 11.6 Layout direction

For the current desktop design direction, both controls remain at the bottom:

```text
Map / Globe
────────────────────────────────────
Focus — selected object   [detail]
────────────────────────────────────
Global / world time       [broad]
```

The Focus Timeline should remain visually smaller than the Global Timeline and behave as a detail/zoom strip. Mobile may collapse or expand it to preserve map space. Exact dimensions, breakpoints and gestures are future UI specification, not part of this semantic decision.

### 11.7 Current boundary

This decision prevents the current single-timeline implementation from becoming a future architectural dead end, but it does **not** change current capability:

- PR #412 remains the published single-timeline runtime;
- Gate E E1/E2 evaluates that accepted runtime;
- no Explorer State schema change is authorized;
- no new runtime PR is authorized;
- no World Model change is required;
- implementation may start only after a separate evidence-backed scope decision.
