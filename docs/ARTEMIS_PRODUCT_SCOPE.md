# ARTEMIS — PRODUCT SCOPE

Owner-directed presentation update (2026-09-08): replace numbered map markers with place-name labels and existing Presence periods; repeated visits remain distinct records of the same place. Screen-space label displacement must not modify coordinates and must retain a visual anchor. Keep popup-first selection, details, Range/Scrub and chronology semantics. This bounded update precedes E1; pin its published revision before collecting E1 evidence. It is not an E1 result or a reopening of the accepted Gate D decision.

Current decision: [Gate D exit — ADVANCE_TO_GATE_E](work/2026-09-06_GATE_D_EXIT_DECISION_v1.md). #413 is merged; Gate D is completed. Next is one bounded Gate E task/evidence protocol; collection has not started. No new implementation is opened.

## Статус

- Тип: canonical current product scope.
- Версия: 4.3.
- Дата: 2026-09-06.
- Active vertical: `Life in Context / Leonardo Temporal Map` / issue `#355`.
- Current increment: `Gate E evidence preparation`; M5 bounded UX correction completed with `PROCEED_TO_GATE_D_REVIEW`; #409/#411/#412 are completed evidence.
- Gate C: completed / `FREEZE`.
- Gate D: `COMPLETED / ADVANCE_TO_GATE_E`.
- Thematic compatibility surface retained: `Architecture Atlas` at `/atlas/`.
- North Star: `ARTEMIS_CONCEPT.md`.
- Current reality: `PROJECT_TRUTH.md`.
- World-model authority: `SPATIOTEMPORAL_WORLD_MODEL_CONTRACT.md`.

Этот документ разрешает только текущий Foundation v3 product-validation scope. Concept target не является утверждением о current implementation.

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

Foundation и Core Reset уже завершены как prerequisites. Текущий Gate D cycle не должен повторно открывать их.

Completed prerequisites:

- Foundation v3 / v3.1 identity and World Model boundaries;
- reviewed World Model, uncertainty and renderer contracts;
- Gate C `FREEZE` for the Leonardo-in-Romagna 1502 package;
- Core Reset / PR `#393`;
- calendar-based Temporal Map loop / PR `#395`;
- first manual feedback result `ITERATE`;
- feedback correction / PR `#396`.

Current authorized work:

- preserve the published #396 interaction;
- preserve the recorded post-#396 `ITERATE` and its evidence limitations;
- preserve the reviewed PR #400 package as the content boundary used by the bounded M5 runtime;
- preserve the merged PR #401 one-source proof unchanged as M2 evidence;
- preserve the merged PR #403 two-source proof unchanged as M3 evidence;
- preserve the M4 `ADOPT` decision as a semantic direction rather than a capability claim;
- preserve PR #406 as the bounded M5 proof without widening it;
- preserve the direct M5 product result as exactly `ITERATE`;
- preserve completed #409/#411/#412 evidence and the 2026-09-06 owner acceptance;
- accept the decision-only closeout and use its bounded Gate D review; no runtime implementation is open.

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

Не являются обязательными для текущего M5 checkpoint:

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

The append-only recording/refinement mechanism is scoped by issue `#377` and `PROGRESSIVE_REFINEMENT_CONTRACT.md`; its accepted semantics do not authorize editable runtime/storage behavior in Gate D.

## 4. Обязательный interface scope

Current required interface behavior:

- 3D Globe as the primary MVP spatial surface;
- Architecture Atlas at `/atlas/` as a frozen compatibility surface;
- full-width bottom calendar timeline as the primary time instrument;
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

For the current M5 checkpoint:

- immutable revisions and Research Brief are not prerequisites;
- current mutable ResearchSlice v2 remains compatibility backend code;
- issues #323–#325 are not executed;
- PR #314 is not a Foundation prerequisite;
- no new public backend is required unless evidence shows the static read-only loop is insufficient.

## 8. Frozen scope

Outside the currently authorized M5 preservation boundary:

- any source, Presence or broad reconciliation expansion beyond the reviewed M5 package;
- default local/global context layers;
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

The #355 decision, public deployment and #396 implementation do not make:

- Leonardo historical content product-validated;
- broader local/global context implemented as the current default experience;
- AI available;
- the Globe product-validated;
- VR available;
- world-scale coverage real.

## 10. Current exit condition

The corrected #396 loop completed M1 with `ITERATE`. PR #400 completed the reviewed candidate package. PR #401 completed M2 with `PROCEED_TO_M3`. PR #403 completed M3 with `PROCEED_TO_M4`. M4 is complete with:

- **`ADOPT`** — accept the source-federated semantic direction while keeping intake bounded, deterministic and reviewable.

PR #405 did not authorize another implementation. M5 nevertheless started later through explicit owner instruction and was published by PR #406. The absence of an intervening repository decision record is recorded as a governance deviation and is not retroactively repaired.

The manual check of the published whole-life proof recorded exactly one result:

- **`ITERATE`** — improve the current bounded whole-life loop.

`NARROW` and `STOP` were not selected. The observed problems concern relational legibility and interface composition rather than evidence that the 1452–1519 scope must be reduced or the Temporal Map direction stopped.

This package outcome does not automatically mean Gate D is globally complete or authorize another product branch.

Formal same-content baseline, broader contextual-understanding metrics and participant protocol remain available for a later validation step when the tested scope actually contains the corresponding context/layer hypotheses.

## 11. Next-branch rule

The earlier post-#396 result vocabulary was:

- `ITERATE` — improve the same loop;
- `NARROW` — reduce the loop/content scope;
- `STOP/RETHINK` — stop this approach and revisit the hypothesis.

The recorded M1 result is `ITERATE`; M2 completed through PR #401 with `PROCEED_TO_M3`; M3 completed through PR #403 with `PROCEED_TO_M4`; M4 completed with `ADOPT`; M5 completed with `ITERATE`. PR #409 scoped the correction implemented and published through #411/#412, now completed with `PROCEED_TO_GATE_D_REVIEW`. The accepted Gate D review and explicit exit record `ADVANCE_TO_GATE_E`; Gate D is completed and Gate E evidence preparation is next. Context/layers, curation/editorial storage, persistence/sharing, new source/data integration and broad renderer/provider improvement remain unopened.

Public deployment, richer historical terrain, guided learning, source-bound AI, broader World Slices, institutional workflow and VR/AR remain separate decisions.

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
- current Temporal Map interaction: `work/2026-08-28_TEMPORAL_MAP_LIFE_PATH_V1.md`.
