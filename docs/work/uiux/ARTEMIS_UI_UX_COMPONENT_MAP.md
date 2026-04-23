# ARTEMIS_UI_UX_COMPONENT_MAP_v1.0

## Статус документа
Производный рабочий документ от:
- `ARTEMIS_CONCEPT.md`
- `ARTEMIS_PRODUCT_SCOPE.md`
- `docs/work/ARTEMIS_AI_STRATEGY_v1_0.md`
- `docs/work/uiux/ARTEMIS_UI_UX_SYSTEM.md`

Цель: перевести UI/UX-систему ARTEMIS в конкретную карту компонентов, состояний, зависимостей и приоритетов реализации.

---

## 1. Назначение документа

`docs/work/uiux/ARTEMIS_UI_UX_SYSTEM.md` описывает, **как должен работать интерфейс как система**.

`docs/work/uiux/ARTEMIS_UI_UX_COMPONENT_MAP.md` описывает:
- какие конкретно UI-блоки входят в продукт;
- какую функцию каждый блок выполняет;
- какие состояния он обязан поддерживать;
- какие блоки являются критическими для v1.0;
- в каком порядке их нужно реализовывать.

Это не визуальный гайд и не дизайн-макет.  
Это рабочая карта интерфейса для:
- куратора;
- архитектора;
- UI/UX-проектирования;
- Codex / coding agents;
- разбиения на задачи.

---

## 2. Главный принцип карты компонентов

Главный объект интерфейса ARTEMIS v1.0 — **research slice**.

Следовательно, все ключевые компоненты должны обслуживать один базовый цикл:

1. пользователь открывает тему;
2. ориентируется на карте и во времени;
3. собирает или находит нужную конфигурацию;
4. понимает, что в ней важно;
5. сохраняет её как slice;
6. возвращается к ней позже;
7. развивает её в story / course / comparison;
8. при необходимости использует AI assistance.

Если компонент не усиливает этот цикл, он не является load-bearing элементом v1.0.

---

## 3. Карта главных компонентных зон

ARTEMIS v1.0 должен состоять из 8 основных UI-зон:

1. **Global Shell**
2. **Map Workspace**
3. **Time System**
4. **Knowledge Detail System**
5. **Slice System**
6. **Story / Course System**
7. **AI Assistance System**
8. **Support / Utility Layer**

---

# 4. COMPONENT MAP

## 4.1 Global Shell

### 4.1.1 Top Navigation Bar
**Функция:**
- глобальная навигация;
- доступ к основным режимам;
- вход в profile/settings;
- контекст проекта.

**Минимальное содержимое:**
- логотип / название;
- primary navigation;
- profile / account entry;
- быстрый доступ к сохранённым сущностям, если это оправдано.

**Обязательные состояния:**
- default;
- compact;
- mobile collapsed;
- authenticated;
- unauthenticated.

**Приоритет:** A

**Почему важно:**  
Создаёт каркас продукта, но не должен доминировать над картой.

---

### 4.1.2 Route / Mode Switcher
**Функция:**
переключение между режимами:
- главная / исследование;
- срезы;
- stories;
- courses;
- о проекте.

**Обязательные состояния:**
- active mode;
- inactive mode;
- unavailable / disabled;
- mobile drawer mode.

**Приоритет:** A

---

## 4.2 Map Workspace

### 4.2.1 Main Map Canvas
**Функция:**
главная рабочая поверхность.

**Обязательные свойства:**
- spatial context;
- interaction with objects;
- layer rendering;
- viewport changes;
- support for selection state.

**Обязательные состояния:**
- loading;
- ready;
- empty/no data;
- filtered state;
- focus state;
- compare-aware state;
- error state.

**Приоритет:** A+

**Почему важно:**  
Это центральная поверхность продукта.

---

### 4.2.2 Object Marker / Spatial Entity Node
**Функция:**
визуальное представление объекта, события, маршрута или кластера.

**Обязательные состояния:**
- default;
- hover;
- selected;
- related;
- clustered;
- filtered out;
- disabled / unavailable.

**Приоритет:** A

**Важно:**  
Маркер не должен быть перегружен информацией.  
Он только даёт вход в deeper context.

---

### 4.2.3 Layer Control Panel
**Функция:**
управление слоями данных.

**Обязательные действия:**
- включить/выключить слой;
- показать активные слои;
- быстро понять визуальную и смысловую роль слоя.

**Обязательные состояния:**
- collapsed;
- expanded;
- active set;
- empty set;
- search/filter within layers.

**Приоритет:** A

---

### 4.2.4 Spatial Filter Tools
**Функция:**
фильтрация по пространству / категории / типам объектов.

**Обязательные состояния:**
- no filters;
- active filters;
- conflicting filters;
- no results.

**Приоритет:** B

---

## 4.3 Time System

### 4.3.1 Timeline Bar
**Функция:**
главный временной интерфейс продукта.

**Обязательные действия:**
- перемещение по времени;
- выбор диапазона;
- быстрый обзор периода;
- связь с картой и слоями.

**Обязательные состояния:**
- idle;
- active range;
- single point;
- playback / guided motion;
- disabled because of data limits;
- mobile compressed state.

**Приоритет:** A+

**Почему важно:**  
Без сильного timeline ARTEMIS теряет вторую половину своего ядра.

---

### 4.3.2 Time Range Control
**Функция:**
точный выбор интервала.

**Обязательные состояния:**
- no range selected;
- selected range;
- invalid range;
- snapped range;
- preset range.

**Приоритет:** A

---

### 4.3.3 Temporal Context Indicator
**Функция:**
показывать пользователю:
- какой период активен;
- на что он сейчас смотрит;
- как это влияет на карту.

**Приоритет:** B

---

## 4.4 Knowledge Detail System

### 4.4.1 Object Preview Card
**Функция:**
быстрый предварительный просмотр выбранной сущности.

**Содержимое:**
- title;
- dates / temporal anchor;
- layer/category;
- short description;
- quick actions.

**Обязательные состояния:**
- hidden;
- preview open;
- loading;
- unavailable;
- related-highlight mode.

**Приоритет:** A

---

### 4.4.2 Detail Panel
**Функция:**
углублённый просмотр объекта / события / процесса / маршрута.

**Содержимое:**
- core identity;
- expanded description;
- key relations;
- source/provenance entry;
- timeline context;
- related objects;
- actions to save / compare / add to slice/story/course.

**Обязательные состояния:**
- closed;
- preview mode;
- full mode;
- pinned;
- loading;
- no content;
- error.

**Приоритет:** A+

---

### 4.4.3 Related Entities Block
**Функция:**
показывать связи выбранной сущности.

**Обязательные состояния:**
- populated;
- empty;
- grouped;
- filtered by relation type.

**Приоритет:** B

---

### 4.4.4 Provenance / Source Block
**Функция:**
показывать происхождение данных.

**Обязательные состояния:**
- verified source;
- partial source;
- missing source marker;
- hidden if unavailable.

**Приоритет:** A

**Почему важно:**  
Это опорный trust-компонент.

---

## 4.5 Slice System

### 4.5.1 Slice Create Action
**Функция:**
сохранить текущее исследовательское состояние как slice.

**Что должно входить в slice:**
- viewport;
- active time/range;
- active layers;
- selected objects;
- active filters;
- optional note/context.

**Обязательные состояния:**
- available;
- disabled;
- saving;
- saved;
- error.

**Приоритет:** A+

---

### 4.5.2 Slice Save Dialog / Sheet
**Функция:**
дать пользователю оформить сохранение slice.

**Минимальное содержимое:**
- title;
- optional description;
- tags / theme;
- visibility mode if нужно;
- confirm save.

**Обязательные состояния:**
- open;
- validating;
- success;
- duplicate warning;
- failure.

**Приоритет:** A

---

### 4.5.3 Saved Slice List
**Функция:**
список сохранённых срезов.

**Обязательные действия:**
- open;
- rename;
- duplicate;
- delete/archive;
- compare;
- convert to story/course draft.

**Обязательные состояния:**
- empty;
- populated;
- search results;
- filtered;
- loading.

**Приоритет:** A

---

### 4.5.4 Slice View / Restore Action
**Функция:**
восстановить saved slice в workspace.

**Обязательные состояния:**
- restore ready;
- restoring;
- restored;
- incompatible / missing data warning.

**Приоритет:** A+

---

### 4.5.5 Slice Compare Mode
**Функция:**
сравнивать два среза.

**Обязательные состояния:**
- compare not started;
- selecting slice A/B;
- compare active;
- compare explanation available;
- compare impossible.

**Приоритет:** B+

---

## 4.6 Story / Course System

### 4.6.1 Story Entry Card
**Функция:**
вход в curated story.

**Содержимое:**
- title;
- theme;
- time span;
- short framing;
- expected route / scope.

**Приоритет:** B

---

### 4.6.2 Story Step Viewer
**Функция:**
пошаговый просмотр story как последовательности slices.

**Обязательные элементы:**
- current step;
- narrative explanation;
- map change;
- time change;
- previous/next controls.

**Обязательные состояния:**
- start;
- in progress;
- end;
- paused;
- loading.

**Приоритет:** A

**Почему важно:**  
Это одна из ключевых форм превращения research layer в guided experience.

---

### 4.6.3 Course Player
**Функция:**
режим учебного прохождения.

**Обязательные элементы:**
- lesson structure;
- step progression;
- explanation blocks;
- link to slice/map state;
- progress state.

**Обязательные состояния:**
- not started;
- in progress;
- completed;
- resume;
- unavailable.

**Приоритет:** B+

---

### 4.6.4 Story / Course Outline Panel
**Функция:**
обзор структуры story/course.

**Приоритет:** B

---

## 4.7 AI Assistance System
Примечание архитектуры v1.0: AI — contextual layer в рабочих режимах, не отдельный detached section.

### 4.7.1 AI Entry Point
**Функция:**
точка вызова AI assistance из контекста объекта, slice, story или comparison.

**Обязательные состояния:**
- available;
- unavailable;
- loading;
- rate-limited / disabled.

**Приоритет:** A

---

### 4.7.2 AI Explain Panel
**Функция:**
объяснение текущего объекта или среза.

**Типы output:**
- explanation;
- summary;
- contextual framing.

**Обязательные состояния:**
- empty;
- generating;
- generated;
- failed;
- stale.

**Приоритет:** A

---

### 4.7.3 AI Compare Panel
**Функция:**
объяснять различия между двумя срезами.

**Приоритет:** B+

---

### 4.7.4 AI Suggest / Hypothesis Block
**Функция:**
показывать возможные гипотезы, связанные объекты, направления исследования.

**Обязательные требования:**
- жёсткая маркировка как hypothesis/suggestion;
- визуальное отличие от facts.

**Приоритет:** B

---

### 4.7.5 Epistemic Status Marker
**Функция:**
визуально различать:
- fact;
- relation;
- interpretation;
- hypothesis.

**Приоритет:** A+

**Почему важно:**  
Это ключевой trust-компонент AI-слоя.

---

### 4.7.6 AI Provenance / Basis Block
**Функция:**
показывать, на каких данных основан AI-output.

**Приоритет:** A

---

## 4.8 Support / Utility Layer

### 4.8.1 Search
**Функция:**
поиск объектов, тем, сохранённых срезов, stories/courses.

**Обязательные состояния:**
- idle;
- typed query;
- results;
- no results;
- recent / suggested;
- loading.

**Приоритет:** A

---

### 4.8.2 Notifications / Status Feedback
**Функция:**
давать короткую понятную обратную связь:
- slice saved;
- state restored;
- no results;
- AI unavailable;
- data loading.

**Приоритет:** A

---

### 4.8.3 Empty States
**Функция:**
объяснять, что делать дальше, если:
- нет данных;
- нет сохранённых slices;
- поиск пустой;
- фильтр ничего не дал.

**Приоритет:** A

---

### 4.8.4 Error States
**Функция:**
показывать ошибки без разрушения workflow.

**Приоритет:** A

---

### 4.8.5 Loading States / Skeletons
**Функция:**
сохранять ощущение непрерывности интерфейса.

**Приоритет:** A

---

### 4.8.6 Mobile Navigation Sheet / Drawer
**Функция:**
контролировать навигацию и доступ к secondary actions на mobile.

**Приоритет:** A

---

# 5. Матрица приоритетов

## Priority A+ — абсолютно load-bearing
- Main Map Canvas
- Timeline Bar
- Detail Panel
- Slice Create Action
- Slice Restore Action
- Epistemic Status Marker

## Priority A — критично для рабочего ядра
- Top Navigation Bar
- Route / Mode Switcher
- Layer Control Panel
- Time Range Control
- Object Preview Card
- Provenance Block
- Slice Save Dialog
- Saved Slice List
- AI Entry Point
- AI Explain Panel
- AI Provenance Block
- Search
- Status Feedback
- Empty/Error/Loading States
- Mobile Navigation

## Priority B / B+
- Spatial Filters
- Related Entities Block
- Slice Compare Mode
- Story Entry Card
- Story Outline
- Course Player
- AI Compare Panel
- AI Suggest Block
- Temporal Context Indicator

## Priority C — позже
- secondary polish layers;
- advanced personalization;
- non-essential authoring conveniences;
- tertiary profile features.

---

# 6. Зависимости между компонентами

## Базовые зависимости
- `Detail Panel` зависит от `Map Canvas` и selection state.
- `Slice System` зависит от `Map Workspace + Time System + Layer Control + Filters`.
- `Story Step Viewer` зависит от `Slice logic`.
- `Course Player` зависит от `Story/Slice logic`.
- `AI Explain` зависит от:
  - object context;
  - slice context;
  - provenance model;
  - epistemic markers.
- `Compare Mode` зависит от `Saved Slice List + Restore logic + AI Compare`.

---

# 7. Минимальный набор для первого рабочего релиза UI/UX v1.0

Минимальный UI-слой, без которого ARTEMIS не должен считаться собранным как продукт:

1. Top Navigation Bar  
2. Main Map Canvas  
3. Timeline Bar  
4. Layer Control Panel  
5. Object Preview Card  
6. Detail Panel  
7. Slice Create Action  
8. Slice Save Dialog  
9. Saved Slice List  
10. Slice Restore Action  
11. Search  
12. AI Entry Point  
13. AI Explain Panel  
14. Epistemic Status Marker  
15. Provenance Block  
16. Empty / Error / Loading States  
17. Базовый Story Step Viewer

Если этого набора нет, ARTEMIS остаётся либо data-demo, либо partial prototype.

---

# 8. Компоненты, которые нельзя делать раньше ядра

Следующие блоки нельзя ставить в приоритет выше базового ядра:

- сложный profile area;
- расширенная социальность;
- открытые community feeds;
- декоративные AI-features без epistemic control;
- крупные creator workflows;
- тяжёлые UGC-интерфейсы;
- advanced course gamification;
- speculative counterfactual UI.

---

# 9. Решение по старому Artemis_UI_UX_Report

`Artemis_UI_UX_Report`:
- **оставить**
- использовать как **диагностический и reference-документ**
- не использовать как основной рабочий spec

Основным рабочим набором должны стать:
1. `docs/work/uiux/ARTEMIS_UI_UX_SYSTEM.md`
2. `docs/work/uiux/ARTEMIS_UI_UX_COMPONENT_MAP.md`

---

# 10. Итог

`docs/work/uiux/ARTEMIS_UI_UX_COMPONENT_MAP.md` фиксирует:
- что конкретно должно быть в интерфейсе;
- что является ядром;
- какие состояния обязательны;
- что делать сначала, а что позже.

Это защищает ARTEMIS от двух частых ошибок:
1. хаотичной реализации UI по фрагментам;
2. ухода в визуальные детали до сборки продуктового ядра.

Краткая формула:

**Сначала — map + time + detail + slice + explainable AI.  
Потом — story/course/compare.  
Потом — всё остальное.**
