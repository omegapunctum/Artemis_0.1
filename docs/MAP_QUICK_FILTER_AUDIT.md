# Map Quick Filter Audit

## 1. Scope
Проверено в рамках:
- `js/ui.js`
- `js/map.js` (путь применения filter через `setMapLayerFilter`)
- `index.html`
- `css/style.css`
- `docs/MAP_EXPLORATION_AUDIT.md` (контекст)

## 2. Confirmed working behavior
- Quick filter рендерится в top controls (`#quick-layer-filter`) и инициализируется из `layer_id` (top-5 по частоте).
- Toggle меняет `activeQuickLayerIds` и вызывает `applyState`.
- Фильтр карты композируется корректно: `timeline` + `quick layer` в один expression.
- Переключение категорий не перезагружает source карты (обновляется layer filter, не `setData`).
- При скрытии выбранного/hovered объекта quick filter-ом selection/hover очищаются безопасно.
- Detail panel закрывается при `clearSelection`, зависшего состояния не обнаружено.
- Reset возвращает quick layer фильтр к default (`restoreDefaultQuickLayers`).

## 3. Issues
1. **HIGH** — Несогласованность map vs list/counters.
   - Quick filter влияет только на map layer filter.
   - `filteredFeatures`, ribbon cards и counters не учитывают quick layer state.
   - Итог: пользователь видит меньше маркеров на карте, чем объектов в ленте/счётчиках.

2. **MEDIUM** — На мобильном quick filter недоступен.
   - В CSS блок `.quick-layer-filter` скрывается на mobile breakpoint.
   - На mobile feature перестаёт быть «first controllable exploration layer».

## 4. Final status
**STABLE WITH MINOR GAPS**

## 5. Recommended next action
Синхронизировать quick layer state с list/counters (единый пользовательский результат по карте и ленте) как один целевой фикс.
