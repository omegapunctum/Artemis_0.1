# ARTEMIS_UI_UX_VISUAL_SYSTEM_v1.0

## Статус документа
Рабочий системный документ visual layer для UI/UX уровня v1.0.

> Status update (2026-04-22): текущий visual state главного экрана принят как **working visual baseline** (calm dense shell, calmer top controls, editorial detail panel, corrected timeline, preserved map primacy). Текущий цикл малого visual hardening/correction для этих зон завершён; дальнейшие изменения по ним допускаются только через отдельный audit.
>
> Status sync (2026-04-22): для `detail panel` зафиксирован **current baseline for epistemic first-pass** на runtime-уровне (различение factual/meta, provenance/source, uncertainty/confidence-adjacent и related/relation-like слоёв). Это локальный baseline detail-зоны, а не полная глобальная epistemic system ARTEMIS; дальнейшее развитие — только audit-first, без инерционного repatch.
>
> Typography/palette alignment sync (2026-04-23): controlled cycle для safe zones (token-only patch → selective selector adoption → editorial font routing → final audit) завершён. Текущее состояние принято как **working baseline for safe-zone visual contract alignment**; это не означает полного global visual adoption across all UI. Отдельными future tracks остаются: detail panel full adoption, timeline adoption, modal/light legacy consistency.

Назначение:
- зафиксировать официальный визуальный стиль ARTEMIS;
- определить палитру, типографику, surface system, text tone и design tokens;
- перевести общую UI/UX-модель ARTEMIS в согласованную visual system;
- убрать разрыв между UX-архитектурой и фактическим интерфейсным стилем.

Документ основан строго на:
- `docs/ARTEMIS_CONCEPT.md`
- `docs/ARTEMIS_PRODUCT_SCOPE.md`
- `docs/work/uiux/ARTEMIS_UI_UX_SYSTEM.md`
- `docs/work/uiux/ARTEMIS_UI_UX_COMPONENT_MAP.md`
- `docs/work/ARTEMIS_UI_UX_IMPLEMENTATION_PLAN_v1_0.md`

Этот документ:
- не заменяет концептуальные или продуктовые документы;
- не заменяет component map;
- не заменяет implementation plan;
- является owner-doc для visual design layer ARTEMIS внутри working UI/UX stack.

---

# 1. Роль visual system в ARTEMIS

## 1.1 Базовая установка
ARTEMIS — не sci-fi dashboard, не музейный сайт и не generic SaaS с картой.

ARTEMIS должен выглядеть как:
**спокойная исследовательская картографическая среда**, где:
- карта остаётся главной сценой;
- время читается как структурная ось;
- панели помогают исследовать, а не отвлекают;
- различие типов знания визуально поддерживается;
- интерфейс усиливает доверие, а не эффектность.

## 1.2 Официальная визуальная формула
**ARTEMIS visual style = Cartographic Research Editorial**

Это означает:
- cartographic — карта и spatial context визуально первичны;
- research — интерфейс выглядит как инструмент исследования, а не как развлекательная оболочка;
- editorial — текст, панельная логика и акценты обладают собранностью и интеллектуальной ясностью.

## 1.3 Что ARTEMIS визуально не должен собой представлять
ARTEMIS не должен выглядеть как:
- sci-fi control room;
- glassmorphism-first interface;
- luxury dark dashboard;
- исторический сайт с псевдо-музейной декоративностью;
- игровой интерфейс;
- generic startup product с поверхностной «умной» эстетикой.

---

# 2. Визуальные принципы

## 2.1 Map is visually primary
Карта всегда важнее интерфейсного chrome.
Ни один panel layer не должен забирать на себя главный визуальный вес экрана.

## 2.2 Calm density over spectacle
ARTEMIS допускает сложность, но не допускает визуальный шум.
Плотность интерфейса должна быть исследовательской, а не декоративной.

## 2.3 Action color is not meaning color
Цвет действия и цвет смысла нельзя смешивать.

Следовательно:
- action / interaction color = основной холодный акцент;
- editorial / historical emphasis = отдельный тёплый акцент;
- semantic states = отдельный слой системных цветов.

## 2.4 Explainability must be visible
Если интерфейс показывает AI-output, provenance, гипотезу или спорную связь, это должно быть видно визуально, а не только текстом.

## 2.5 Dense surfaces over theatrical glass
Поверхности ARTEMIS должны быть в первую очередь спокойными и читаемыми.
Blur и стеклянность допустимы только как вторичный приём, а не как базовая эстетика.

## 2.6 Typography serves navigation and understanding
Типографика должна помогать:
- быстро ориентироваться;
- различать уровни информации;
- читать длинные исследовательские блоки;
- отделять data-like UI от editorial/context blocks.

---

# 3. Цветовая система

## 3.1 Официальная базовая палитра

### Base / Background / Surface
- `--bg-root: #0F141B`
- `--bg-surface-1: #151C24`
- `--bg-surface-2: #1B2430`
- `--bg-surface-3: #243140`

### Border / Structure
- `--border-soft: #344356`
- `--border-strong: #4A5B70`

### Text
- `--text-primary: #E8EDF2`
- `--text-secondary: #B8C2CF`
- `--text-muted: #7F8B99`

### Primary Interaction Accent
- `--accent-primary: #4DA3FF`
- `--accent-primary-hover: #6BB5FF`
- `--accent-primary-deep: #2F7EDB`

### Secondary Accent
- `--accent-secondary: #7C8CF8`

### Editorial / Historical Accent
- `--accent-archive: #C49A6C`
- `--accent-archive-soft: #A9855D`

### Semantic System Colors
- `--state-success: #3FAE7A`
- `--state-warning: #D6A449`
- `--state-error: #D36B6B`
- `--state-info: #5AA7D9`

## 3.2 Логика палитры
Палитра ARTEMIS строится по формуле:
- графитовая база для устойчивости и картографической нейтральности;
- холодный синий для действия и навигации;
- тёплый archival accent для историко-редакционного смысла;
- отдельные semantic colors для состояний системы.

## 3.3 Чего нельзя делать с палитрой
Запрещено:
- строить весь интерфейс на ярком cyan glow;
- использовать тёплый archival color как постоянный action color;
- красить все состояния одним и тем же синим;
- превращать semantic colors в основной язык обычной навигации;
- использовать чисто декоративные «неоновые» акценты.

---

# 4. Цветовые роли по функциям

## 4.1 Graphite base
Используется для:
- фона приложения;
- panel surfaces;
- neutral containers;
- secondary cards;
- toolbar shells;
- границ и разделителей.

## 4.2 Primary blue
Используется для:
- active state;
- selected controls;
- focus state;
- timeline active range;
- selected object/slice controls;
- primary call-to-action.

## 4.3 Secondary violet-blue
Используется ограниченно для:
- compare context;
- secondary selected states;
- AI-related compare/hypothesis differentiation;
- layered analytical emphasis.

## 4.4 Archival warm accent
Используется только для:
- curated historical emphasis;
- provenance/editorial highlights;
- interpretation-oriented labels;
- selected reference/context cues;
- story/course framed knowledge blocks.

## 4.5 Semantic colors
Используются только для:
- success;
- warning;
- error;
- partial availability;
- offline/degraded states.

---

# 5. Эпистемическая визуальная семантика

## 5.1 Обязательное различение knowledge layers
Visual layer ARTEMIS обязан поддерживать различие между:
- fact;
- relation;
- interpretation;
- hypothesis;
- AI suggestion;
- uncertainty / low confidence.

## 5.2 Рекомендованное цветовое закрепление

### Fact
- базовая нейтрально-холодная схема;
- text-primary / blue-neutral accent;
- без декоративного warm tint.

### Relation
- более выраженный холодный синий/голубой акцент;
- может использоваться в relation pills, connection highlights и compare helpers.

### Interpretation
- archival warm accent;
- визуально спокойное, но отличимое оформление;
- не должно выглядеть как warning/error.

### Hypothesis
- secondary violet-blue accent;
- обязательна отдельная маркировка;
- допустимы dashed borders / softer fill semantics.

### AI Suggestion
- близко к hypothesis, но ещё слабее по уверенности;
- suggestion-block не должен выглядеть как fact-block.

### Uncertainty / Low confidence
- muted warning tint;
- не паническая ошибка, а сигнал ограниченности вывода.

## 5.3 Что запрещено
Запрещено:
- визуально подавать hypothesis как fact;
- делать AI-suggestion визуально равным verified provenance block;
- использовать один и тот же badge-style для факта, интерпретации и гипотезы.

---

# 6. Типографическая система

## 6.1 Официальная шрифтовая пара
### Primary UI font
**IBM Plex Sans**

Используется для:
- навигации;
- кнопок;
- labels;
- meta information;
- forms;
- timeline UI;
- panel headings;
- compact descriptions.

### Secondary editorial/content font
**Source Serif 4**

Используется для:
- длинных explanatory blocks;
- story/course narrative passages;
- extended historical descriptions;
- editorial/context sections в detail view;
- curated annotations.

## 6.2 Fallback policy
Если dual-font baseline по runtime/hosting причинам временно не вводится, допустимый единый baseline:
- `IBM Plex Sans, Inter, Arial, sans-serif`

Для editorial serif fallback:
- `Source Serif 4, Georgia, serif`

## 6.3 Почему не фиксировать Inter как основной шрифт
Inter допустим как fallback baseline, но он слишком нейтрален и generic для ARTEMIS.
Основной голос ARTEMIS должен быть чуть более исследовательским и дисциплинированным.

---

# 7. Типографическая шкала

## 7.1 UI scale
- App title: `700 14px/16px`
- Panel title: `600 14px/18px`
- Body UI: `400 13px/19px`
- Meta: `500 12px/16px`
- Caption: `500 11px/14px`

## 7.2 Content scale
- Detail title: `600 20px/26px`
- Section title: `600 12px/16px`
- Long-form content: `400 15px/24px`
- Inline explanation/meta in content: `400 13px/20px`

## 7.3 Правила использования
- uppercase применять только там, где реально нужен section-level label;
- не строить иерархию только через opacity;
- не делать основной интерфейсный текст слишком мелким;
- не использовать serif для плотной навигации и control UI.

---

# 8. Text tone и microcopy

## 8.1 Официальный text tone
**Neutral Research UI**

Текст ARTEMIS должен быть:
- точным;
- коротким;
- спокойным;
- не маркетинговым;
- не «дружелюбно-сервисным» сверх меры;
- пригодным для исследовательского контекста.

## 8.2 Хороший характер формулировок
Подходят:
- `Период`
- `Слой`
- `Связи`
- `Сохранить срез`
- `Открыть источник`
- `Сравнить`
- `Контекст исследования`
- `Уровень уверенности`
- `Интерпретация`
- `Гипотеза`

## 8.3 Чего избегать
Нежелательны:
- избыточно дружелюбные CTA;
- маркетинговые формулировки;
- vague AI language;
- «магические» названия режимов без исследовательского смысла.

## 8.4 AI-labeling tone
AI-related текст должен прямо сообщать статус вывода:
- `Факт`
- `Интерпретация`
- `Гипотеза`
- `AI suggestion`
- `Основано на текущем срезе`
- `Ограничено доступными данными`

---

# 9. Surface system

## 9.1 Общий принцип
ARTEMIS использует **dense calm surfaces**, а не heavy glassmorphism.

## 9.2 Panel surfaces
Панели должны быть:
- плотными;
- спокойными;
- с минимальной прозрачностью;
- с умеренным border contrast;
- с минимальным blur;
- без тяжёлого свечения.

## 9.3 Card surfaces
Карточки должны различаться по роли:
- preview card — компактная и лёгкая;
- detail blocks — плотнее и содержательнее;
- slice cards — data-like, а не decorative;
- AI blocks — визуально отличимы, но не доминируют над factual content.

## 9.4 Overlay surfaces
Overlay допустим только если:
- он улучшает контекст;
- он не убивает читаемость карты;
- он не превращает интерфейс в слой тяжёлых floating windows.

## 9.5 Blur policy
Blur допустим:
- в небольшом объёме;
- на верхних shell-панелях;
- на transient overlays.

Blur не должен:
- становиться главным носителем стиля;
- размывать карту сильнее, чем нужно для читаемости;
- использоваться для имитации «премиальности».

## 9.6 Shadow policy
Тени:
- мягкие;
- короткие;
- служат отделению слоя, а не театральности.

Глубокие драматические тени для ARTEMIS нежелательны.

---

# 10. Motion и interaction rules

## 10.1 Motion tone
Анимация должна быть:
- быстрой;
- спокойной;
- функциональной;
- не отвлекающей от исследования.

## 10.2 Interaction motion baseline
- fast: `120ms`
- normal: `180ms`
- soft: `240ms`

## 10.3 Hover
Hover должен давать:
- небольшой сдвиг тона;
- лёгкое усиление границы;
- минимальное повышение surface presence.

Нежелательны большие «подпрыгивания» и шумная динамика.

## 10.4 Focus
Focus должен быть:
- хорошо видимым;
- единообразным;
- с ясным accent ring;
- без агрессивного glow.

## 10.5 Selected / Active
Selected state должен строиться на:
- более плотном фоне;
- stronger border;
- ясном акценте;
- сохранении читаемости текста.

---

# 11. State system

## 11.1 Обязательные visual states
Все load-bearing UI blocks должны иметь согласованные состояния:
- default;
- hover;
- focus-visible;
- active;
- selected;
- disabled;
- loading;
- empty;
- success;
- warning;
- error;
- epistemic warning.

## 11.2 Loading
Loading state не должен выглядеть как ошибка.
Он должен показывать продолжение рабочего процесса, а не поломку.

## 11.3 Empty
Пустое состояние должно быть спокойным, с ясным next step.

## 11.4 Error
Ошибка должна быть локальной и читаемой.
Она не должна визуально ломать весь workspace, если сбой частичный.

## 11.5 Epistemic warning
Этот state нужен отдельно от error.
Он означает не «система сломалась», а:
- вывод спорный;
- данные ограничены;
- гипотеза слабая;
- provenance неполон.

---

# 12. Компонентные визуальные правила

## 12.1 Top header / project shell
- легче по визуальному весу, чем detail panel и timeline;
- не должен выглядеть как главный герой интерфейса;
- project navigation должна быть тихой и вторичной к map workspace.

## 12.2 Timeline
- один из главных load-bearing visual objects;
- должен быть чистым, тактильно читаемым и собранным;
- active range должен быть ясен без избыточной декоративности;
- таймлайн не должен выглядеть как secondary filter widget.

## 12.3 Detail panel
- главный смысловой контейнер после карты;
- должен быть плотным, спокойным, editor-like;
- preview и full modes должны визуально различаться;
- provenance, related entities и AI blocks должны быть различимы, но иерархически подчинены основному factual content.
- runtime baseline (first-pass) уже включает локальное различение factual/meta, provenance/source, uncertainty/confidence-adjacent и related/relation-like; следующий шаг по этой зоне допускается только через отдельный audit.

## 12.4 Slice surfaces
- slices должны восприниматься как исследовательские состояния, а не как generic bookmarks;
- визуально ближе к «рабочей конфигурации» чем к маркетинговой карточке;
- title, time, layers и note — ядро визуального представления slice.

## 12.5 AI panels
- должны быть визуально встроены в workspace;
- не должны выглядеть как отдельный detached chatbot product;
- AI block всегда должен иметь видимый status marker и basis/provenance segment.

## 12.6 Provenance block
- один из ключевых trust-components;
- должен быть визуально стабильным и спокойным;
- source block не должен теряться среди secondary cards;
- verified и partial provenance должны отличаться.

## 12.7 Story / Course blocks
- narrative blocks должны быть визуально чище и спокойнее обычных utility-panels;
- допускается чуть более editorial treatment;
- при этом карта и active slice остаются структурным центром.

## 12.8 Markers and clusters
- маркеры не должны быть слишком декоративными;
- cluster state должен быть ясен и читабелен на разных zoom levels;
- selected marker должен быть заметен без кислотного свечения.

---

# 13. Map visual rules

## 13.1 Карта как сцена
Базовый стиль карты должен поддерживать данные, а не спорить с ними.

## 13.2 Предпочтительный характер карты
Предпочтительна карта:
- нейтральная;
- графитово-серая или мягко-холодная;
- с умеренным контрастом;
- без переизбытка цвета.

## 13.3 Overlay discipline
Любой overlay должен проверяться по критерию:
не теряется ли spatial reading.

## 13.4 Marker contrast
Markers, selected objects и active layers должны сохранять читаемость на:
- dark baseline map;
- softer graphite map;
- reduced-saturation variants.

## 13.5 Theme policy
Допустим ограниченный набор картографических тем, но:
- все они должны подчиняться общей visual system;
- ни одна тема не должна превращать карту в декоративный фон.

---

# 14. Accessibility и trust baseline

## 14.1 Contrast
Контраст должен поддерживать:
- длинное чтение;
- быстрый обзор панелей;
- фокус-навигацию;
- различение epistemic markers.

## 14.2 Non-color cues
Нельзя полагаться только на цвет.
Для epistemic и system states должны использоваться также:
- labels;
- icons;
- border style;
- density / grouping / wording.

## 14.3 Stability as part of visual trust
Доверие в ARTEMIS строится не только через provenance, но и через визуальную стабильность.
Следовательно:
- нельзя резко менять визуальные паттерны между режимами;
- нельзя делать AI blocks стилистически более убедительными, чем factual blocks;
- нельзя превращать uncertain content в visually dominant content.

---

# 15. Design tokens baseline

## 15.1 Цветовые токены
Используются токены разделов 3–5.

## 15.2 Типографические токены
Используются токены разделов 6–7.

## 15.3 Surface tokens
Рекомендуемый baseline:
- radius-sm: `8px`
- radius-md: `10px`
- radius-lg: `14px`
- radius-panel: `16px`
- radius-pill: `999px`

## 15.4 Motion tokens
- motion-fast: `120ms`
- motion-normal: `180ms`
- motion-soft: `240ms`

## 15.5 Shadow tokens
- shadow-subtle: short and soft
- shadow-medium: used sparingly
- no theatrical deep shadow baseline

## 15.6 Blur tokens
- blur-sm: restrained
- blur-md: rare
- blur-lg: exceptional only

---

# 16. Что этот документ закрепляет как owner of meaning

Этот документ является owner-doc для:
- official visual formula;
- palette;
- typography;
- text tone;
- surface rules;
- visual state rules;
- epistemic color semantics;
- design token baseline.

Этот документ не владеет:
- product scope;
- IA and full UX architecture;
- component dependency map;
- engineering rollout order.

По этим темам owner-docs остаются:
- `docs/ARTEMIS_PRODUCT_SCOPE.md`
- `docs/work/uiux/ARTEMIS_UI_UX_SYSTEM.md`
- `docs/work/uiux/ARTEMIS_UI_UX_COMPONENT_MAP.md`
- `docs/work/ARTEMIS_UI_UX_IMPLEMENTATION_PLAN_v1_0.md`

---

# 17. Anti-patterns visual layer

Запрещено:
1. делать карту визуально вторичной к панелям;
2. строить интерфейс на heavy glow/glass как основном стиле;
3. использовать один цвет для action, fact, AI и interpretation одновременно;
4. делать AI-секции визуально авторитетнее factual/provenance sections;
5. использовать тёплый historical accent как обычный CTA-color;
6. строить иерархию только через opacity;
7. перегружать интерфейс шумными badges, shadows и micro-animations;
8. превращать research workspace в стилистически generic dashboard.

---

# 18. Практическая формула visual layer

Если элемент интерфейса:
- улучшает читаемость карты;
- усиливает понимание research slice;
- помогает различать типы знания;
- сохраняет спокойную иерархию;
- поддерживает trust и explainability,

то он соответствует visual system ARTEMIS.

Если элемент:
- выглядит эффектно, но мешает исследованию;
- усиливает chrome сильнее карты;
- смешивает факт, интерпретацию и гипотезу;
- делает AI visually louder than provenance,

то он противоречит visual system ARTEMIS.

---

# 19. Финальный вывод

ARTEMIS должен выглядеть не как визуально эффектный интерфейс ради впечатления, а как:
**спокойная, плотная, интеллектуально организованная картографическая исследовательская среда.**

Краткая формула:

**Graphite structure + Research Blue interaction + Archival Warm meaning + Slice-centered research clarity.**
