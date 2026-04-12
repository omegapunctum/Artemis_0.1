# ARTEMIS — Targeted Unified UI/UX Smoke (2026-04-02)

Цель: воспроизводимая manual smoke-проверка **только** по зонам, затронутым unified UI/UX pass.

## 1) Overlay / overflow / primary-panel interaction
**Preconditions**
- Приложение загружено, карта и top header видимы.
- viewport desktop или tablet (где есть overflow/primary controls).

**Steps**
1. Нажать `⋯` (overflow).
2. Не закрывая overflow, нажать `Filters`.
3. Затем по очереди нажать `Layers` и `Bookmarks`.

**Expected result**
- При открытии `Filters` overflow закрывается.
- Одновременно открыта только одна primary-panel.
- Переключение `Filters/Layers/Bookmarks` не оставляет «залипших» панелей.

**Error / edge case**
- Если overflow остаётся открытым поверх primary-panel или видны 2 панели одновременно — FAIL.

---

## 2) Click-outside для overflow
**Preconditions**
- Overflow открыт (`⋯` в expanded состоянии).

**Steps**
1. Кликнуть в область карты вне header/menus.
2. Повторить клик рядом с bottom panel.

**Expected result**
- Overflow закрывается по click-outside.
- `aria-expanded` на кнопке overflow возвращается в `false`.

**Error / edge case**
- Если overflow не закрывается или перекрывает взаимодействие с картой — FAIL.

---

## 3) ESC path для верхнего слоя
**Preconditions**
- Доступны: primary panel, detail panel, UGC panel, moderation workspace, reject modal (если роль модератора есть).

**Steps**
1. Открыть любой верхний слой (например, detail panel).
2. Нажать `Esc`.
3. Повторить для primary panel, UGC, moderation, reject modal.

**Expected result**
- `Esc` закрывает верхний активный слой (LIFO-поведение).
- После закрытия не остаётся невидимых блокирующих overlay.

**Error / edge case**
- Если `Esc` закрывает не тот слой или не закрывает верхний — FAIL.

---

## 4) Search no-results + Clear search
**Preconditions**
- Данные загружены, поле search доступно.

**Steps**
1. Ввести уникальный запрос без совпадений (например: `zzzx_nonexistent_2026`).
2. Проверить inline no-results под поиском.
3. Открыть search dropdown и нажать `Clear search`.

**Expected result**
- Появляется явный no-results feedback с текущим запросом.
- Кнопка `Clear search` очищает поле и убирает no-results состояния.

**Error / edge case**
- Если no-results появляется без clear-действия или после clear фильтрация остаётся активной — FAIL.

---

## 5) Filter active-count + Reset
**Preconditions**
- Загружены объекты и доступны Filters/Layers.

**Steps**
1. Применить комбинированные фильтры: search + confidence + отключить часть layer + изменить timeline.
2. Проверить активный count на top actions и badge в Filters panel.
3. В Filters panel нажать `Reset`.

**Expected result**
- Active count отражает факт активных фильтров.
- `Reset` возвращает default для search/confidence/layers/timeline.
- После reset активные индикаторы исчезают.

**Error / edge case**
- Если reset сбрасывает не все 4 группы (search/confidence/layers/timeline) — FAIL.

---

## 6) UGC auth-required shared inline-state
**Preconditions**
- Пользователь не авторизован.

**Steps**
1. Нажать `Create draft`.
2. Проверить верхнюю часть UGC panel.
3. Нажать `Login` внутри inline-state.

**Expected result**
- Отображается единый inline state block с текстом auth-required и CTA `Login`.
- CTA открывает login modal.

**Error / edge case**
- Если отображается старый ad-hoc текст без state block-паттерна — FAIL.

---

## 7) UGC empty drafts shared inline-state
**Preconditions**
- Пользователь авторизован, список черновиков пуст.

**Steps**
1. Открыть UGC panel.
2. Нажать `Refresh` в секции `My drafts`.
3. Проверить блок `No drafts yet`.

**Expected result**
- Empty drafts рендерится как shared inline state block.
- Layout панели не ломается при пустом списке.

**Error / edge case**
- Если empty-state отсутствует или рендерится в несовместимом стиле — FAIL.

---

## 8) Moderation search clear flow
**Preconditions**
- Пользователь с правами moderation.
- Workspace moderation открыт и очередь загружена.

**Steps**
1. Ввести поисковый текст в moderation search.
2. Нажать `Clear` рядом с поиском.

**Expected result**
- Поле поиска очищается.
- Фильтрация очереди снимается, список возвращается к исходному состоянию.

**Error / edge case**
- Если поле очищается, но список остаётся отфильтрованным — FAIL.

---

## 9) Moderation empty-result warning-state
**Preconditions**
- Пользователь с правами moderation.
- В очереди есть записи.

**Steps**
1. Ввести поисковый текст, не совпадающий ни с одной записью.
2. Проверить сообщение в list area.
3. Нажать `Clear search` внутри warning-state.

**Expected result**
- Появляется warning-state `No matches` с clear-действием.
- После clear список восстанавливается.

**Error / edge case**
- Если warning-state не появляется или clear внутри state не работает — FAIL.

---

## 10) Moderation approve/reject busy-state
**Preconditions**
- Пользователь с правами moderation.
- Выбран элемент очереди.

**Steps**
1. Нажать `Approve` (или `Reject`).
2. Наблюдать кнопку во время запроса.
3. Повторить для второго действия.

**Expected result**
- Кнопка действия показывает busy-state (`...ing`) и блокирует повторный клик.
- После завершения busy-state снимается, UI возвращается в интерактивное состояние.

**Error / edge case**
- Если возможен double-submit во время busy-state — FAIL.

---

## 11) Canonical map source / no runtime substitution (release-critical)
**Preconditions**
- Приложение открыто в production-default runtime.
- Network tab доступен для наблюдения data-source запросов.

**Steps**
1. Выполнить hard refresh.
2. Проверить загрузку `data/features.geojson` и related `data/*`.
3. Воспроизвести базовые взаимодействия (search/filter/timeline).
4. Проверить отсутствие признаков production-default fallback/substitution на `/api/map/feed`.

**Expected result**
- Main map runtime использует canonical published `data/*` path.
- `/api/map/feed` остаётся auxiliary/internal route и не выглядит как primary production map source.

**Error / edge case**
- Если main map flow visibly depends on runtime substitution from `/data/*` to `/api/map/feed` — FAIL.

---

## Execution note
- Этот документ покрывает только targeted verification layer unified UI/UX pass и не заменяет полный regression smoke.
