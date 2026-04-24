# 2026-04-23_UIUX_LIGHT_EDITORIAL_ALTERNATIVE_PROMPT_ACTIVE_v1_0

## Статус документа
- Тип: working prompt spec
- Статус: active
- Назначение: зафиксировать отдельный prompt для **light editorial alternative главного экрана ARTEMIS**
- Основа: `2026-04-23_UIUX_MAIN_SCREEN_ART_DIRECTION_SPEC_ACTIVE_v1_0.md`, `2026-04-23_UIUX_MAIN_SCREEN_TECHNICAL_SPEC_ACTIVE_v1_0.md`, `2026-04-23_UIUX_MAIN_SCREEN_MASTER_CONCEPT_PROMPT_ACTIVE_v1_0.md`
- Scope: только **main screen / desktop + mobile concept**
- Роль: light editorial alternative direction

---

# 1. Зачем нужен этот документ

Этот prompt нужен для отдельного светлого направления ARTEMIS.

Его задача:
- собрать **один light editorial alternative concept**;
- проверить, как ARTEMIS звучит в более открытой, академичной и доверительной теме;
- показать, что продукт может быть не только темным premium workspace, но и светлой исследовательской средой;
- сохранить research seriousness и slice-centered product logic.

Главная формула:

**Light ARTEMIS = clean editorial cartographic workspace with research calmness, visible evidence structure, and timeline-led clarity.**

---

# 2. Что должен передавать light-вариант

Light editorial alternative обязан ясно показать:

1. Это исследовательская среда, а не generic productivity app.
2. Здесь доминируют ясность, доверие и дисциплина.
3. Slice — главная рабочая единица.
4. Timeline — структурная ось.
5. Карта остается центром.
6. Detail panel — место смыслового чтения, а не data sheet only.
7. AI — прозрачный и сдержанный explainable assistant layer.

---

# 3. Характер light theme

## 3.1 Общая формула
Светлый вариант должен быть:
- editorial
- quiet
- clean
- evidence-first
- academic
- precise
- calm
- elegant

## 3.2 Чего нельзя делать
Запрещено делать:
- generic startup SaaS screen
- cheerful productivity UI
- sterile hospital-white interface
- museum-decorative pseudo-historical page
- bland minimalism without research identity

---

# 4. Цветовая логика

## 4.1 Основа
Использовать:
- warm off-white or parchment-tinted background
- soft stone / paper surfaces
- calm blue interaction accents
- restrained archival warm accents
- muted green or secondary tone only if very justified
- soft violet for AI suggestion only in limited amount

## 4.2 Цветовые роли
- **Fact** — cool research blue
- **Relation** — softened archival orange
- **Interpretation** — warm editorial amber
- **AI Suggestion / Hypothesis** — restrained violet

## 4.3 Ограничения
- не делать интерфейс белоснежно-пустым
- не уводить тему в бежевую музейность
- не делать цвета слишком декоративными
- не использовать яркие насыщенные пятна как главный язык

---

# 5. Композиция light alternative

## 5.1 Главная структура
Показывать:
- один главный desktop runtime в центре;
- один mobile adaptation справа;
- минимум внешних explanatory blocks;
- светлый спокойный фон с очень тихой картографической текстурой.

## 5.2 Приоритет композиции
1. Desktop workspace
2. Timeline
3. Right panel
4. Quiet branding
5. Mobile adaptation

## 5.3 Что нельзя делать
- не делать экран лендингом
- не ставить большие презентационные списки слева и снизу
- не дробить композицию на много карточек
- не ослаблять workspace ради оформления

---

# 6. Структура desktop UI

## 6.1 Top shell row 1
Показывать:
- ARTEMIS wordmark
- quiet nav: Workspace / Research / Stories / Courses / Saved
- compact search
- profile avatar

Тон:
- легкий
- дисциплинированный
- вторичный относительно карты

## 6.2 Top shell row 2
Показывать:
- `Slice: Byzantine Trade Networks`
- `Saved`
- `1200–1450 CE`
- compact context chips
- actions: Save / Compare / Share

Критично:
светлый интерфейс не должен ослабить видимость **slice as working unit**.

## 6.3 Map workspace
Показывать:
- Eastern Mediterranean / Byzantine trade world
- selected focal entity: Constantinople
- visible labels
- умеренное число маршрутов и узлов
- спокойная карта, хорошо читаемая на светлой базе

## 6.4 Left map rail
Тихая slim vertical rail:
- select
- layers
- filters
- relation/network mode
- annotation
- zoom

## 6.5 Right detail panel
Показывать:
### Level 1 — Preview header
- Constantinople
- City
- 330–1453 CE
- Place

### Level 2 — Slice context
- Byzantine Trade Networks
- active layers
- selected entities count
- note
- Saved badge

### Level 3 — Knowledge structure
- Fact
- Relation
- Interpretation
- AI Suggestion

### Level 4 — Actions
- Save Slice
- Add to Research
- Compare
- Explain

## 6.6 Timeline
Timeline должен быть:
- светлым
- clean
- clearly structural
- elegant
- integrated

Показывать:
- active range
- historical anchors
- аккуратную типографику
- читаемый selected range

---

# 7. Характер карты

## 7.1 Карта
Светлая карта должна быть:
- исторически выразительной
- мягкой
- текстурной
- не кричащей
- очень читаемой

## 7.2 Желательный характер
- pale parchment
- desaturated sea
- light stone landmass
- тонкая линия маршрутов
- аккуратные labels

## 7.3 Чего нельзя делать
- не делать карту слишком бледной
- не превращать ее в акварельную открытку
- не терять контраст data layers
- не ослаблять selected state

---

# 8. Mobile adaptation

## 8.1 Общий принцип
Mobile — staged light workspace.
Не mini-desktop.

## 8.2 Что показать
- clean top mobile bar
- compact map
- selected period / range
- bottom-sheet detail card
- segmented knowledge tabs
- Save Slice
- AI Explain

## 8.3 Тон mobile
- clean
- quiet
- editorial
- coherent
- easy to read

---

# 9. Основной prompt

```text
Create a refined light editorial 16:9 UI/UX concept board for ARTEMIS, a spatial-temporal historical research platform. Show one dominant desktop runtime on a laptop and one secondary mobile adaptation on a phone. The concept must feel like a real product main screen, not a marketing landing page and not a feature collage.

ARTEMIS is a map-first, slice-centered, timeline-led research workspace. The light version should feel clean, scholarly, calm, evidence-oriented, and editorial. It should not look like a generic SaaS tool, not a cheerful productivity app, and not a decorative museum page. It should feel like a modern historical research environment with strong clarity and trust.

Use a light palette built from warm off-white, stone, parchment-like neutrals, calm blue accents, restrained archival warm highlights, and very limited violet for AI suggestion or hypothesis. Keep the result elegant and highly readable.

Composition:
- one dominant desktop interface centered
- one phone adaptation on the right
- minimal external framing
- the product UI itself should explain the product

Desktop UI:
Show a two-row top shell, large map workspace, right detail panel, and strong bottom timeline band.

Top row:
- ARTEMIS wordmark
- Workspace, Research, Stories, Courses, Saved
- compact search field
- profile avatar

Second row:
- Slice: Byzantine Trade Networks
- Saved
- 1200–1450 CE
- compact context chips
- actions: Save, Compare, Share

Map:
- Eastern Mediterranean / Byzantine trade world
- selected Constantinople
- elegant light historical cartography
- clear labels and moderate route density
- refined spatial traces and nodes
- a small number of inline callouts only

Epistemic map colors:
- Fact = research blue
- Relation = softened archival orange
- Interpretation = warm editorial amber
- AI Suggestion / Hypothesis = restrained violet

Left map rail:
- select
- layers
- filters
- relation/network mode
- annotation
- zoom

Right panel:
Must feel like an editorial meaning container, not just a data sheet.
Structure it with:
1. Preview header — Constantinople, City, 330–1453 CE, Place
2. Slice context — Byzantine Trade Networks, active layers, selected entities count, note, Saved badge
3. Knowledge blocks — Fact, Relation, Interpretation, AI Suggestion
4. Action zone — Save Slice, Add to Research, Compare, Explain

Example knowledge content:
Fact:
“Capital of the Byzantine Empire and a major hub of trade, culture, and religion.”
“Source: Chronicon Paschale”

Relation:
“Connected to major maritime and overland trade networks linking Venice, Ragusa, Nicaea, Antioch, and Alexandria.”

Interpretation:
“Its position between Europe and Asia made it a natural checkpoint for trade and diplomacy.”

AI Suggestion:
“Patterns in route density suggest that Constantinople functioned as both a political and logistical filter in this network.”
“Confidence: 68%”

Timeline:
Show a strong light editorial timeline with active range 1200–1450 CE and a few anchor points.
The timeline must feel like a core structural axis, not a secondary filter.

Mobile:
Show a staged light mobile adaptation with:
- top map
- compact selected range
- bottom-sheet detail card
- visible knowledge tabs or segmented sections
- Save Slice
- AI Explain

Background:
Use a quiet light premium background with faint topographic or cartographic texture. Keep it subtle.

Avoid:
- giant side explanations
- feature collage
- generic SaaS flatness
- decorative museum aesthetics
- too many floating cards
- overloading the map
- loud AI hero treatment
- sterile white emptiness

Desired result:
A refined light editorial alternative for the ARTEMIS main screen: slice-centered, map-first, timeline-led, calm, trustworthy, research-grade, and visually coherent across desktop and mobile.
```

---

# 10. Краткая версия

```text
Design a refined light editorial 16:9 concept for ARTEMIS, a map-first, slice-centered, timeline-led historical research workspace. Show one dominant desktop UI on a laptop and one staged mobile adaptation on a phone. Use warm off-white and parchment-like neutrals, calm blue interaction accents, restrained archival warm highlights, and limited violet for AI suggestion. Show a two-row top shell, a large historical map of the Eastern Mediterranean / Byzantine trade world, a right structured detail panel for Constantinople, and a strong bottom timeline. Make it calm, scholarly, trustworthy, and product-grade. Avoid feature collage, generic SaaS styling, museum-like decoration, and oversized explanatory side cards.
```

---

# 11. Acceptance criteria

Light output считается удачным, если:
- выглядит как светлая editorial alternative ARTEMIS;
- сохраняет research identity;
- не уходит в generic SaaS;
- slice clearly visible;
- timeline structurally strong;
- карта остается главным героем;
- detail panel выглядит как meaning surface;
- AI встроен спокойно;
- mobile coherent with desktop;
- результат вызывает доверие и ощущение академической ясности.

---

# 12. Итог

Этот prompt нужен для **light editorial alternative ARTEMIS**.

Его практическая формула:

**Light ARTEMIS = calm editorial cartographic workspace with strong evidence clarity, visible slice state, structured timeline, and trustworthy explainable AI framing.**
