# ARTEMIS_UI_UX_IMPLEMENTATION_PLAN_v1.0

## Статус документа
Рабочий implementation-plan документ для инженерного исполнения UI/UX-слоя ARTEMIS v1.0.

> Status update (2026-04-22): для главного экрана принят working visual baseline; отдельный hardening-цикл по shell / top controls / detail panel / timeline завершён. В рамках текущего плана нет обязательного инерционного repatch этих зон без нового audit.
>
> Detail-panel implementation sync (2026-04-22): first-pass runtime epistemic baseline внутри detail panel принят как текущий рабочий baseline (factual/meta, provenance/source, uncertainty/confidence-adjacent, related/relation-like) без запуска нового runtime patch-track; дальнейшие шаги по зоне — только через audit-first.

Основан строго на:
- `ARTEMIS_CONCEPT_v1.0`
- `ARTEMIS_PRODUCT_SCOPE_v1.0`
- `ARTEMIS_AI_STRATEGY_v1.0`
- `ARTEMIS_UI_UX_SYSTEM_v1.0`
- `ARTEMIS_UI_UX_COMPONENT_MAP_v1.0`

---

## 1. Purpose of the document

Этот документ фиксирует **порядок и границы реализации UI/UX**, чтобы:
- перевести системный UI/UX spec в поэтапный инженерный rollout;
- не допустить расползания scope до сборки product core;
- дать Codex/engineering команде однозначную последовательность tasking;
- обеспечить совместимость UI-реализации с epistemic и explainability-требованиями ARTEMIS.

Документ **не заменяет** концептуальные/системные документы и **не повторяет** их содержание.

---

## 2. Implementation principles

1. **Core-first:** сначала map + time + detail + slice core; потом narrative и AI-надстройки.
2. **Slice-centric execution:** любая фаза должна усиливать lifecycle research slice.
3. **Explainability discipline:** факт, связь, интерпретация, гипотеза должны быть видимо разделены.
4. **Mode clarity:** exploration/story/course/AI/compare — отдельные режимы с предсказуемыми переходами.
5. **State completeness:** для каждого блока обязательны loading/empty/error/success состояния.
6. **Desktop+mobile parity by logic, not by layout cloning.**
7. **No speculative features before core done:** нельзя реализовывать “декоративный интеллект” и вторичную социальность раньше базового цикла.

---

## 3. Implementation sequence overview

- **Phase A — Workspace Core:** каркас рабочего пространства (map/time/detail/system feedback).
- **Phase B — Slice Core:** полная операционность slices (create/save/list/restore + readiness for compare).
- **Phase C — Story Layer:** guided narrative traversal поверх slices.
- **Phase D — Course Layer:** educational progression поверх story/slice foundation.
- **Phase E — Explainable AI Layer:** explain/compare/suggest с жёсткой эпистемической маркировкой.

Критическое правило последовательности: **A → B → C → D → E** без перескока через зависимости.

---

## 4. Phase A — Workspace Core

### Objective
Собрать устойчивую исследовательскую сцену: карта + время + детали + системная обратная связь.

### Included UI blocks
- Global Shell: Top Navigation Bar, Route/Mode Switcher (core routes only)
- Map Workspace: Main Map Canvas, Object Marker/Spatial Node, Layer Control Panel
- Time System: Timeline Bar, Time Range Control
- Knowledge Detail System: Object Preview Card, Detail Panel, Provenance/Source Block
- Support Layer: Search, Notifications/Status Feedback, Empty/Error/Loading states, Mobile Navigation Sheet/Drawer

### Excluded blocks
- Slice compare
- Story/Course viewers
- AI panels
- Hypothesis/suggestion UI
- Advanced profile/social/UGC extensions

### Likely repo files affected
- `js/map.js`
- `js/ui.js`
- `js/state.js`
- `js/ux.js`
- `js/data.js`
- `css/style.css`
- `app/routes/map.py`

### Dependencies
- Stable map data contract and layer payloads
- Time metadata availability per entity/event
- Selection state contract between map and detail panel

### Completion criteria
- User can navigate map + timeline together without state loss.
- Selecting entity opens preview and full detail flow.
- Provenance visibility exists in detail context when source data exists.
- Search, loading, empty, and error states are explicit and non-blocking.

### Minimal validation
- Manual flow: open map → set time range → select entity → open detail → change layer.
- Smoke checks for no-data and error payloads.
- Basic mobile interaction check for staged map + sheet behavior.

---

## 5. Phase B — Slice Core

### Objective
Сделать slice главным рабочим объектом с полным lifecycle в UI.

### Included UI blocks
- Slice Create Action
- Slice Save Dialog/Sheet
- Saved Slice List
- Slice View/Restore Action
- Slice metadata surface (title/note/time/layers snapshot)
- Compare readiness hooks (without full compare UX)

### Excluded blocks
- Full Slice Compare Mode UI
- Story/Course authoring conveniences
- AI compare/suggest

### Likely repo files affected
- `js/state.js`
- `js/ui.js`
- `js/ux.js`
- `js/data.js`
- `css/style.css`
- `app/drafts/routes.py`
- `app/drafts/service.py`
- `app/drafts/schemas.py`

### Dependencies
- Phase A complete and stable
- Persisted storage endpoint for slice states
- Backward-compatible slice schema/versioning strategy

### Completion criteria
- User can create/save/reopen slices with reproducible workspace state.
- Saved slices are listable/searchable and include minimal metadata.
- Restore flow handles stale/incomplete state with graceful warning.

### Minimal validation
- Roundtrip test: capture state → save slice → reload workspace → restore slice.
- Schema validation for persisted slice payload.
- UI state tests for save success/failure/duplicate warning.

---

## 6. Phase C — Story Layer

### Objective
Реализовать guided narrative traversal как последовательность slice-состояний.

### Included UI blocks
- Story Entry Card
- Story Step Viewer (start/in-progress/end/paused)
- Story narrative context in detail-side or overlay zone
- Map/time synchronization per step

### Excluded blocks
- Advanced story authoring suite
- Course progression mechanics
- AI-generated story construction

### Likely repo files affected
- `js/ui.js`
- `js/ux.js`
- `js/state.js`
- `js/data.js`
- `css/style.css`
- `app/routes/map.py`

### Dependencies
- Phase B slice restore logic
- Story-to-slice linking model
- Stable step transition contract

### Completion criteria
- Story steps correctly drive map/time/slice context.
- User can traverse step-by-step with clear position in narrative.
- Story mode does not break return to exploration mode.

### Minimal validation
- Story playback smoke across all step states.
- Regression check: exiting story restores last exploration context.
- Mobile check: step navigation via staged sheet flow.

---

## 7. Phase D — Course Layer

### Objective
Добавить структурированный учебный режим поверх story/slice foundation.

### Included UI blocks
- Course Player (not started/in progress/completed/resume/unavailable)
- Story/Course Outline Panel
- Lesson-step progression with map/slice linkage
- Minimal progress state persistence

### Excluded blocks
- Gamification
- Advanced learner analytics
- Community learning/social overlays

### Likely repo files affected
- `js/ui.js`
- `js/ux.js`
- `js/state.js`
- `js/data.js`
- `css/style.css`
- `app/routes/map.py`

### Dependencies
- Phase C Story Step Viewer stability
- Course structure schema (course → lesson → step → slice/story references)
- Resume state persistence

### Completion criteria
- User can start/resume/complete course flow with deterministic progression.
- Course steps are spatial-temporal synchronized.
- Course mode remains compatible with base exploration and saved slices.

### Minimal validation
- Course state transition smoke (start → progress → resume → complete).
- Broken-reference handling test for missing step/slice links.
- Cross-mode regression: course exit to workspace.

---

## 8. Phase E — Explainable AI Layer

### Objective
Интегрировать explainable AI assistance без нарушения epistemic дисциплины.

### Included UI blocks
- AI Entry Point
- AI Explain Panel
- AI Compare Panel
- AI Suggest/Hypothesis Block
- Epistemic Status Marker (fact/relation/interpretation/hypothesis)
- AI Provenance/Basis Block

### Excluded blocks
- Strong causal claims UI
- Counterfactual simulation UI as production feature
- Predictive future-scoring UX
- Opaque “insight feed” without basis trace

### Likely repo files affected
- `js/ui.js`
- `js/ux.js`
- `js/state.js`
- `js/data.js`
- `css/style.css`
- `app/main.py`
- `app/security/rate_limit.py`
- `app/observability.py`

### Dependencies
- Phases A–D complete and stable
- AI endpoint contracts with context-bound inputs (object/slice/story/compare)
- Provenance mapping from AI output to underlying data context
- Safety/rate limit and failure-state handling

### Completion criteria
- AI outputs are context-bound, status-labeled, and provenance-linked.
- Fact vs interpretation vs hypothesis is visually unambiguous.
- AI failure/degradation states do not break core research workflow.

### Minimal validation
- Prompt-context integrity checks (object vs slice vs compare).
- Epistemic label rendering checks for all AI output types.
- Rate-limit/unavailable path smoke.

---

## 9. Cross-cutting constraints

1. **No phase may weaken map-time usability.**
2. **Every phase must preserve returnability (save/resume continuity).**
3. **All user-visible outputs require explicit UI state handling:** loading/empty/error/success.
4. **Data provenance visibility is mandatory where relevant.**
5. **Mobile UX must use staged interaction, not desktop panel mirroring.**
6. **Accessibility baseline:** keyboard focus order, readable contrast, semantic interaction labels.
7. **Performance budget discipline:** avoid UI regressions that degrade map/timeline responsiveness.

---

## 10. Files most likely affected per phase

- **Phase A (Workspace Core):**
  - `js/map.js`, `js/ui.js`, `js/state.js`, `js/ux.js`, `js/data.js`, `css/style.css`, `app/routes/map.py`
- **Phase B (Slice Core):**
  - `js/state.js`, `js/ui.js`, `js/ux.js`, `js/data.js`, `css/style.css`, `app/drafts/routes.py`, `app/drafts/service.py`, `app/drafts/schemas.py`
- **Phase C (Story Layer):**
  - `js/ui.js`, `js/ux.js`, `js/state.js`, `js/data.js`, `css/style.css`, `app/routes/map.py`
- **Phase D (Course Layer):**
  - `js/ui.js`, `js/ux.js`, `js/state.js`, `js/data.js`, `css/style.css`, `app/routes/map.py`
- **Phase E (Explainable AI Layer):**
  - `js/ui.js`, `js/ux.js`, `js/state.js`, `js/data.js`, `css/style.css`, `app/main.py`, `app/security/rate_limit.py`, `app/observability.py`

Примечание: список вероятностный и служит для planning/task decomposition.

---

## 11. Done criteria per phase

- **Phase A done:** исследователь может уверенно работать map+time+detail без потери контекста.
- **Phase B done:** slice lifecycle (create/save/list/restore) стабилен и воспроизводим.
- **Phase C done:** story mode даёт guided переход по slices с управляемой навигацией.
- **Phase D done:** course mode добавляет последовательное обучение и прогресс без ломки core UX.
- **Phase E done:** AI assistance explainable, provenance-aware, epistemically labeled и безопасно деградирует.

---

## 12. Validation/check strategy per phase

- **Phase A:** UI smoke + map/time/detail integration checks + state fallback checks.
- **Phase B:** slice roundtrip checks + payload/schema validation + restore compatibility checks.
- **Phase C:** story step transition checks + map/time sync checks + mode transition regression.
- **Phase D:** course progression checks + resume checks + broken-link resilience checks.
- **Phase E:** AI output labeling checks + provenance trace checks + fail/rate-limit degradation checks.

Общий принцип: каждый следующий phase gate открывается только после прохождения minimal validation предыдущей фазы.

---

## 13. What must NOT be implemented before the core is complete

До завершения **Phase A + Phase B** запрещено приоритизировать:
- advanced profile area;
- open social/community feeds;
- heavy UGC creation interfaces;
- speculative counterfactual UI;
- decorative AI widgets без epistemic/provenance контроля;
- course gamification;
- tertiary personalization layers.

До завершения **Phase C + Phase D** запрещено приоритизировать:
- broad creator tooling beyond minimal story/course consumption flow;
- expansion UX not tied to slice-centered loop.

---

## 14. Recommended order for future Codex tasking

1. **Codex Task Group A:** Workspace Core stabilization (map/time/detail/support states).
2. **Codex Task Group B:** Slice lifecycle implementation and persistence hardening.
3. **Codex Task Group C:** Story consumption flow (entry + step viewer + mode transitions).
4. **Codex Task Group D:** Course player + progress + resume logic.
5. **Codex Task Group E:** Explainable AI panels + epistemic markers + provenance basis + safeguards.
6. **Codex Task Group F (only after A–E):** compare-depth improvements, authoring conveniences, polish.

Tasking discipline:
- Каждый task должен ссылаться на phase и конкретные UI blocks.
- Каждый PR должен включать explicit phase-scoped validation.
- Никакие cross-phase feature jumps без зафиксированного exception decision.

---

## Краткая формула реализации

**Сначала workspace, затем slice, затем story/course, затем explainable AI.**

Это минимальная дисциплина, которая сохраняет ARTEMIS как research platform, а не как набор разрозненных интерфейсных функций.
