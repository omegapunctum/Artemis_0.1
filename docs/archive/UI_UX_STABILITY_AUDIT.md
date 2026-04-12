# UI/UX Stability Audit

## 1. Scope
Аудит выполнен по текущему UI/UX runtime слою без изменения архитектуры и фич:
- `index.html`
- `css/style.css`
- `js/ui.js`
- `js/map.js`

Фокус: стабильность UX-потоков (loading, выбор объекта, preview/full detail, timeline, взаимодействие панелей).

## 2. Confirmed stable areas
1. **Базовый bootstrapping-пайплайн UI есть и структурирован**
   - Глобальные состояния loading/error вынесены в отдельные блоки и управляются централизованно.
   - Инициализация идет в понятной последовательности: auth -> data -> map bootstrap -> UI init.

2. **Слой карты и UI привязаны стабильно**
   - Есть явный `waitForMapBootstrap(...)` с timeout и событиями `bootstrap-ready/bootstrap-failed`.
   - Фильтрация timeline и map data update применяются через единый state/apply цикл.

3. **Слои наложения в целом нормализованы**
   - В CSS введена явная z-index шкала (`top header`, `dropdown`, `detail`, `workspace`, `modal`, `system`).
   - Есть адаптивные правила для desktop/tablet/mobile с отдельной логикой для top-actions overflow.

## 3. Issues
1. **HIGH — Нет timeout/cancel для загрузки данных до карты (`loadFeatures/loadMapFeed`)**
   - В bootstrap используется `await loadFeatures()` / `await loadMapFeed()` без локального timeout/abort.
   - При сетевом подвисании пользователь может застрять в бесконечном состоянии "Загрузка карты…" без перехода в error/retry.
   - Это прямой UX-риск по стабильности и предсказуемости входа в приложение.

2. **HIGH — Мобильный detail-sheet имеет код для expand/collapse, но триггер отсутствует в DOM**
   - `ui.js` подписывается на `#detail-panel-expand` и меняет его state/aria, но такого элемента в `index.html` нет.
   - В результате mobile detail panel работает как частично управляемый sheet: логика есть, пользовательского контролла нет.
   - Это соответствует ранее наблюдаемому симптому "нестабильное поведение detail panel".

3. **LOW — Дублирующиеся/перекрывающиеся media-блоки для `@media (max-width: 720px)` усложняют предсказуемость layout**
   - В файле есть несколько блоков для одного брейкпоинта, включая повторные правила для `#top-header`, `#bottom-panel`, `.detail-panel`.
   - Сейчас это не выглядит как BLOCKER, но повышает риск регрессий перекрытий при дальнейших правках.

## 4. Impact classification
- **BLOCKER:** нет
- **HIGH:** 2
  - отсутствие timeout/cancel у pre-map data loading
  - отсутствие DOM-триггера `detail-panel-expand` при наличии активной логики mobile sheet
- **MEDIUM:** 0
- **LOW:** 1
  - дублирующиеся media-правила на одном брейкпоинте

## 5. Recommended next fixes
1. **Сначала закрыть HIGH-1:** добавить контролируемый timeout + abort для initial data fetch, чтобы loading-state всегда имел детерминированный выход в retry/error.
2. **Сразу после — HIGH-2:** добавить реальный mobile control для detail-sheet (или удалить мертвую логику), чтобы поведение preview/full было предсказуемым.
3. **Плановый LOW:** свернуть дубли media-правил `max-width: 720px` в один консистентный блок для снижения риска новых перекрытий.
