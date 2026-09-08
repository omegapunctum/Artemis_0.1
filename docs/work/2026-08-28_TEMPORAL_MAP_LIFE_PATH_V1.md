# ARTEMIS — Temporal Map / Leonardo Life Path v1.3

## Status

- Type: active product interaction contract.
- Updated: 2026-09-08; v1.3 bounded Place correction preserves the earlier #416 v1.2 future-navigation decision.
- Owner: issue `#355`.
- Implemented sequence: PR `#395` established the calendar life-path loop; first published manual check recorded `ITERATE`; PR `#396` implemented and published the bounded feedback correction; PR `#406` extended the same loop to the bounded whole-life proof; PRs `#411–#412` completed the accepted UX correction.
- Current lifecycle: Gate C remains `FREEZE`; Gate D is `COMPLETED / ADVANCE_TO_GATE_E`; PR `#415` prepared the bounded Gate E protocol and E1 observations remain not collected.
- Current implementation remains one bottom timeline. Section 11 records an accepted future multi-scale temporal-navigation direction only; it does not authorize implementation or change Gate E evidence.

## 1. Product loop

The default experience answers one sequence of questions:

`object → time → path → place → information`

Leonardo is the selected object. Map and timeline are synchronized controls over one Explorer State:

- `Range` selects a calendar interval and shows every documented Presence whose temporal extent overlaps that interval;
- `Scrub` uses one current-time cursor, accumulating from the first allowed axis value by default; a saved legacy origin is restored internally;
- selecting a visible Presence opens concise place/date/activity information;
- source, locator and uncertainty remain available under progressive disclosure.

The timeline is a calendar scale, not an ordinal list of stops. The current bounded 1502 corpus may use day/month precision only where source precision permits it. Future whole-life coverage should begin at a coarser honest scale and refine without requiring a new interaction model.

## 2. Current interaction specification

The published PR `#396` interaction remains the semantic interaction baseline; later PRs preserve these rules while extending content and correcting presentation.

### Range

- one full-width bottom calendar track in the current runtime;
- two handles: start and end;
- temporal overlap determines visible Presences;
- URL state uses stable calendar values and Presence identity;
- Range represents an interval, not an accumulated path mode.

### Scrub

- one full-width bottom calendar track in the current runtime;
- one current-time cursor;
- no visible `Build from` label/select; default origin is the earliest available axis extent (1452 in the current proof);
- saved `?mode=scrub&from=...&at=...` links preserve a valid origin internally; missing/invalid `from` defaults to the first axis value, missing/invalid `at` defaults to the first axis value, and an end before origin clamps to origin; mode toggles preserve the restored Scrub origin;
- visible Presences accumulate from that origin through the current cursor;
- Scrub does not become a disguised two-ended range.

### Selection and detail

- timeline, map, selected Presence and URL share one Explorer State;
- one marker per canonical `place_ref`, fixed at its existing reference coordinates;
- persistent label is place name plus `×N` for multiple visible episodes; dates/activity/evidence belong in timeline and popup/details;
- timeline and popup episode buttons preserve individual Presence IDs; selecting any repeated visit highlights the same Place anchor;
- one marker click retains the selected visible episode at that Place, otherwise chooses its first visible episode in Range or last in Scrub, and opens a compact popup;
- nearby text may use a small label-only offset; no spatial marker displacement or tethers;
- labels are placed in selected, Scrub-current, first/last, repeated, ordinary Place priority; labels without collision-free placement are suppressed while dots retain full accessible names/titles; hover and keyboard focus reveal suppressed text temporarily;
- a single click must not move the camera;
- explicit `Open details` / further action may open the right detail drawer;
- double-click may explicitly focus/zoom the selected place;
- selection state and camera state remain separate concepts.

### Visual hierarchy

- the timeline is the primary time-navigation instrument and remains full-width at the bottom in the current runtime;
- concise object/place meaning comes before diagnostic/source detail;
- sources and uncertainty use progressive disclosure rather than occupying the main canvas by default;
- advanced layer combinations and renderer diagnostics may remain underlying evidence, not default primary controls.

## 3. Canonical model boundary

`Trajectory` is the single semantic authority for the ordered life path. It binds `subject_ref` and contains ordered `presence`, `movement` or `inferred_gap` segments. Presentation configuration may select existing segments and supply stable UI identities, but it cannot create a second path model.

`Range` and `Scrub` are interaction modes over the same temporal/Trajectory semantics. They are not separate domain entities and do not define separate historical truth.

**Temporal navigation has one canonical temporal selection/query state.** A future UI may expose more than one synchronized temporal view, scale or viewport, but it must not introduce separate `global_time` and `focus_time` truths.

Time precision, spatial precision, route status and uncertainty are data. Temporal display scale and temporal viewport are presentation/query-view concerns; they may coarsen display but cannot strengthen source-supported precision.

A category is a graph/query grouping over objects and relations; it is not automatically a GIS Layer or checkbox.

## 4. Line and route semantics

The life path is a primary visual object, but a connector is not automatically a historical route.

- documented `movement` geometry may be rendered only when evidence authorizes it;
- `inferred_gap` keeps `route_geometry=null` and `route_status=unknown_route`;
- the UI may derive a thin dashed connector between two visible Presence anchors solely to express chronology;
- a small midpoint chevron indicates time direction; no destination arrowheads, animated flow, inferred roads or route curves; inactive links stay faint, selected-adjacent links are emphasized, and the current Scrub incoming transition is strongest;
- coincident Place endpoints are not spatially separated; a zero-length connector receives no fabricated directional cue;
- that connector is presentation-only, has no World Model identity and must be distinguishable from historical route geometry;
- smooth interpolation, shortest-path drawing or visually plausible roads must not silently become historical assertions.

Future refinement may add intermediate Presences or authorized movement geometry while preserving stable identities, earlier evidence and uncertainty history.

## 5. Current bounded corpus

The current public M5 scaffold contains 11 coarse Presence anchors across 1452–1519: seven reviewed major-life anchors plus four source-bound Romagna Presences:

- Rimini — 1502-08-08;
- Cesena — 1502-08-10;
- Cesenatico — 1502-09-06;
- Imola — source-native autumn 1502 range.

They are an **interaction scaffold**, not Leonardo's complete life path.

Their point coordinates are present-day named-settlement reference anchors. Exact historical positions, duration at each place and inter-place travel routes remain unknown where unsupported.

A month/year/range-precision Presence must not gain a more exact date merely because a future Focus Timeline can render a finer temporal scale.

No change to this interaction contract authorizes additional Leonardo data by itself.

## 6. Implemented evidence

### PR #395 — initial calendar loop

Implemented:

- calendar-based `Range` and `Scrub`;
- canonical Presence/Trajectory bindings;
- interactive map/sequence Presence selection;
- URL-restorable calendar/Presence state;
- chronology-only dashed connectors with unknown route geometry preserved;
- the four-Presence Romagna interaction scaffold.

### First published check — `ITERATE`

The first manual check of #395 found:

- Range and Scrub appeared too similar;
- timeline hierarchy was too weak;
- selected-place information was too persistent/heavy;
- single-click camera movement was too aggressive.

This was recorded as `ITERATE` for the same loop, not as final product validation.

### PR #396 — implemented feedback correction

Implemented and published:

- full-width bottom timeline with primary visual weight;
- structurally distinct two-handle Range and single-current-time Scrub;
- popup-first Presence selection;
- optional right detail drawer;
- no camera movement on single click;
- explicit double-click focus;
- preserved shared Explorer State and URL restoration;
- preserved frozen Gate C bytes, draft/rejected historical Claims and unknown-route semantics.

### Later preservation

PR #406 reused the same interaction for the 11-Presence whole-life proof. PRs #411/#412 corrected composition and restored explicitly labelled renderer-only chronological links while keeping historical routes unknown/null. These later changes do not introduce a second temporal state.

## 7. Acceptance for the current published interaction

The current interaction remains acceptable only if:

- Range and Scrub visibly produce their distinct temporal behaviors over the same canonical Presence set;
- an interval with no overlapping Presence produces an honest empty state;
- every visible marker is pointer- and keyboard-operable;
- one marker click selects/open the compact popup without moving the camera;
- explicit further action opens the detail drawer;
- only explicit focus/double-click changes camera focus;
- URL state stores calendar values and stable Presence identity rather than stop-array indexes;
- `Trajectory.subject_ref` resolves to Leonardo and presentation bindings close to its canonical segments;
- all unknown gaps retain null route geometry while dashed connectors remain chronology-only;
- source/locator/uncertainty are available without becoming the primary visual surface;
- temporal UI never implies finer precision than evidence supports;
- frozen Gate C historical evidence remains unchanged/non-promoted;
- current Core and repository-boundary checks remain green.

## 8. Recorded post-#396 check

The fresh user check of the published PR `#396` interface reported that the interaction is now good enough to continue and that remaining visual issues are not the next priority.

Observe whether the user can:

1. distinguish `Range` from `Scrub`;
2. understand the timeline as the primary time control;
3. understand why the visible Presence/path state changes as time changes;
4. use Scrub as accumulation from a chosen origin rather than as another range;
5. select a Presence without unexpected camera movement;
6. retrieve concise place/date/activity meaning and reach source/uncertainty details when needed;
7. understand that dashed connectors show chronology, not a known historical route.

The allowed result vocabulary was:

- `ITERATE` — improve the same loop;
- `NARROW` — reduce content or interaction scope;
- `STOP/RETHINK` — stop this Globe/Temporal Map approach and revisit the product hypothesis.

The recorded result is `ITERATE`. It preserves this interaction contract and opens no further UI work by itself. Implementation completion, successful CI and public R&D availability are not formal user-value validation.

## 9. Completed next branch

The supported post-#396 `ITERATE` opened the now-completed `Leonardo Major-Life Presence Scope v1`. That work ultimately fed the bounded whole-life M5 proof and later UX correction. Current execution has moved to Gate E evidence under PR #415.

Local/global context, thematic layers, curation/editorial storage, persistence/sharing and renderer/provider work remain unopened unless a separate evidence-backed decision opens them.

The broader Leonardo package uses a coarse honest time scale first and refines toward months, days, roads or paths only when stronger evidence changes material understanding. The Roman Empire or other temporal polygon/state examples remain conditional later universality tests.

## 10. Final rule

The Temporal Map interface must remain a projection/control surface over the shared spatial-temporal model:

`World Model → Explorer State → Temporal/Spatial Render Projection → Globe + Timeline`

UI convenience must not create a second path model, a second historical time, invent route/time precision, collapse selection into camera movement or turn future product hypotheses into current implementation scope.

## 11. Accepted future multi-scale temporal navigation

ARTEMIS accepts this future design direction to avoid a single-timeline dead end when many objects and mixed temporal precisions enter the same view.

### 11.1 Global Timeline and Focus Timeline

- **Global Timeline** is the persistent broad-scale temporal context of the explored world.
- **Focus Timeline** is a smaller contextual temporal lens that may appear when one knowledge object is explicitly focused.
- Both remain at the bottom in the current desktop design direction, with Focus above Global. Exact dimensions and mobile behavior are future UI specification.
- The canonical name is `Focus Timeline`, not `Life Timeline`, because the same pattern must work for Person/Trajectory, Region, Event, State, Process and other temporal objects.

### 11.2 One time, two scales

Both timelines control/view the **same canonical temporal state**:

```text
                    canonical temporal state
                              │
                 ┌────────────┴────────────┐
                 │                         │
          Focus Timeline             Global Timeline
       object-bounded detail          world context
                 │                         │
                 └────────────┬────────────┘
                              ↓
                    shared Explorer State
```

Rules:

- do not create independent `global_time` and `focus_time`;
- `Range` or `Scrub` is one shared mode, not separate per-timeline mode machines;
- moving either timeline updates the same temporal selection and the other reflects it at its own scale;
- a canonical value such as `1502-08-10` may appear only as `1502` on a year-scale Global Timeline while Focus shows day/month detail;
- data precision remains evidence-bound and independent from display scale;
- Global and Focus may have different visible temporal windows/zoom levels, but those are temporal viewports, not historical/query truth;
- selecting/focusing an object outside current world time must not silently move canonical time; a future explicit navigation action may do so.

### 11.3 Focus and selection

Multiple objects may be selected or compared, but ordinary navigation has at most one focused object driving the Focus Timeline. A stack of one timeline per selected object is rejected as the default model. Multi-object temporal comparison is a separate future interaction.

### 11.4 Explorer State implication

Current Explorer State v1 keeps one `temporal_selection`, which remains conceptually correct. A future implementation may add renderer-neutral temporal view intent/viewport state, analogous to spatial `view_intent`, while retaining one semantic/query time.

No Explorer State v1 schema/fixture change is authorized by this decision. Any such change requires a separate specification, compatibility statement, fixture update and executable validation.

### 11.5 Current boundary

This is a **Decision / future specification constraint**, not Implementation:

- current #412 runtime remains single-timeline;
- current Gate E T1–T5/E2 protocol remains unchanged;
- no World Model change is required;
- no implementation PR is authorized;
- implementation can start only after a later evidence-backed scope decision.
