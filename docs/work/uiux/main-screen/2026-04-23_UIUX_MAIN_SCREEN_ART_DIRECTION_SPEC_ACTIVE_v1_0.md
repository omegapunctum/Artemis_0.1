# 2026-04-23_UIUX_MAIN_SCREEN_ART_DIRECTION_SPEC_ACTIVE_v1_0

## Статус документа
- Тип: working UI/UX art direction + UI direction spec
- Статус: active
- Назначение: зафиксировать детальное направление для **финального master-concept главного экрана ARTEMIS**
- Основа: анализ 5 представленных концептов + действующий UI/UX system layer + visual system layer + main-screen technical spec
- Scope: только **main screen / primary workspace**
- Не покрывает: full compare screen, full story player, course player, settings/profile, authoring screens

---

# 1. Зачем нужен этот документ

Этот документ нужен, чтобы перевести разбор концептов в **одно рабочее направление** для следующего шага:
- нового master-concept;
- Figma-screen;
- последующего runtime-уточнения;
- точечных задач для реализации.

Он не заменяет:
- product scope;
- global UX system;
- visual system owner-doc;
- main-screen technical spec.

Он делает другое:
- выбирает лучший direction;
- объясняет, **почему** именно он;
- фиксирует, **что взять** из каждого варианта;
- запрещает опасные визуальные и композиционные паттерны;
- задаёт ясную формулу для следующего финального концепта.

---

# 2. Базовый вывод

Из всех представленных вариантов лучший базовый кандидат для ARTEMIS main screen — **концепт №5**.

Причина:
- он лучше остальных показывает **главный рабочий цикл**;
- он ближе всех к модели **one strong research workspace**;
- в нём уже читаются:
  - current slice;
  - map-first scene;
  - timeline as structural axis;
  - right detail/slice panel;
  - product runtime, а не просто презентационный moodboard.

Но финальный master-concept должен быть не копией №5.

Итоговая формула направления:

**Композиционная база №5 + editorial clarity №2 + epistemic structure №3 + brand depth №1.**

Концепт №4 не является базой для main screen. Его роль — reference для будущего advanced analytical / compare layer.

---

# 3. Главная стратегическая мысль

ARTEMIS main screen должен показывать не “много возможностей”, а **одну сильную рабочую сцену**.

Главный экран должен сообщать следующее:

1. это исследовательская пространственно-временная среда;
2. пользователь работает не с отдельным объектом, а с **research slice**;
3. карта — основная сцена;
4. время — структурная ось;
5. detail panel — главный смысловой контейнер;
6. AI встроен как explainable layer, а не как отдельный продукт.

Если экран не считывает эти 6 тезисов без дополнительного объяснения, главный экран не собран.

---

# 4. Анализ концептов

## 4.1 Концепт №1 — dark premium brand board

### Сильные стороны
- Очень сильный брендовый тон.
- Хорошая dark atmosphere для serious research platform.
- Визуально выразительное разделение epistemic цветов.
- Хорошо работает ощущение “интеллектуального инструмента”, а не обычного сайта.
- Сильная презентационная подача dark theme.
- Достаточно хорошая стилистическая связка desktop + mobile.

### Слабые стороны
- Слишком большой promo-column слева.
- Сильнее работает как hero-poster, чем как product runtime.
- Slice почти не считывается как текущая рабочая единица.
- Detail panel скорее объектная карточка, чем настоящий editorial meaning surface.
- Timeline присутствует, но визуально ещё не становится второй осью продукта.
- Верхний action layer перегружен для такого уровня плотности.

### Вердикт
Концепт №1 — сильный **брендовый и атмосферный reference**, но не лучший фундамент для финального main screen.

### Что взять
- общую dark mood-atmosphere;
- премиальный, но спокойный тон;
- силу wordmark / brand presence;
- глубину цветовой сцены;
- ощущение serious research tool.

### Что не брать
- крупный marketing-column;
- poster-like композицию;
- доминирование presentation-layer над runtime-layer.

---

## 4.2 Концепт №2 — editorial light research workspace

### Сильные стороны
- Самый интеллигентный светлый вариант.
- Очень спокойный, доверительный, академичный характер.
- Хорошая readability карты.
- Detail panel чистый и дисциплинированный.
- Вся сцена ощущается исследовательской, а не маркетинговой.
- Хороший baseline для light theme или neutral editorial theme.

### Слабые стороны
- Всё ещё заметно “презентационный board”, а не единый runtime.
- Слева и снизу слишком много сопроводительной presentation framing.
- Slice читается, но не как главный объект интерфейса.
- Timeline аккуратный, но пока недостаточно weighty.
- Detail panel местами уходит в structured info sheet и теряет editorial depth.

### Вердикт
Концепт №2 — лучший reference для **light / editorial theme**, но не полный ответ для финального main screen.

### Что взять
- чистоту и доверительность;
- светлую альтернативную тему;
- мягкую карту без шума;
- спокойную detail-surface подачу;
- минимум визуальной агрессии.

### Что не брать
- лендинговый характер общей композиции;
- ослабленный timeline;
- слишком табличный detail-panel rhythm.

---

## 4.3 Концепт №3 — explanatory system board

### Сильные стороны
- Лучшее объяснение epistemic language.
- Очень хорошо раскрыта логика:
  - fact;
  - relation;
  - interpretation;
  - hypothesis / AI suggestion.
- Хороший visual language для explainable AI.
- Боковые supporting cards полезны как design-system explanation.
- Мобильный экран хорошо показывает staged layout direction.

### Слабые стороны
- Экран распадается на collage из модулей.
- Основной runtime перестаёт быть центром композиции.
- Слишком много explanatory cards вокруг рабочего интерфейса.
- Больше похож на product concept board, чем на реальный main screen.

### Вердикт
Концепт №3 — сильный **system-language reference**, но не оптимальный финальный главный экран.

### Что взять
- семантический язык knowledge layers;
- структуру epistemic badges и content blocks;
- чистоту AI suggestion framing;
- визуальную дисциплину facts / provenance / related / AI logic.

### Что не брать
- collage-композицию;
- избыточные внешние explanatory cards;
- presentation-board structure вокруг runtime.

---

## 4.4 Концепт №4 — advanced analytical mode

### Сильные стороны
- Сильный reference для evidence density, compare logic и network analysis.
- Хорошо показывает high-density analytical potential продукта.
- Полезен как референс будущих режимов:
  - compare;
  - analytical mode;
  - graph/network overlays;
  - evidence-rich AI-assisted research.

### Слабые стороны
- Для главного экрана радикально перегружен.
- Сразу показывает слишком много режимов продукта.
- AI и analytics становятся слишком громкими визуально.
- Compare-panel, evidence-density и multiple support widgets спорят с картой.
- Нарушает принцип one main workspace.
- Вызывает риск dashboardization продукта.

### Вердикт
Концепт №4 нельзя брать как основу главного экрана.

### Что взять
- отдельные элементы future compare mode;
- density overlays;
- network graph thinking;
- сценарии для продвинутого analytical screen.

### Что не брать
- как baseline home/workspace;
- как главный экран продукта;
- как основной visual hierarchy template.

---

## 4.5 Концепт №5 — coherent slice-centered runtime

### Сильные стороны
- Лучший composition model.
- Наиболее ясно читается current slice.
- Лучший баланс между map, timeline и detail panel.
- Right panel ощущается ближе всего к real meaning container.
- Timeline уже почти становится полноценной structural axis.
- Общий экран выглядит как runtime product, а не просто как презентация.
- Связка desktop + mobile наиболее жизнеспособна.

### Слабые стороны
- Слева всё ещё есть presentation-column.
- Бренд-блок слева всё ещё немного тяжёлый.
- Нижняя часть detail panel требует лучшего ритма.
- Mobile ещё можно сильнее превратить в staged adaptation, а не mini-desktop.

### Вердикт
Концепт №5 — лучший базовый кандидат для master-concept main screen.

### Что взять
- общую композиционную систему;
- two-row top shell;
- explicit slice visibility;
- strong bottom timeline;
- right detail/slice panel как главный второй контейнер;
- coherency runtime-scene.

### Что доработать
- убрать presentation noise;
- усилить editorial depth detail panel;
- точнее развести knowledge blocks;
- упростить mobile hierarchy.

---

# 5. Сравнительная оценка

## 5.1 По пригодности для главного экрана
1. №5
2. №2
3. №1
4. №3
5. №4

## 5.2 По brand atmosphere
1. №1
2. №5
3. №4
4. №2
5. №3

## 5.3 По epistemic clarity
1. №3
2. №5
3. №1
4. №2
5. №4

## 5.4 По runtime realism
1. №5
2. №2
3. №4
4. №1
5. №3

---

# 6. Финальное направление

## 6.1 Финальная формула
Финальный main screen ARTEMIS должен быть:

**dark editorial research workspace with visible current slice, dominant map scene, strong bottom timeline, and right epistemic detail panel.**

## 6.2 Что это означает practically
Следующий финальный концепт:
- не строится как постер;
- не строится как collage;
- не строится как SaaS dashboard;
- не строится как GIS-console;
- не строится как museum-site.

Он строится как:
- единая исследовательская сцена;
- продуктовая runtime-поверхность;
- calm dense cartographic workspace;
- slice-centered screen.

---

# 7. Art direction для финального master-concept

## 7.1 Официальный визуальный характер
Экран должен выглядеть как:

**cartographic research editorial runtime**

Ключевые качества:
- тёмный, но не тяжёлый;
- интеллектуальный;
- дисциплинированный;
- не “люксовый дашборд”;
- не sci-fi;
- не музейный;
- не игровой;
- не декоративный.

## 7.2 Эмоциональный тон
Тон должен сообщать:
- доверие;
- серьёзность;
- фокус;
- объяснимость;
- глубину;
- спокойствие.

Не должен сообщать:
- hype;
- gimmick-tech;
- “умную магию”;
- визуальное перенапряжение.

## 7.3 Свет / контраст / глубина
Нужна controlled depth:
- фон темнее основного интерфейса;
- карта — центральная средне-тёмная сцена;
- панель — чуть светлее карты;
- shell — quiet and thin;
- действия и states — через точный акцент, а не glow-heavy драму.

## 7.4 Общая плотность
Плотность нужна высокая, но контролируемая:
- много смысла;
- мало декоративного шума;
- короткие расстояния;
- ясная иерархия.

---

# 8. Цветовое направление

## 8.1 Основная база
Использовать графитово-угольную базу:
- root background — почти чёрный графит;
- surfaces — тёмный slate / graphite;
- borders — мягкие холодные структурные линии;
- текст — off-white, не чисто белый.

## 8.2 Основной акцент
Primary interaction accent:
- research blue;
- холодный, чистый;
- без кислотности;
- годится для:
  - active state;
  - range selection;
  - focus ring;
  - selected item;
  - primary CTA.

## 8.3 Secondary semantic accents
Нужны чётко разведённые акценты:
- Fact — research blue
- Relation — warm amber / orange
- Interpretation — archival warm / amber-gold
- AI Suggestion / Hypothesis — soft violet / muted purple

## 8.4 Чего нельзя делать
- neon cyan everywhere;
- одинаковый цвет для action и meaning;
- aggressive purple AI branding;
- gold as CTA-color;
- rainbow-semantic overload.

---

# 9. Типографическое направление

## 9.1 Главная пара
- UI / nav / data-like text: IBM Plex Sans
- Editorial / narrative / interpretation: Source Serif 4

## 9.2 Поведение типографики
Типографика должна создавать два режима чтения:
1. operational reading
2. editorial understanding

Operational reading:
- top shell
- controls
- chips
- labels
- meta
- status

Editorial reading:
- interpretation blocks
- AI explanation context
- extended object description
- provenance framing
- long-form detail fragments

## 9.3 Визуальный эффект
Текст должен делать ARTEMIS:
- менее generic;
- более интеллектуальным;
- менее “dashboard-like”;
- более research-editorial.

## 9.4 Чего не делать
- весь UI одним одинаково нейтральным шрифтом;
- слишком мелкая типографика ради “элегантности”;
- serif в controls;
- uppercase overload.

---

# 10. Композиционный каркас desktop

## 10.1 Общая схема
Экран делится на 4 большие зоны:

1. Quiet top shell primary row
2. Slice sub-bar secondary row
3. Main workspace body
4. Bottom timeline band

## 10.2 Горизонтальный баланс
Main body:
- 68–72% map workspace
- 28–32% right detail panel

Это критично.

Если detail panel уже 35%+:
- карта начинает терять primacy.

Если panel меньше 26%:
- теряется смысловая ёмкость и editorial reading.

## 10.3 Вертикальный баланс
По высоте:
- primary shell: тонкий
- secondary slice bar: чуть плотнее
- main map/panel zone: максимальный вес
- timeline band: visibly load-bearing

## 10.4 Главный композиционный принцип
Ни один окружающий promotional block не должен быть сильнее:
- карты;
- timeline;
- detail panel.

---

# 11. Top shell direction

## 11.1 Primary row
Содержимое:
- wordmark ARTEMIS
- main nav
- compact search
- quiet icon set
- avatar/profile

## 11.2 Primary row visual rules
- максимально тихий;
- тонкий;
- чуть более прозрачный или плотный, чем фон;
- не должен стать “control center”;
- иконки и nav — вторичны по отношению к map workspace.

## 11.3 Main navigation
Рекомендуемые пункты:
- Workspace
- Research
- Stories
- Courses
- Saved

Правила:
- Workspace должен быть активным;
- другие пункты — quieter;
- не делать navigation жирной и доминирующей.

## 11.4 Search
Search должен быть:
- компактным;
- не billboard-sized;
- встраиваться в primary row;
- использоваться как supporting control, а не главный герой.

## 11.5 Secondary row / slice sub-bar
Это критический уровень.
Он должен показывать:
- current slice title;
- status Saved / Modified;
- selected range;
- optional active layer count / thematic chip;
- Save / Compare / Share.

Эта строка — главный маркер того, что продукт построен вокруг research slice.

---

# 12. Map direction

## 12.1 Карта как главная сцена
Карта должна быть:
- читаемой;
- глубокой;
- спокойной;
- фактурной, но не декоративной;
- достаточно живой, чтобы чувствовалась geography;
- достаточно сдержанной, чтобы не спорить с layers.

## 12.2 Рекомендуемый регион для hero-screen
Лучший region sample для финального concept:
- Byzantine / Eastern Mediterranean world

Причина:
- хорошо работает с маршрутами;
- хорошо показывает сеть, города, море и исторические связи;
- богато по временным якорям;
- хорошо ложится на slice logic.

## 12.3 Map content density
На карте должно быть:
- 1 selected primary place;
- 3–5 secondary labeled places;
- 2–4 route structures;
- 2–3 inline semantic callouts;
- умеренное количество markers;
- чистое пространство воды и суши.

## 12.4 Чего нельзя делать
- превращать карту в data soup;
- забивать сцену labels;
- делать GIS-tool aesthetic;
- использовать heavy heatmap/density overlays на baseline main screen;
- перегружать карту разноцветными маршрутами.

---

# 13. Left tools rail

## 13.1 Роль
Это utility layer, не смысловой центр.

## 13.2 Содержимое
Допустимо:
- select
- layers
- filters
- relation/network mode
- annotate
- zoom

## 13.3 Визуальные правила
- узкая;
- вертикальная;
- low-contrast;
- небольшая;
- не имитирует сложный GIS workstation;
- не содержит длинных labels в baseline state.

---

# 14. Right detail / slice panel direction

## 14.1 Роль
Панель должна быть не “карточкой объекта”, а **editorial meaning container connected to the current slice**.

## 14.2 Внутренний ритм панели
Панель должна иметь 4 чётких слоя:

### Layer A — entity preview
- title
- type
- period
- category
- optional image

### Layer B — slice context
- current slice
- active layers
- selected entities count
- note/context
- saved state

### Layer C — knowledge layers
- Fact
- Relation
- Interpretation
- AI Suggestion

### Layer D — actions
- Save Slice
- Add to Research
- Compare
- Explain

## 14.3 Визуальный ритм знаний
У каждого блока должны быть:
- свой semantic marker;
- короткий label;
- короткий основной текст;
- при необходимости source line;
- достаточный white space;
- отдельная визуальная роль.

## 14.4 Приоритет внутри knowledge blocks
По иерархии:
1. Fact
2. Relation
3. Interpretation
4. AI Suggestion

Это важно.

AI Suggestion не должен выглядеть более авторитетно, чем Fact или Provenance.

## 14.5 How editorial depth should feel
Панель должна вызывать ощущение:
- curated research surface;
- evidence-aware interpretation;
- structured reading;
- non-hasty judgment.

Не должна вызывать ощущение:
- CRM-sidebar;
- marketplace card;
- debug inspector;
- chatbot answer stack.

---

# 15. Knowledge layer direction

## 15.1 Fact
Должен выглядеть:
- чисто;
- надёжно;
- спокойно;
- source-backed.

Форма:
- короткое утверждение;
- краткая ссылка на источник;
- без декоративной драматизации.

## 15.2 Relation
Должен выглядеть:
- связанным;
- логическим;
- сетевым;
- не столь “твёрдым”, как факт, но всё ещё grounded.

## 15.3 Interpretation
Должен выглядеть:
- scholarly;
- editorial;
- чуть теплее;
- отличимым от warning/error.

## 15.4 AI Suggestion
Должен выглядеть:
- слабее по уверенности;
- чётко объяснимым;
- полезным для следующего шага исследования;
- не должен выглядеть как truth card.

## 15.5 Дополнительные элементы
В AI Suggestion допустимы:
- confidence;
- why / basis;
- expandable evidence line.

Но без превращения в отдельный AI-dashboard inside the panel.

---

# 16. Timeline direction

## 16.1 Роль
Timeline — не accessory.
Он должен быть вторым по весу элементом экрана после карты.

## 16.2 Композиция
Он занимает весь низ рабочего пространства и visually связывает:
- active range;
- historical anchors;
- current slice;
- selection on map.

## 16.3 Что timeline обязан сообщать
Пользователь должен сразу увидеть:
- выбранный диапазон;
- исторические вехи;
- temporal span of the slice;
- связь времени с картой.

## 16.4 Правильный visual weight
Timeline должен быть:
- заметным;
- подписанным;
- структурным;
- не слишком тонким;
- не слишком декоративным.

## 16.5 Что нельзя делать
- thin minimalist line without meaning;
- hidden anchors;
- only slider handles without semantic labels;
- превращать timeline в “ещё один фильтр”.

---

# 17. Product presentation direction

## 17.1 Что нужно убрать из будущей презентации
Следующий render / Figma-board не должен иметь:
- floating promo cards вокруг интерфейса;
- длинные marketing bullet lists;
- external compare widgets outside the main screen;
- визуально тяжёлую поддержку слева и снизу;
- избыточные slogan blocks.

## 17.2 Что допустимо оставить
Допустимо:
- очень компактный brand-support zone;
- один сдержанный legend strip;
- один mobile screen рядом с desktop;
- минимальный explanatory caption.

Но только если это не разрушает one-screen dominance.

## 17.3 Принцип
Сама структура интерфейса должна объяснять продукт лучше, чем рекламный текст рядом с ним.

---

# 18. Mobile direction

## 18.1 Базовый принцип
Mobile = самостоятельная staged workspace adaptation.

Не уменьшенный desktop.

## 18.2 Общий каркас
Сверху вниз:
1. top bar
2. map
3. compact timeline
4. bottom sheet with preview + slice context
5. primary actions

## 18.3 Что должно читаться на mobile
- активная карта;
- выбранный диапазон времени;
- текущая сущность;
- связь с slice;
- 2 главных действия: Save Slice и Explain.

## 18.4 Detail logic
Bottom sheet должен быть двухступенчатым:
- compact preview state;
- expanded detail state.

## 18.5 Что нельзя делать на mobile
- полный перенос desktop hierarchy;
- simultaneous heavy panels;
- tiny unreadable controls;
- over-badging;
- слишком много semantic chips сразу.

---

# 19. Что именно брать в следующий Figma / render

## 19.1 Обязательные компоненты
Следующий master-concept обязан показать:

### Desktop
- wordmark + quiet nav
- search
- slice sub-bar
- dominant map
- slim tools rail
- right detail/slice panel
- strong bottom timeline
- 2–3 map callouts
- restrained action set

### Mobile
- top bar
- compact map
- compact timeline
- bottom sheet
- Save Slice
- AI Explain

## 19.2 Обязательные product signals
Нужно, чтобы было видно:
- slice;
- temporal range;
- knowledge layers;
- provenance-aware logic;
- explainable AI;
- workspace realism.

---

# 20. Чего категорически не делать в следующем раунде

1. Не строить концепт как marketing hero board.  
2. Не возвращать большие explanatory columns.  
3. Не добавлять compare как постоянную внешнюю панель.  
4. Не делать AI visually louder than facts.  
5. Не перегружать карту overlays.  
6. Не превращать shell в control center.  
7. Не делать detail panel просто объектной карточкой.  
8. Не ослаблять timeline до тонкого декоративного слайдера.  
9. Не строить mobile как уменьшенный desktop.  
10. Не делать вокруг главного экрана decorative concept cards.

---

# 21. Acceptance criteria для финального master-concept

Финальный master-concept считается удачным, если:

1. За 3 секунды понятно, что это map-first research workspace.
2. Current unit of work явно читается как slice.
3. Timeline ощущается как core axis.
4. Detail panel выглядит как editorial meaning container.
5. Fact / Relation / Interpretation / AI Suggestion различаются ясно.
6. AI встроен в исследовательский поток, а не торчит отдельным продуктом.
7. Презентация не распадается на collage.
8. Карта остаётся главным визуальным объектом.
9. Desktop и mobile выглядят как одна система.
10. Экран ощущается как реальный продукт, а не как moodboard.

---

# 22. Практическая formula для генерации следующего master-concept

Ниже — готовая формула для следующего визуального этапа:

> Design the final ARTEMIS main screen as one coherent product runtime, not a concept collage. Use a dark editorial cartographic style with a dominant map workspace, a visible current research slice, a strong labeled timeline band at the bottom, and a right-side editorial detail panel structured into entity preview, slice context, fact, relation, interpretation, and AI suggestion. Keep the top shell quiet and thin, with Workspace active, compact search, and profile. Make the map clean, research-grade, and geographically readable. Show only a few semantic routes and callouts. Make the desktop and mobile feel like the same system. Remove all unnecessary promo cards and avoid making AI louder than evidence.

---

# 23. Next action

## 23.1 Правильный следующий шаг
Следующий шаг — не генерировать ещё 5 радикально разных вариантов, а собрать **один master-concept** на основе этого направления.

## 23.2 Рабочая последовательность
1. Зафиксировать этот art direction.
2. Сделать 1 основной desktop master-concept.
3. Сделать 1 coherent mobile adaptation.
4. Проверить по acceptance criteria.
5. После этого — готовить точечный UI implementation direction.

---

# 24. Итог

Главный экран ARTEMIS должен выглядеть не как красивый набор функций, а как:
**ясная исследовательская рабочая сцена, где карта, время, knowledge layers и research slice собраны в один coherent workspace.**

Финальное направление:
- база №5;
- editorial clarity №2;
- epistemic system №3;
- brand depth №1;
- без analytical overload №4.
