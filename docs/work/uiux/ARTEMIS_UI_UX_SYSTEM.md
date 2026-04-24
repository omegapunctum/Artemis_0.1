# ARTEMIS_UI_UX_SYSTEM_v1.0

## Статус документа
Рабочий системный документ UI/UX уровня v1.0.

Назначение:
- перевести концепцию ARTEMIS v1.0 в интерфейсную систему;
- зафиксировать, как пользователь реально работает с продуктом;
- устранить разрыв между концепцией, продуктовым scope и существующими UI/UX-наблюдениями;
- заменить роль разрозненных UX-рекомендаций на цельную рабочую модель интерфейса.

Этот документ не отменяет `Artemis_UI_UX_Report`, а использует его как аналитическую основу.
`Artemis_UI_UX_Report` следует рассматривать как source report / diagnostic layer.
`docs/work/uiux/ARTEMIS_UI_UX_SYSTEM.md` — основной UI/UX working spec для реализации v1.0.
`docs/work/uiux/ARTEMIS_UI_UX_VISUAL_SYSTEM.md` — отдельный owner-doc для visual design layer: official style, palette, typography, text tone, state semantics and design-token baseline.

> Status sync (2026-04-22): main-screen visual baseline зафиксирован в owner-doc visual layer; для shell/top controls/detail panel/timeline действует правило audit-first (без инерционного repatch в рамках текущего цикла).
>
> Detail-panel sync (2026-04-22): принят current runtime baseline для epistemic first-pass внутри detail panel (factual/meta, provenance/source, uncertainty/confidence-adjacent, related/relation-like). Это не конкурирующий source-of-truth и не полная глобальная epistemic system; authoritative visual semantics остаётся в owner-doc `ARTEMIS_UI_UX_VISUAL_SYSTEM.md`.
>
> Typography/palette safe-zone sync (2026-04-23): controlled alignment cycle (token-only patch, selective selector adoption, editorial font routing, final audit) закрыт для safe UI zones. Текущее состояние принято как **working baseline for safe-zone visual contract alignment**; это не completion of global visual adoption. Future tracks остаются отдельными: detail panel full adoption, timeline adoption, modal/light legacy consistency.
>
> Detail-panel adoption sync (2026-04-23): detail panel прошёл controlled adoption cycle (selector adoption + full-mode token consistency micro-patch + final audit) и принят как **temporary post-adoption baseline**. Ключевые typography/semantic improvements зафиксированы, preview/full mechanics сохранены. Residual visual points классифицированы как optional future hardening и не reopen’ят текущий track; дальнейшие изменения detail — только audit-first.
>
> Main-screen cleanup sync (2026-04-23): current main-screen cleanup baseline принят как **working baseline** после top-area hierarchy cleanup, route/mode leakage containment и финального cold audit. Baseline включает: global shell + one contextual strip, map-first exploration scene, slice-core centered exploration, compare как readiness/context layer, story/course containment в default exploration state, preserved mobile staged logic. Это **не** completion of full main-screen polish; residual points — только optional future tuning и не reopen’ят текущий cleanup track. Любые следующие изменения главного экрана — только audit-first.

> Main-screen refinement track sync (2026-04-23): отдельный working pack для `main screen / primary workspace` refinement принят как **track-specific target layer** внутри текущего UI/UX цикла. Документы `2026-04-23_UIUX_MAIN_SCREEN_TECHNICAL_SPEC_ACTIVE_v1_0.md`, `2026-04-23_UIUX_MAIN_SCREEN_ART_DIRECTION_SPEC_ACTIVE_v1_0.md` и связанные prompt-docs конкретизируют target-состояние главного экрана, но не заменяют owner-doc роли `ARTEMIS_UI_UX_SYSTEM.md` и `ARTEMIS_UI_UX_VISUAL_SYSTEM.md`. Любой переход от этого pack к runtime patch остаётся audit-first.

Следовательно:
- `ARTEMIS_UI_UX_SYSTEM.md` фиксирует UX-архитектуру, режимы, информационную структуру и поведение интерфейса как системы;
- `ARTEMIS_UI_UX_VISUAL_SYSTEM.md` фиксирует, как эта система должна выглядеть.

---

# 1. Роль UI/UX в ARTEMIS

## 1.1 Базовая установка
ARTEMIS — не обычная карта и не обычная энциклопедия.
Следовательно, интерфейс ARTEMIS не может быть:
- просто оболочкой вокруг карты;
- просто набором фильтров и карточек;
- просто “историческим сайтом” с картой в центре.

UI/UX ARTEMIS должен поддерживать 4 вещи одновременно:
1. исследование;
2. ориентацию в пространстве и времени;
3. сбор и сохранение исследовательского контекста;
4. объяснимую AI-помощь.

## 1.2 UI/UX mission
Миссия интерфейса ARTEMIS:
**сделать работу с пространственно-временным знанием понятной, управляемой, исследовательски полезной и совместимой с explainable AI assistance.**

## 1.3 Главная задача интерфейса
Главная задача интерфейса — не “показать много данных”, а:
- помочь пользователю собрать конфигурацию исследования;
- удержать контекст;
- показать динамику во времени;
- позволить вернуться к исследованию;
- превратить исследование в story, course или comparison;
- использовать AI как слой понимания, а не шум.

---

# 2. Главный объект интерфейса

## 2.1 Primary UX object
Главный объект интерфейса ARTEMIS v1.0:
**Research Slice / Исследовательский срез**

## 2.2 Почему не объект
Отдельный объект на карте:
- важен как сущность базы;
- нужен для навигации;
- полезен как точка входа.

Но объект не является главным UX-центром, потому что:
- не удерживает исследовательский контекст;
- не описывает конфигурацию пространства + времени + слоёв;
- не создаёт полноценного product loop.

## 2.3 Почему slice
Исследовательский срез позволяет пользователю работать не с отдельной точкой, а с конфигурацией:
- карта / регион / масштаб;
- временной интервал;
- активные слои;
- выделенные объекты;
- фильтры;
- связи;
- тема исследования;
- состояние понимания.

Именно slice должен стать:
- единицей сохранения;
- единицей возврата;
- единицей шаринга;
- единицей сравнения;
- основой для story и course;
- объектом AI explanation.

---

# 3. UX-принципы системы

## 3.1 Map-first, but not map-only
Карта — центр интерфейса, но не единственный смысловой слой.
Рядом с картой должны существовать:
- время;
- срез;
- детали;
- narrative;
- AI.

## 3.2 Time is structural, not decorative
Время — не вторичный фильтр, а одна из осей продукта.

## 3.3 Context over clutter
ARTEMIS неизбежно работает со сложностью.
Значит, интерфейс должен бороться не за максимальную насыщенность, а за:
- контекст;
- иерархию;
- постепенное раскрытие;
- локальную ясность.

## 3.4 Progressive disclosure
Информация открывается по уровням:
- уровень 1 — обзор;
- уровень 2 — preview;
- уровень 3 — detail;
- уровень 4 — expanded analysis / AI / story context.

## 3.5 Explainability over spectacle
Если есть выбор между “вау-интерфейсом” и понятным исследовательским интерфейсом, ARTEMIS выбирает второе.

## 3.6 Fact vs interpretation visibility
Интерфейс обязан делать видимой разницу между:
- фактом;
- связью;
- интерпретацией;
- гипотезой;
- AI suggestion.

## 3.7 Returnability
Исследование должно быть возвращаемым.
Следовательно, в UX должны быть сильными:
- save;
- resume;
- share;
- compare.

## 3.8 Mobile is not a shrunken desktop
Mobile-версия ARTEMIS — это отдельная логика:
- меньше параллельных панелей;
- больше staged interaction;
- выше роль bottom sheet / stacked flows.

---

# 4. Основной пользовательский сценарий

## 4.1 Primary loop
Базовый цикл ARTEMIS v1.0:
1. Пользователь открывает тему.
2. Видит карту + время + релевантный контекст.
3. Находит или собирает исследовательский срез.
4. Сохраняет его.
5. Возвращается к нему.
6. Развивает его в story / comparison / collection / course.
7. Использует AI для объяснения и уточнения.

## 4.2 UI-следствие из primary loop
Если фича не помогает хотя бы одному из этих шагов, она не должна становиться центральной в UI v1.0.

---

# 5. Информационная архитектура desktop

## 5.1 Основные зоны интерфейса
Desktop ARTEMIS должен состоять из 6 основных зон:
1. Top header / project shell
2. Map canvas
3. Time axis
4. Context / layer controls
5. Detail / slice panel
6. Narrative / AI overlays or modes

## 5.1.1 Screen architecture baseline (v1.0 lock)
Главный экран ARTEMIS v1.0 = **Exploration / Workspace Core**.

На главном экране постоянно живут только:
- top shell;
- map canvas;
- timeline;
- compact slice context;
- detail preview/full;
- search + support states;
- contextual layer/filter tools.

На главном экране **не держим постоянно**:
- full slices manager;
- story library/player;
- course library/player;
- compare surface;
- detached AI panel;
- multiple parallel top bars.

Route/section model v1.0:
- Главная / Исследование;
- Срезы;
- Stories;
- Courses;
- О проекте.

Архитектурные фиксации v1.0:
- Compare = analytical mode, не отдельный top-level route;
- AI = contextual layer inside workspace/story/course flows, не detached section;
- baseline обязателен для снижения overload и исключения competing panels without hierarchy.

## 5.2 Top header / project shell
Функции:
- навигация по основным разделам;
- доступ к профилю/настройкам;
- быстрый доступ к search / saved items / courses;
- глобальные статусные сообщения;
- вход в режимы story/course.

## 5.3 Map canvas
Карта — главная визуальная сцена.
Она должна:
- показывать пространственную конфигурацию;
- реагировать на время;
- быть устойчивой к плотности объектов;
- поддерживать selection and focus;
- служить основой для slice state.

## 5.4 Time axis
Таймлайн — вторая главная ось.
Функции:
- выбор периода;
- просмотр изменения состояния;
- сравнение временных конфигураций;
- участие в сохранении slice.

## 5.5 Context / layer controls
Эта зона отвечает за:
- слои;
- фильтры;
- категории;
- режимы видимости;
- поиск по исследованию.

## 5.6 Detail / slice panel
Это главный боковой контейнер смысловой информации.
Внутри него живут:
- preview объекта;
- полный detail view;
- slice metadata;
- related entities;
- sources;
- AI explanation;
- story step context;
- compare context.
- Status note: текущий first-pass epistemic baseline detail panel уже зафиксирован в visual owner-doc и считается достаточным до следующего audit.

## 5.7 Narrative / AI modes
Нужны чёткие режимы:
- exploration mode
- story mode
- course mode
- AI explanation mode
- compare mode

---

# 6. Информационная архитектура mobile

## 6.1 Основной принцип
Mobile ARTEMIS — staged workspace.

## 6.2 Mobile-зоны
1. top bar
2. map
3. compact timeline
4. bottom sheet for preview/detail
5. secondary stacked sheet for story/AI/course actions

## 6.3 Чего нельзя делать на mobile
Нельзя:
- переносить desktop-панель один в один;
- держать несколько тяжёлых зон раскрытыми одновременно;
- делать карту почти невидимой из-за UI.
- зеркалить desktop multi-panel layout в мобильный стек.

## 6.4 Mobile core flow
1. пользователь перемещается по карте;
2. выбирает объект или конфигурацию;
3. получает compact preview;
4. раскрывает detail;
5. при необходимости сохраняет slice;
6. запускает AI explanation или story step;
7. возвращается назад без потери контекста.

---

# 7. Slice UX system

## 7.1 Что такое slice в интерфейсе
Slice должен быть представлен как:
- сохранённое исследовательское состояние;
- единица понимания;
- единица возвращения;
- единица работы с AI;
- единица narrative.

## 7.2 Из чего состоит slice
Slice должен включать:
- viewport / zoom;
- time state;
- active layers;
- selected entities;
- filter state;
- optional title;
- optional note/context;
- optional AI summary.

## 7.3 Базовые действия со slice
Обязательные действия:
- create
- save
- rename
- reopen
- update
- share
- compare
- use in story
- use in course

## 7.4 Когда пользователь должен встречать slice
Slice не должен быть спрятан глубоко.

## 7.5 UX-сигналы slice
Интерфейс должен показывать:
- текущий slice state изменён / не сохранён;
- slice сохранён;
- slice отличается от исходного;
- этот slice используется в story/course.

## 7.6 Status sync before Story Layer audit (2026-04-23)
- Текущее состояние Slice Core считается **phase-safe for Story Layer audit**.
- Story Layer audit можно начинать без дополнительного обязательного runtime patch в Slice Core.
- Открытые ограничения зафиксированы как micro-hardening backlog:
  - partial/stale restore warning surface;
  - full filter-state capture в slice payload.

---

# 8. Object UX system

## 8.1 Роль объекта
Объект — входная точка в исследование.

## 8.2 Preview → Full detail
Объект должен раскрываться по схеме:
1. краткий preview
2. расширенный detail

## 8.3 Preview должен содержать
Минимально:
- название;
- дата / период;
- тип / слой;
- короткое описание;
- быстрые действия:
  - подробнее
  - добавить в исследование
  - использовать как anchor for slice

## 8.4 Full detail должен содержать
- полное описание;
- временной контекст;
- пространственный контекст;
- слой / категория;
- связанные объекты;
- источники;
- AI explanation;
- действия:
  - focus on map
  - add to slice
  - compare
  - use in story/course

---

# 9. Story UX system

## 9.1 Что такое story в ARTEMIS
Story — не длинный текст рядом с картой.
Story — это:
- последовательность срезов;
- narrative logic;
- пространственно-временное движение;
- объяснение изменений.

## 9.2 Роль story
Story нужна для:
- guided exploration;
- объяснения темы;
- перехода от исследования к повествованию;
- обучения через конфигурации, а не через сплошной текст.

## 9.3 Story step
Каждый шаг story должен включать:
- активный slice;
- заголовок шага;
- короткий narrative text;
- optional AI explanation;
- next / previous logic.

## 9.4 Story mode
В story mode интерфейс должен:
- уменьшать лишний control noise;
- усиливать последовательность;
- сохранять возможность выйти в свободное исследование.

## 9.5 Status sync before story-focused patch cycle (2026-04-23)
- Story-focused patch cycle разрешён к запуску.
- Текущий runtime story считается достаточным baseline для старта Phase C.
- Это status-note на старт работ, а не признак завершения Phase C.
- Главный gap Story Layer: narrative depth режима, story-specific mode signals, clean return-to-exploration semantics.

## 9.6 Status sync after early Phase C patch cycle (2026-04-23)
- Текущий Story Layer принят как **temporary Phase C baseline**.
- В baseline уже собраны: guided traversal, mode distinction, safe return to exploration, step-specific narrative context baseline, map/time/slice synchronization per step.
- Это не completion of Phase C и не competing source-of-truth для других phase docs.
- Residual gap зафиксирован как один следующий micro-enhancement: story step state framing / guided depth improvement (без reopen всего Story Layer).

---

# 10. Course UX system

## 10.1 Что такое course
Course — это guided educational path, построенный на базе slices и stories.

## 10.2 Чего course не должен делать
Course не должен быть:
- просто блоком длинных текстов;
- видеокурсом без spatial-temporal interaction;
- набором страниц вне карты.

## 10.3 Course должен делать
- вести пользователя через тему;
- использовать срезы как учебные сцены;
- давать последовательный исследовательский опыт;
- позволять сохранять прогресс.

## 10.4 Связь story и course
- story = narrative path
- course = structured educational path

## 10.5 Course gate sync (2026-04-23)
- Course-focused patch cycle можно открывать.
- Текущий runtime course принят как **sufficient thin baseline** для старта Phase D (thin orchestration wrapper around stories на рабочем уровне).
- Это **не** completion of Phase D.
- Главные стартовые gaps Course Layer:
  - meaningful progress/resume semantics;
  - более явная course-specific educational mode depth/identity.

## 10.6 Status sync after early Phase D patch cycle (2026-04-23)
- Текущий Course Layer принят как **temporary Phase D baseline**.
- В baseline зафиксированы:
  - meaningful progress/resume semantics;
  - корректные semantics для `Начать` / `Продолжить` / `Пройти заново`;
  - course-owned mode framing;
  - deterministic exit/delete path;
  - стабильная course -> story -> slice linkage.
- Это **не** completion of Phase D и не competing source-of-truth для других phase docs.
- Remaining gaps зафиксированы как следующий refinement layer и **не reopen'ят** текущий baseline:
  - pedagogical depth;
  - objectives/checkpoints/learning framing;
  - weaker conceptual dependence on story runtime;
  - clarify `in_progress@step0` vs `resume_available`.

---

# 11. Compare UX system

## 11.1 Зачем нужен compare
Compare — важнейшая исследовательская функция.

## 11.2 Что можно сравнивать
- два периода;
- два региона;
- два slices;
- два набора объектов;
- две конфигурации слоёв.

## 11.3 Как compare должен работать
Базовый вариант:
- пользователь выбирает два slices;
- интерфейс показывает их различия;
- AI может объяснить отличие;
- пользователь может перейти в любой из них.

---

# 12. AI UX system

## 12.1 Роль AI в интерфейсе
ИИ — не отдельный “магический раздел”.
Он должен быть встроен в исследовательский поток.

## 12.2 Основные AI-режимы v1.0
1. Explain
2. Compare
3. Suggest

## 12.3 Explain mode
Вызов:
- от объекта;
- от slice;
- от story step;
- от course step.

## 12.4 Compare mode
Вызов:
- при выборе двух slices;
- при сравнении периодов / регионов.

## 12.5 Suggest mode
Что делает:
- предлагает связанные объекты;
- предлагает следующий шаг исследования;
- предлагает слабые гипотезы;
- предлагает сравнения.

## 12.6 Эпистемическая маркировка AI
Каждый AI-output должен иметь видимый статус:
- факт
- интерпретация
- гипотеза
- suggestion

## 12.7 Provenance UX
Если AI делает meaningful statement, пользователь должен видеть:
- на чём это основано;
- какие данные использованы;
- где ограничения.

## 12.8 Anti-pattern
Нельзя делать AI как:
- floating chatbot, не связанный с состоянием карты;
- универсальный текстовый ассистент вне текущего slice;
- голос уверенности без источников.

---

# 13. Search and discovery UX

## 13.1 Search
Поиск в ARTEMIS должен искать не только объекты, но и:
- темы;
- slices;
- stories;
- courses;
- регионы;
- периоды.

## 13.2 Discovery
Важна guided discovery:
- связанные объекты;
- похожие slices;
- thematic entry points;
- suggested next research step.

---

# 14. Visual system

## 14.1 Визуальная позиция
ARTEMIS должен выглядеть:
- современно;
- интеллектуально;
- спокойно;
- не музейно;
- не игрово;
- не перегруженно.

## 14.2 Карта
Карта должна быть читаемой.

## 14.3 Панели и карточки
Панели:
- сдержанные;
- функциональные;
- с ясной иерархией;
- без избыточной декоративности.

Карточки:
- компактные в preview;
- содержательные в detail.

## 14.4 Типографика и текст
Тексты должны быть:
- короткими на первом уровне;
- разворачиваемыми на втором;
- пригодными для исследования.

## 14.5 Граница ответственности visual layer
Данный раздел фиксирует только верхнеуровневые визуальные требования как часть UX-системы.

Owner-doc для visual design layer ARTEMIS:
- `docs/work/uiux/ARTEMIS_UI_UX_VISUAL_SYSTEM.md`

Именно там должны жить:
- official visual formula;
- palette;
- typography system;
- text tone;
- state semantics;
- epistemic color semantics;
- design token baseline.

Следовательно, `ARTEMIS_UI_UX_SYSTEM.md` не должен дублировать visual-system doc, а только задаёт UX-рамку, внутри которой visual layer должен работать.

---

# 15. Interaction states

## 15.1 Обязательные состояния
Нужны states:
- loading
- empty
- no results
- invalid filter combination
- no AI result
- no saved slices
- offline / partial availability
- data pending
- ambiguous AI suggestion

## 15.2 Loading
Loading не должен:
- висеть бесконечно;
- перекрывать всё без необходимости.

## 15.3 Empty state
Пустое состояние должно:
- объяснять, почему пусто;
- предлагать следующий шаг.

## 15.4 Error state
Ошибка должна:
- быть локальной;
- не ломать всю карту;
- позволять восстановиться.

---

# 16. Accessibility and trust

## 16.1 Accessibility
Нужны:
- keyboard access;
- ARIA для critical interactive zones;
- понятный focus order;
- readable contrast.

## 16.2 Trust
Доверие в ARTEMIS строится через:
- ясность;
- provenance;
- стабильность;
- различение факта и гипотезы.

---

# 17. Anti-patterns

Запрещены:
1. карта как декоративный фон;
2. таймлайн как второстепенный widget;
3. объект как единственная смысловая единица;
4. длинные narrative-блоки без slice interaction;
5. AI как отдельный чат без контекста;
6. смешение факта и гипотезы;
7. desktop-first без mobile rethinking;
8. перегруженный header;
9. competing panels without hierarchy;
10. попытка показать всё сразу.

---

# 18. Приоритеты реализации UI/UX v1.0

## Приоритет A
- map-time workspace
- preview/detail logic
- slice UX
- save/restore/share state
- stable mobile interaction baseline

## Приоритет B
- story mode
- course mode
- compare mode
- AI explain / compare

## Приоритет C
- advanced discovery
- extended personalization
- authoring conveniences
- deeper AI suggest layer

---

# 19. Что делать с Artemis_UI_UX_Report

## Решение
`Artemis_UI_UX_Report`:
- не удалять;
- не использовать как главный spec;
- использовать как диагностический и reference-материал;
- перевести в reference/archive status после принятия этого документа.

## Причина
Отчёт ценен как:
- диагностика;
- набор сильных инсайтов;
- фиксация найденных UX-проблем.

Но он не является финальной системной UI/UX-моделью v1.0.

---

# 20. Итоговая формула UI/UX ARTEMIS

## Краткая формула
UI/UX ARTEMIS v1.0 =
**map-first spatial-temporal research workspace centered on research slices, supported by stories, courses, compare flows and explainable AI.**

## Практическая формула
Если интерфейсный элемент:
- не помогает исследовать пространство и время,
- не усиливает slice,
- не удерживает контекст,
- не поддерживает explainable AI usage,

то он не должен становиться центральным для ARTEMIS v1.0.

---

# 21. Финальный вывод
ARTEMIS_UI_UX_SYSTEM_v1.0 должен превратить ARTEMIS:
- из карты с дополнительными возможностями
- в полноценную исследовательскую среду.

Ключ к этому:
- map-time architecture;
- slice-centered interaction;
- progressive disclosure;
- story/course flows;
- explainable AI integration;
- доверительный, не перегруженный интерфейс.
