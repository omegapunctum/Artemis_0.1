# 2026-04-26_UIUX_APP_STRUCTURE_SPEC_ACTIVE_v1_0

## Статус документа

- Тип: working UI/UX architecture spec
- Статус: active
- Scope: frontend UI/UX structure, section model, CSS/JS split strategy
- Layer: `docs/work/uiux/*`
- Owner-doc relation: subordinate to canonical `docs/PROJECT_STRUCTURE.md`, `docs/ARTEMIS_PRODUCT_SCOPE.md`, `docs/ARTEMIS_MASTER_PROMPT.md`
- Runtime status: planning / controlled migration guidance

---

# 1. Назначение

Документ фиксирует целевую UI/UX-структуру ARTEMIS для дальнейшего роста приложения.

Главная задача: не допустить повторного разрастания `index.html`, `css/style.css` и `js/ui.js` в неуправляемые монолиты при добавлении новых вкладок, страниц и product sections.

Этот документ не является canonical architecture source of truth. Он задаёт working contract для UI/UX-рефакторинга и будущих section-oriented изменений.

---

# 2. Базовая формула

ARTEMIS должен развиваться как:

```text
App Shell
+ Workspace Core
+ Product Sections
+ Shared Components
+ Shared Overlays
+ Feature Modules
```

Не как:

```text
index.html + style.css + ui.js + бесконечное добавление новых блоков
```

Главный экран ARTEMIS остаётся map-first workspace. Новые разделы не должны становиться конкурирующими центрами продукта.

---

# 3. Product hierarchy

## 3.1 Primary runtime

```text
Workspace Core
```

Workspace Core — главный runtime-экран:
- карта;
- временная ось;
- research slice;
- left rail;
- right inspector;
- selected object flow;
- layers/tools;
- spatial-temporal context.

## 3.2 Product sections

Будущие вкладки / sections:

```text
Stories
Courses
Saved / Library
Research / Slices
Profile / Settings
About / Help
```

Они должны использовать продуктовые сущности ARTEMIS, а не создавать отдельные mini-apps.

---

# 4. App Shell

## 4.1 Роль

App Shell — общая оболочка приложения.

Отвечает за:
- глобальную навигацию;
- активный section / route;
- profile/auth surface;
- global search entry;
- global status layer;
- overlay host;
- route/section switching.

## 4.2 Целевая структура

```text
App Shell
├─ Global Header / Navigation
├─ Route Outlet / Section Host
├─ Global Status Layer
├─ Global Overlay Host
└─ Auth/Profile Surface
```

## 4.3 Ограничения

App Shell не должен содержать business logic stories/courses/slices. Он только переключает и связывает sections.

---

# 5. Workspace Core

## 5.1 Роль

Workspace Core — main map-first runtime ARTEMIS.

Он владеет рабочей связкой:

```text
workspace-frame
├─ top dock
├─ main grid
│  ├─ left rail
│  ├─ map canvas
│  └─ optional right inspector
└─ bottom dock
```

## 5.2 Runtime contour baseline

Текущий accepted baseline:
- `#workspace-frame` — главный workspace frame;
- `#workspace-top-dock` — top dock;
- `#workspace-main` — main grid;
- `#explore-toolbar-shell` / `.map-tools-shell` — rail/tools area;
- `#map-container` — map canvas area;
- `#detail-panel` — optional right inspector;
- `#workspace-bottom-dock` — bottom dock;
- `#bottom-panel` — timeline content inside bottom dock.

## 5.3 CSS owner

`css/main-screen.css` — current isolated foundation override layer для main screen workspace.

Он не заменяет весь `css/style.css`, а временно работает как controlled split layer, подключённый после `style.css`.

---

# 6. Product Sections

## 6.1 Stories

Stories = guided historical paths поверх research slices.

Содержит:
- story list/library;
- story preview;
- guided story player;
- source slice linkage;
- return to workspace.

Не должен:
- дублировать карту как отдельный map runtime;
- создавать собственную state model, не связанную с slices.

## 6.2 Courses

Courses = educational paths поверх stories/slices.

Содержит:
- course library;
- course outline;
- progress/resume state;
- lesson/story linkage;
- return to workspace/story.

Не должен становиться независимой LMS внутри проекта.

## 6.3 Saved / Library

Saved / Library = сохранённые рабочие единицы.

Содержит:
- saved research slices;
- saved stories;
- saved courses;
- bookmarks;
- recent research context.

## 6.4 Research / Slices

Research / Slices = управление research slices.

Содержит:
- my slices;
- slice metadata;
- restore/open/delete flows;
- future compare/read-only snapshot flows.

## 6.5 Profile / Settings

Profile / Settings = пользовательская зона.

Содержит:
- account state;
- auth/session surface;
- user settings;
- drafts entry;
- moderation entry if role allows.

## 6.6 About / Help

About / Help = content/support section.

Содержит:
- project explanation;
- how to use;
- data/source policy;
- contribution rules;
- help/support copy.

---

# 7. Section Contract

Каждая новая вкладка / section должна иметь контракт до patch.

```text
Section Contract
├─ route id
├─ nav label
├─ mount node
├─ CSS owner
├─ JS owner
├─ state owner
├─ allowed overlays
├─ data dependencies
├─ map dependency
├─ mobile behavior
└─ checks
```

## 7.1 Минимальный шаблон

```text
Route ID:
Nav label:
Mount node:
CSS file:
JS module:
State owner:
Depends on:
Map dependency:
Allowed overlays:
Mobile behavior:
Checks:
```

## 7.2 Пример: Stories

```text
Route ID: stories
Nav label: Истории
Mount node: #stories-screen
CSS file: css/stories.css
JS module: js/features/stories.js
State owner: storiesState
Depends on: research slices, map context
Map dependency: optional restore-to-workspace context
Allowed overlays: story preview, story player
Mobile behavior: full-screen section or staged player
Checks: route switch, restore workspace, no map state loss
```

---

# 8. Target CSS structure

Целевая структура CSS после controlled migration:

```text
css/
├─ tokens.css
├─ base.css
├─ layout.css
├─ components.css
├─ workspace.css
├─ overlays.css
├─ forms.css
├─ stories.css
├─ courses.css
├─ saved.css
├─ profile.css
├─ moderation.css
├─ ugc.css
└─ legacy.css
```

## 8.1 Current transition state

Текущий transition state:

```text
css/
├─ style.css
└─ main-screen.css
```

- `style.css` — current base/legacy UI style layer;
- `main-screen.css` — isolated main-screen foundation override layer.

## 8.2 Migration rule

Новые CSS-файлы вводятся только при наличии ясного owner-scope:
- workspace;
- components;
- overlays;
- sections;
- forms;
- legacy.

Запрещено создавать файлы без owner-role.

---

# 9. Target JS structure

Целевая структура JS после controlled migration:

```text
js/
├─ app.js
├─ router.js
├─ state.js
├─ data.js
├─ map.js
├─ auth.js
├─ pwa.js
├─ ui/
│  ├─ shell.js
│  ├─ workspace.js
│  ├─ sliceBar.js
│  ├─ rail.js
│  ├─ timeline.js
│  ├─ detailPanel.js
│  ├─ components.js
│  ├─ overlays.js
│  ├─ responsive.js
│  └─ status.js
├─ features/
│  ├─ researchSlices.js
│  ├─ stories.js
│  ├─ courses.js
│  ├─ saved.js
│  ├─ profile.js
│  ├─ ugc.js
│  └─ moderation.js
└─ legacy/
   └─ ui.legacy.js
```

## 9.1 Current transition state

`js/ui.js` remains current UI bootstrap/legacy owner during migration.

Do not delete or rewrite `ui.js` in one step.

## 9.2 Split order

Recommended split order:

1. router / section state contract;
2. workspace orchestration;
3. timeline;
4. detail panel;
5. rail;
6. overlays;
7. stories/courses/saved/profile sections.

---

# 10. Target index.html role

`index.html` should move toward skeleton role:

```text
index.html = app shell + section mounts + shared overlays + bootstrap imports
```

Target shape:

```html
<div id="app-shell">
  <header id="app-header"></header>

  <main id="app-route">
    <section id="workspace-screen" data-route="workspace"></section>
    <section id="stories-screen" data-route="stories" hidden></section>
    <section id="courses-screen" data-route="courses" hidden></section>
    <section id="saved-screen" data-route="saved" hidden></section>
    <section id="profile-screen" data-route="profile" hidden></section>
    <section id="about-screen" data-route="about" hidden></section>
  </main>

  <div id="overlay-host"></div>
  <div id="status-host"></div>
</div>
```

This is target direction only. Do not rewrite current `index.html` wholesale without a dedicated audit and migration plan.

---

# 11. Shared components

Shared UI components should be centralized gradually.

```text
Shared Components
├─ buttons
├─ chips
├─ badges
├─ forms
├─ tabs
├─ cards
├─ panels
├─ modals
├─ dropdowns
├─ toasts
├─ empty states
└─ loading/error states
```

Rule: do not create local button/card/chip systems inside each new section unless there is a documented reason.

---

# 12. Shared overlays

Overlay types:
- modals;
- dropdowns;
- popovers;
- onboarding;
- loading/error overlays;
- toast/status layer;
- role-specific workspaces like moderation/UGC.

Overlays should not be confused with core layout.

Main layout should not depend on `.glass-panel`; transient overlays may continue using overlay-specific surfaces.

---

# 13. Migration plan

## Phase A — CSS split foundation

Current state:
- `css/main-screen.css` exists;
- loaded after `css/style.css`;
- owns current main-screen foundation overrides.

Next CSS steps:
1. document and protect `main-screen.css` role;
2. introduce `components.css` only when shared components are extracted;
3. introduce `overlays.css` only when overlay styles are extracted;
4. later rename/replace `main-screen.css` with `workspace.css` if/when structure is stable.

## Phase B — Section contract

Before adding new major tabs:
- define route IDs;
- define section mounts;
- define router behavior;
- define state preservation rules.

## Phase C — Router

Introduce minimal `js/router.js` only after section contract is accepted.

Router must:
- switch sections;
- preserve workspace state;
- set active nav;
- avoid map reinitialization unless explicit.

## Phase D — JS split

Gradually extract:
- `ui/workspace.js`;
- `ui/timeline.js`;
- `ui/detailPanel.js`;
- `ui/rail.js`.

## Phase E — Product sections

Add new sections only after router and section contract exist.

---

# 14. Anti-patterns

Запрещено:
- добавлять новые вкладки напрямую в `index.html` без section contract;
- продолжать расширять `style.css` как единственный UI layer;
- продолжать расширять `ui.js` как единственный UI runtime owner;
- создавать CSS/JS-файлы без owner-scope;
- делать Stories/Courses как отдельные mini-apps;
- делать AI chat отдельным главным центром продукта;
- менять архитектуру под видом маленького UI patch;
- переписывать весь frontend одним patch.

---

# 15. Definition of Ready for new UI section

Новая UI section готова к реализации только если определены:
- route id;
- product role;
- section owner;
- mount node;
- CSS owner;
- JS owner;
- state owner;
- dependencies;
- mobile behavior;
- checks;
- docs impact.

---

# 16. Definition of Done for UI structure changes

UI structure change считается завершённым только если:
- изменены только заявленные файлы;
- не создан competing source-of-truth;
- runtime не потерял workspace state;
- map-first hierarchy сохранена;
- docs sync выполнен;
- tests/checks прошли;
- future extension path не ухудшен.

---

# 17. Next actions

Recommended next actions:

1. Link this document from `ARTEMIS_UI_UX_SYSTEM.md` as working app-structure spec.
2. Link this document from `ARTEMIS_UI_UX_COMPONENT_MAP.md` as section/component structure reference.
3. Sync `PROJECT_STRUCTURE.md` only when repository structure actually changes beyond `css/main-screen.css`.
4. Prepare section contract for first future section before adding routes/pages.

---

# 18. Итог

Целевая UI/UX структура ARTEMIS:

```text
App Shell
├─ Workspace Core
├─ Product Sections
├─ Shared Components
├─ Shared Overlays
└─ Feature Modules
```

Current accepted migration principle:

```text
controlled split, not delete-and-rebuild
```

Главный экран остаётся ядром продукта. Новые sections должны расширять ARTEMIS, не разрушая map-first runtime и research-slice product model.
