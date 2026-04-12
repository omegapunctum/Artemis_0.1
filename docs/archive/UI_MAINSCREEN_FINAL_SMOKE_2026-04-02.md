# UI Mainscreen Final Smoke — 2026-04-02

Scope: финальная ручная проверка главного explore-flow без изменения API/backend/contracts.

## 1) Top bar / search priority
**Preconditions**
- Приложение загружено, карта отображена.

**Steps**
1. Открыть главный экран.
2. Сфокусироваться в поле поиска.
3. Ввести произвольный запрос.

**Expected result**
- Поиск визуально читается как основной control.
- Для активного запроса отображается явный helper/active state.
- Доступна очистка поиска.

**Error / edge case**
- При пустом вводе интерфейс возвращается в нейтральное search-состояние без «залипших» подсказок.

---

## 2) Onboarding centered modal behavior
**Preconditions**
- Onboarding-оверлей видим (первый вход / после перезагрузки с активным overlay).

**Steps**
1. Открыть экран с активным onboarding.
2. Проверить позиционирование карточки.
3. Закрыть onboarding кнопкой.

**Expected result**
- Карточка центрирована по viewport и воспринимается как modal (backdrop, shadow, radius).
- Закрытие скрывает overlay без поломки main layout.

**Error / edge case**
- На узком viewport карточка не прилипает к краям и остается читаемой.

---

## 3) Loading / status integration
**Preconditions**
- Инициализация приложения / повторная загрузка данных.

**Steps**
1. Обновить страницу.
2. Наблюдать глобальный loading/status блок.
3. Дождаться состояния «карта готова».

**Expected result**
- Нет отдельного «висящего» loading-badge вне системы статусов.
- Статусные сообщения встроены в единый status-container.

**Error / edge case**
- При ошибке загрузки показывается recoverable state с retry.

---

## 4) Timeline drag обеих ручек
**Preconditions**
- Карта и timeline активны.

**Steps**
1. Перетащить левую ручку timeline.
2. Перетащить правую ручку timeline.
3. Проверить поведение у границ диапазона.

**Expected result**
- Обе ручки интерактивны (pointer drag).
- Ручки не пересекаются и не выходят за min/max.
- Выбранный диапазон обновляется в realtime.

**Error / edge case**
- При быстрых движениях нет «мертвых зон» и критического дёргания.

---

## 5) Timeline → map/list sync
**Preconditions**
- В данных есть объекты внутри и вне текущего диапазона.

**Steps**
1. Сузить timeline до узкого интервала.
2. Расширить интервал обратно.
3. Сравнить карту и нижнюю ленту до/после.

**Expected result**
- Изменение timeline синхронно обновляет карту и список/ленту.
- Вне диапазона объекты не отображаются.

**Error / edge case**
- При частых изменениях диапазона нет рассинхронизации map vs list.

---

## 6) Detail card readability + media / placeholder
**Preconditions**
- Есть минимум 2 объекта: с image_url и без image_url.

**Steps**
1. Открыть detail объекта с изображением.
2. Открыть detail объекта без изображения.
3. Проверить структуру секций (title/meta/description/source/technical).

**Expected result**
- Карточка читается как product-view: выраженная иерархия, секции и отступы.
- При image_url показывается media header.
- Без image_url показывается качественный placeholder.

**Error / edge case**
- При частично пустых данных не появляются «битые» пустые блоки.

---

## 7) Search no-results + clear search
**Preconditions**
- Введён запрос, дающий 0 результатов.

**Steps**
1. Ввести заведомо несуществующий запрос.
2. Проверить no-results блок/подсказку.
3. Нажать clear/reset search.

**Expected result**
- Ясно показано, что результатов 0 и по какому запросу.
- Есть 1 явное corrective action (очистка поиска).
- После очистки возвращается нейтральное состояние и результаты.

**Error / edge case**
- Нет конфликта между inline no-results и dropdown no-results.

---

## 8) Filters active state + reset
**Preconditions**
- Изменены несколько ограничений (поиск/слои/timeline/confidence).

**Steps**
1. Применить комбинированные ограничения.
2. Проверить top-bar индикацию активных фильтров.
3. Выполнить reset filters.

**Expected result**
- Активные фильтры читаются без открытия панелей.
- Reset возвращает состояние к baseline (поиск/фильтры/timeline/слои).
- Появляется краткое микроподтверждение.

**Error / edge case**
- После reset нет «зависших» старых подсказок/бейджей.

---

## 9) Layers customized state + restore defaults
**Preconditions**
- Layers panel доступна.

**Steps**
1. Выключить часть слоёв.
2. Проверить визуальный customized state.
3. Нажать restore defaults.

**Expected result**
- Явно видно, что видимость слоёв кастомизирована.
- Restore defaults возвращает дефолтный набор слоёв.
- Появляется краткое микроподтверждение.

**Error / edge case**
- При выключении всех слоёв пользователь получает понятный recovery action.

---

## 10) Empty / zero-results recovery flows
**Preconditions**
- Можно получить пустую выборку разными ограничениями.

**Steps**
1. Получить 0 results через узкий timeline.
2. Получить 0 results через конфликт search + filters.
3. Получить 0 results через выключенные layers.
4. Использовать предложенные corrective actions.

**Expected result**
- Для каждого empty-сценария есть короткое объяснение причины.
- Для каждого есть ровно одно понятное корректирующее действие.
- После действия выборка восстанавливается.

**Error / edge case**
- Нет «шумных» баннеров и конфликтующих state-блоков.

---

## 11) Canonical data-source discipline (release-critical)
**Preconditions**
- Приложение запущено в production-default runtime.
- Доступны browser devtools (Network).

**Steps**
1. Выполнить hard refresh.
2. Проверить источники данных карты в Network.
3. Зафиксировать, что базовая загрузка идёт из `/data/*` (включая `data/features.geojson`).
4. Проверить, что нет признаков fallback/substitution поведения на `/api/map/feed` в базовом explore-flow.

**Expected result**
- Карта загружается из canonical published `data/*`.
- `/api/map/feed` не выступает production-default source для main map runtime.

**Error / edge case**
- Если базовая загрузка карты зависит от runtime substitution на `/api/map/feed` — FAIL для release smoke.

---

## Findings / Follow-up
- [none]
