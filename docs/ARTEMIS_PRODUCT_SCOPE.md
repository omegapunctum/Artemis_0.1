# ARTEMIS — PRODUCT SCOPE

Current decision: [Gate D exit — ADVANCE_TO_GATE_E](work/2026-09-06_GATE_D_EXIT_DECISION_v1.md). Gate D is completed. PR #415 prepared the bounded Gate E task protocol; E1 observations are still not collected. No new runtime implementation is opened.

## Статус

- Тип: canonical current product scope.
- Версия: 4.4.
- Дата: 2026-09-08.
- Active vertical: `Life in Context / Leonardo Temporal Map` / issue `#355`.
- Current increment: `Gate E evidence preparation`; bounded protocol prepared in PR #415; E1 is the next evidence action; no runtime implementation branch is open.
- Gate C: completed / `FREEZE`.
- Gate D: `COMPLETED / ADVANCE_TO_GATE_E`.
- Thematic compatibility surface retained: `Architecture Atlas` at `/atlas/`.
- North Star: `ARTEMIS_CONCEPT.md`.
- Current reality: `PROJECT_TRUTH.md`.
- World-model authority: `SPATIOTEMPORAL_WORLD_MODEL_CONTRACT.md`.

Этот документ разрешает только текущий Foundation v3 product-validation scope. Concept target и accepted future design direction не являются утверждением о current implementation.

## 1. Формула текущего продукта

ARTEMIS Life in Context — **source-aware synchronized Globe/timeline experience для исследования жизненного пути личности с постепенным добавлением контекста только после подтверждения ценности базового пространственно-временного loop**.

Текущая проверяемая ценность существенно уже long-term thesis:

`object → time → path → place → information`

Для Leonardo текущий loop должен позволять:

- выбрать календарное время;
- увидеть подтверждённые Presence в соответствующем temporal state;
- проследить coarse trajectory без выдуманного маршрута;
- выбрать Presence;
- понять место, source-native time, principal activity и границы известного;
- открыть source/locator/uncertainty по необходимости.

Local/global context, тематические layers, richer Events/States/Processes и broader simultaneity остаются следующими hypotheses, а не обязательными элементами текущей проверки.

## 2. Scope lock текущего цикла

Foundation и Core Reset уже завершены как prerequisites. Gate D завершён; текущий Gate E evidence cycle не должен повторно открывать их или менять runtime без material evidence.

Completed prerequisites:

- Foundation v3 / v3.1 identity and World Model boundaries;
- reviewed World Model, uncertainty and renderer contracts;
- Gate C `FREEZE` for the Leonardo-in-Romagna 1502 package;
- Core Reset / PR `#393`;
- calendar-based Temporal Map loop / PR `#395`;
- first manual feedback result `ITERATE`;
- feedback correction / PR `#396`;
- M2/M3/M4 evidence through PRs #401/#403/#405;
- M5 whole-life proof / PR #406;
- bounded UX correction / PRs #409/#411/#412;
- Gate D review/exit / PRs #413/#414;
- bounded Gate E task protocol / PR #415.

Current authorized work:

- preserve the accepted published Temporal Map interaction;
- preserve M4 `ADOPT` as a semantic architecture direction, not a live-federation capability;
- preserve the M5 evidence chain and the owner-accepted correction without widening content or infrastructure;
- run Gate E evidence according to the merged bounded protocol;
- open runtime implementation only for a concrete material finding and a separate bounded decision.

## 3. Обязательный current content scope

Текущий M5 validation scaffold содержит:

- одна primary Person: Leonardo da Vinci;
- canonical Trajectory as semantic authority;
- seven reviewed major-life Presence anchors from PR #400 plus four source-bound Presence anchors in Romagna, 1502:
  - Rimini — 1502-08-08;
  - Cesena — 1502-08-10;
  - Cesenatico — 1502-09-06;
  - Imola — source-native autumn 1502 range;
- Claim/EvidenceLink/locator closure для material assertions;
- explicit temporal/spatial/corpus uncertainty;
- unknown route gaps with `route_geometry=null`;
- present-day settlement anchors explicitly separated from exact historical position claims.

The 11 anchors form six coarse life periods across 1452–1519. Это **bounded whole-life interaction scaffold**, а не Leonardo's complete biography и не полный `Life in Context` corpus.

Не являются обязательными для текущего M5/Gate E evidence checkpoint:

- changing historical Region geometry;
- complete local political/cultural State context;
- long Processes;
- selected contemporaries;
- documented Relation predicates;
- global simultaneous Events;
- broad thematic layer set;
- expansion beyond the reviewed 11-Presence M5 package.

M4 did not itself promote the PR #400 package. Its later runtime use came from explicit owner instruction and PR #406; no intervening repository decision record exists.

### 3.1 Progressive fidelity / достаточная точность

ARTEMIS развивается **от общего к частному**. Текущий gate требует не максимальной возможной детализации, а минимальной достаточной fidelity, которая честно поддерживает пользовательский сценарий.

Правила:

- source-native precision и raw/source values сохраняются, если они доступны и полезны для provenance;
- исследовательская и curation работа не обязана добиваться более тонкой temporal/spatial granularity, если это не меняет material product or validation semantics;
- более высокая точность приоритетна только когда она меняет identity, ordering, overlap/co-presence, geometry, relation interpretation, пользовательское понимание или gate decision;
- hour-level reconstruction движения исторического объекта не является требованием текущего Globe MVP, если day/month/year/range/unknown precision уже достаточна для сценария;
- UI/runtime может показывать более крупный масштаб времени/пространства, чем хранится в source-native metadata, но не может показывать более точное значение, чем подтверждено данными;
- последующая revision может уточнять время, место или geometry без смены object identity и без переписывания истории evidence;
- coarse current scope никогда не разрешает invented exactness: неизвестное остаётся неизвестным, а отсутствие точного route не заполняется правдоподобной линией.

Это правило экономит curation/research budget, но **не ослабляет accuracy, provenance, uncertainty или evidence requirements**.

The append-only recording/refinement mechanism is scoped by issue `#377` and `PROGRESSIVE_REFINEMENT_CONTRACT.md`; its accepted semantics do not authorize editable runtime/storage behavior in the current evidence cycle.

## 4. Обязательный interface scope

Current required interface behavior:

- 3D Globe as the primary MVP spatial surface;
- Architecture Atlas at `/atlas/` as a frozen compatibility surface;
- current public runtime uses one full-width bottom calendar timeline as the primary time instrument;
- `Range` as a two-handle calendar interval using temporal overlap;
- `Scrub` as a chosen build origin plus one current-time cursor that accumulates the path forward;
- selectable start/end or start/current calendar values at an honest display granularity;
- map, timeline, selection and URL controlling one shared Explorer State;
- interactive Presence markers with a compact first-click popup;
- no map-camera movement on single click;
- optional right detail drawer for deeper information;
- explicit double-click may focus/zoom the selected place;
- coarse trajectory presentation where a dashed chronological connector is explicitly not historical route geometry;
- concise place/date/activity information first;
- source/locator/uncertainty under progressive disclosure;
- URL-restorable state without a backend dependency.

The completed correction added non-route chronological sequence/period cues synchronized between markers and timeline, popup closure when the drawer opens, lower visual density and timeline height, collision-free supported viewports, a current-M5 `EN / RU` presentation layer and visible attribution beside the drawer. The owner-directed #412 amendment permits dashed chronological presentation links; historical route geometry remains unknown/null.

Layer combinations, Region alternatives and renderer diagnostics may remain available as underlying evidence/advanced inspection, but they are not default primary controls for the current user check.

`Trajectory` remains the semantic authority. A presentation-only chronological connector must remain distinguishable from unknown route geometry.

### 4.1 Accepted multi-scale temporal navigation direction — decision, not implementation

ARTEMIS accepts the following future interaction direction for temporal navigation when evidence justifies opening a new implementation branch:

1. **One canonical temporal state.** ARTEMIS must not create separate `global_time` and `focus_time` truths. Global and object-focused controls are synchronized views over the same canonical selected instant/range/scrub state.
2. **Global Timeline.** A persistent broad-scale timeline represents the temporal context of the explored world and remains the primary world-time control.
3. **Focus Timeline.** When one knowledge object is explicitly focused, a smaller contextual timeline may appear above the Global Timeline. It is bounded by the focused object's relevant temporal extent and may use a finer display scale than the global timeline.
4. **Generalized focus, not biography-only UI.** The Focus Timeline must work conceptually for `Person/Trajectory`, `Region`, `Event`, `State`, `Process` and other temporal objects. It is not a new World Model object and is not named `Life Timeline` in the canonical design.
5. **One temporal mode.** `Range` or `Scrub` belongs to the shared temporal state. Global and Focus timelines must not expose independent competing Range/Scrub modes.
6. **Display scale is not data precision.** A Global Timeline may display years while a Focus Timeline displays months/days if source-supported data exists. The shared temporal value may be fine-grained even when the global rendering is coarse. UI may coarsen display but never invent finer precision than the source/model supports.
7. **Temporal viewport is presentation state.** Global and Focus timelines may have different visible windows/zoom levels. These viewports describe how time is shown, not a second historical/query time. A future Explorer State revision may encode temporal view intent, but current Explorer State v1/schema remains unchanged until separately specified and validated.
8. **Selected is not focused.** Multiple objects may be selected/compared, but only one focused object drives the ordinary Focus Timeline. Multi-object temporal comparison is a separate future comparison surface and must not create an uncontrolled stack of timelines.
9. **No implicit time teleport.** Selecting/focusing an object outside the current world-time context must not silently move canonical time. A future explicit action such as `Go to object time/lifetime` may do so.
10. **Placement.** Desktop direction keeps both temporal controls at the bottom, with the Focus Timeline as a smaller detail strip above the Global Timeline. Mobile may collapse/expand the Focus Timeline to preserve map space; exact layout is future UI specification, not semantic contract.

Conceptual shape:

```text
                    one canonical temporal state
                              │
                 ┌────────────┴────────────┐
                 │                         │
          Focus Timeline             Global Timeline
       object-bounded detail          world context
       finer display scale            broader scale
                 │                         │
                 └────────────┬────────────┘
                              ↓
                    shared Explorer State
```

This direction is accepted now to avoid a future one-timeline dead end as data precision and object diversity grow. **It does not modify the current #412 runtime, does not change Gate E T1–T5/E2 evidence, does not authorize an implementation PR, and does not require a World Model change.**

## 5. Knowledge and epistemic scope

The canonical World Model remains broader than the current visible loop:

- `Entity`, `Event`, `State`, `Process`, `Trajectory`, `Region`, `Layer`;
- `Relation` as structured Claim;
- `Claim`, `Source`, `EvidenceLink`;
- independent claim kind/origin/review/confidence/evidence/uncertainty;
- explicit corpus coverage;
- alternative reconstructions where necessary;
- `Similarity` as computed output, not evidence;
- `same_movement` as legacy classification projection.

The current UI does not need to expose every canonical object type to prove the first Temporal Map interaction. Compatibility adapters may be used only if they do not erase target semantics.

## 6. Architecture Atlas disposition

Architecture Atlas:

- remains a public compatibility surface at `/atlas/`;
- remains an architecture thematic layer;
- retains current Sources/Media/Relations and Gate A fixtures;
- may later supply contextual material to Life in Context through the shared core;
- does not define the active user, loop or outcome.

No completed corpus or engineering work is deleted in this cycle.

## 7. Current persistence boundary

Target Investigation/SliceRevision/ResearchBrief remains a valid optional research-work capability.

For the current evidence checkpoint:

- immutable revisions and Research Brief are not prerequisites;
- current mutable ResearchSlice v2 remains compatibility backend code;
- issues #323–#325 are not executed;
- PR #314 is not a Foundation prerequisite;
- no new public backend is required unless evidence shows the static read-only loop is insufficient.

## 8. Frozen scope

Outside the currently authorized evidence/preservation boundary:

- any source, Presence or broad reconciliation expansion beyond the reviewed M5 package;
- default local/global context layers;
- implementation of the accepted Global Timeline + Focus Timeline direction before a separate evidence-backed branch decision;
- generic temporal comparison/multiple focus timelines;
- generative AI and AI analysis runtime;
- causal/predictive engine;
- counterfactual simulation;
- public production Globe before promotion evidence;
- photorealistic or universal historical terrain reconstruction;
- VR/AR;
- open-ended UGC;
- institutional collaboration;
- Stories/Courses product depth;
- universal multi-domain corpus;
- native apps;
- enterprise APIs/integrations;
- framework rewrite;
- scaling unrelated to current blockers.

Security and compatibility maintenance remain allowed.

## 9. Public capability rule

Capability labels:

- `PUBLIC NOW`;
- `BACKEND-AVAILABLE`;
- `PILOT`;
- `R&D`;
- `CONCEPT TARGET`;
- `FUTURE`.

The public root is the ARTEMIS Core landing. It routes `/globe/` as the primary Leonardo research prototype and `/atlas/` as compatibility-only.

The #355 decision, public deployment and current implementation do not make:

- Leonardo historical content product-validated;
- broader local/global context implemented as the current default experience;
- multi-scale Global/Focus Timeline implemented;
- AI available;
- the Globe product-validated;
- VR available;
- world-scale coverage real.

## 10. Current exit condition

Gate D completed with `ADVANCE_TO_GATE_E`. PR #415 prepared the bounded Gate E protocol. Current value evidence remains pending: E1 requires one independent novice T1–T5 session; E2 is conditional on full unaided E1 pass and compares the same content in ARTEMIS versus a linear baseline.

No positive or negative Gate E result is implied by accepting the future multi-scale temporal-navigation direction.

## 11. Next-branch rule

M1 completed with `ITERATE`; M2 with `PROCEED_TO_M3`; M3 with `PROCEED_TO_M4`; M4 with `ADOPT`; M5 with `ITERATE`; the M5 UX correction completed with `PROCEED_TO_GATE_D_REVIEW`; Gate D completed with `ADVANCE_TO_GATE_E`.

The active next step remains Gate E evidence under PR #415. The Global Timeline + Focus Timeline direction is an accepted design constraint for future temporal-navigation work, not an opened branch. It may be implemented only after a separate decision identifies a concrete evidence-backed need, artifact scope, Explorer State implications, acceptance tests and stop condition.

Context/layers, curation/editorial storage, persistence/sharing, new source/data integration and broad renderer/provider improvement remain unopened. Public deployment, richer historical terrain, guided learning, source-bound AI, broader World Slices, institutional workflow and VR/AR remain separate decisions.

## 12. Owner documents

- North Star: `ARTEMIS_CONCEPT.md`;
- product thesis: `PRODUCT_THESIS.md`;
- current truth: `PROJECT_TRUTH.md`;
- platform architecture: `PLATFORM_ARCHITECTURE_DECISION.md`;
- world model: `SPATIOTEMPORAL_WORLD_MODEL_CONTRACT.md`;
- epistemic semantics: `EPISTEMIC_CONTRACT.md`;
- entities and relations: `ENTITY_MODEL.md`;
- current public data: `DATA_DICTIONARY.md` and `DATA_CONTRACT.md`;
- research persistence: `RESEARCH_SLICE_CONTRACT.md`;
- Foundation decision: `work/2026-07-28_FOUNDATION_V3_DECISION.md`;
- formal validation design: `work/2026-07-28_FOUNDATION_V3_VALIDATION_PLAN_v1.md`;
- active Globe decision: `work/2026-08-09_GLOBE_MVP_PROMOTION_DECISION_v1.md`;
- current Temporal Map interaction and accepted multi-scale temporal-navigation direction: `work/2026-08-28_TEMPORAL_MAP_LIFE_PATH_V1.md`.
