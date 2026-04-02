# SYSTEM CONTRACT AUDIT — 2026-04-02

## Scope and method

Аудит выполнен без изменений кода: сопоставлены реальные UI-assumptions (frontend) с фактическими контрактами backend/API и ETL (статические данные map/search/layers + API UGC/moderation).

Проверенные артефакты:
- Frontend: `js/data.js`, `js/ui.js`, `js/ui.ugc.js`, `js/ui.moderation.js`, `js/auth.js`
- Backend/API: `app/main.py`, `app/drafts/routes.py`, `app/drafts/schemas.py`, `app/drafts/service.py`, `app/moderation/routes.py`, `app/moderation/service.py`
- ETL/data shape: `scripts/export_airtable.py`, `data/features.geojson`, `data/layers.json`

---

## 1) ZONE: MAP

### Что ожидает UI
- UI работает с `FeatureCollection.features[]`, где каждая feature имеет `properties`.
- Для отображения/деталей/карточек используются поля: `layer_id`, `name_ru`, `name_en`, `title_short`, `description`, `date_start`, `date_end`, `date_construction_end`, `source_url`, `image_url`, `coordinates_confidence`, `tags`.
- Feature может быть без geometry; UI не падает (есть graceful fallback по тексту и датам).

### Что гарантирует API/ETL
- Для map-слоя фактически используется не backend endpoint, а статический `data/features.geojson`.
- ETL (`export_airtable.py`) формирует `FeatureCollection` и перечисленные выше `properties`.
- ETL-валидация отбрасывает критически невалидные записи (missing `name_ru`, `date_start`, `layer_id`, invalid `coordinates_confidence`, invalid license/source_url и т.д.).

### Расхождения
- Критичных несовпадений по map-контракту не выявлено: UI допуски (fallback на пустые значения) шире ETL-гарантий.

### Риск
- **low**

### Требуется ли фикс
- **no**

---

## 2) ZONE: SEARCH

### Что ожидает UI
- Поиск строится по `name_ru`, `name_en`, `title_short`, `tags`.
- Поиск + фильтрация используют `layer_id`, `coordinates_confidence`, даты (`date_start/date_end/date_construction_end`).
- Пустые/null поля допускаются (поиск/рендер fallback-устойчив).

### Что гарантирует API/ETL
- ETL гарантирует включение этих полей в `properties` (даже если значения null/empty).
- `coordinates_confidence` валидируется по enum (`exact/approximate/conditional`) до попадания в итоговый geojson.

### Расхождения
- Значимых расхождений не найдено.

### Риск
- **low**

### Требуется ли фикс
- **no**

---

## 3) ZONE: UGC

### Что ожидает UI
- UI отправляет draft payload с полями формы: `name_ru`, `name_en`, `layer_id`, `date_start`, `date_end`, `latitude`, `longitude`, `coordinates_confidence`, `title_short`, `description`, `image_url`, `source_url`, `tags`.
- UI **добавляет поле `coords`** при валидации перед save/submit.
- UI ожидает статусы `draft/pending/approved/rejected`; `pending` считается read-only.
- UI в edit-режиме ожидает, что draft приходит в плоской форме (`draft.name_ru`, `draft.layer_id`, ...), а не вложенно.

### Что гарантирует API
- `DraftCreate/DraftUpdate` имеют `extra="forbid"`: лишние поля отклоняются (422).
- Разрешённые статусные значения в ответе: `draft/review/approved/rejected`.
- В backend editable только `draft` и `rejected`; `review` не редактируется (`409`).
- В `DraftResponse` доменные поля пользователя хранятся преимущественно в `payload`, а не обязательно как top-level (`name_ru`, `layer_id`, `date_start` и др. top-level не гарантированы).

### Расхождения
1. **CRITICAL: `coords` в UI vs `extra=forbid` в API**  
   UI всегда отправляет `coords`; schema его не принимает → риск 422 на create/update.
2. **CRITICAL: статус `pending` в UI vs `review` в API**  
   UI нормализует только `draft/pending/approved/rejected`; `review` превращается в `unknown`.
3. **CRITICAL: read-only mismatch**  
   UI блокирует редактирование для `pending/approved`, но backend блокирует для `review/approved` (редактируемы только `draft/rejected`). Возможны попытки редактирования с последующим `409`.
4. **MAJOR: shape mismatch draft details**  
   UI заполняет форму из top-level полей draft, тогда как backend возвращает значимые поля внутри `payload`; при reopen draft возможна пустая/частично пустая форма.

### Риск
- **high**

### Требуется ли фикс
- **yes**

---

## 4) ZONE: MODERATION

### Что ожидает UI
- Очередь moderation содержит поля для list/review напрямую на объекте draft: `name_ru`, `title_short`, `layer_id`, `layer_type`, `source_url`, `image_url`, `coordinates_confidence`, `tags`, `latitude/longitude`.
- UI обрабатывает `401` (session expired), `403` (forbidden), общий error fallback.
- UI работает со статусом как будто `pending`-ориентированная модель бейджей.

### Что гарантирует API
- `GET /api/moderation/queue` возвращает `list[DraftResponse]`.
- `DraftResponse` гарантирует: `id`, `title`, `description`, `geometry`, `image_url`, `payload`, `status`, `publish_status`, `airtable_record_id`, `published_at`, timestamps.
- Модерационная очередь backend отбирает `status == "review"`.
- `POST /api/moderation/{id}/reject` не использует тело `reason` (причина от UI не сохраняется).

### Расхождения
1. **MAJOR: payload flatten mismatch**  
   UI читает много полей top-level, но API гарантирует их в `payload`. В результате в moderation review возможны массовые `n/a`/пустые блоки.
2. **MAJOR: status semantic mismatch (`review` vs `pending`)**  
   Очередь backend живёт в `review`, UI визуально/логически ориентирован на `pending`.
3. **MEDIUM: reject reason mismatch**  
   UI отправляет `reason`, backend его не сохраняет и не возвращает.

### Риск
- **high** (из-за потери контекста модератором и неоднозначных статусов)

### Требуется ли фикс
- **yes**

---

## 5) ZONE: LAYERS

### Что ожидает UI
- UI ожидает `layers.json` массив с `layer_id` (или fallback `id`), `name_ru` (или fallback label), `is_enabled`.
- При отсутствии слоёв UI частично самовосстанавливается через `layer_id` из features.

### Что гарантирует API/ETL
- Источник — `data/layers.json` (статический ETL output).
- ETL валидирует слой: обязательны `layer_id`, `name_ru`, `color_hex`, boolean `is_enabled`; невалидные слои исключаются.

### Расхождения
- Критичных расхождений не найдено.

### Риск
- **low**

### Требуется ли фикс
- **no**

---

## Error handling consistency (401 / 403 / 500)

### UGC
- 401: есть обработка через auth-refresh + повтор, при провале — auth-required/login.
- 403/409/422/500: в основном generic error pipeline, без специализированного UX по типам ошибок.
- Следствие: при контрактных конфликтах (`422`, `409`) пользователь получает общий failure, но не всегда actionable причину.

### Moderation
- 401 и 403 обработаны явно, состояние workspace корректно переключается.
- 500/прочие: общий error state + retry.

### ETL/static data
- Для map/layers нет runtime 401/403 (статические файлы), ошибки загрузки обрабатываются как data load failure в UI.

---

## Null / empty handling summary

- **Map/Search/Layers:** в целом устойчиво (много fallback-веток в UI).
- **UGC/Moderation:** логика в целом устойчивa к null, но есть структурный контрактный разрыв (top-level vs payload), который fallback-ами не закрывается.

---

## Итог

Найдены существенные system-level несогласованности между UI и backend в UGC/moderation контрактах (статусы, shape, поля запроса), при этом map/search/layers контракт между UI и ETL в текущем состоянии согласован.

### Приоритетные риски
1. `coords` field vs `extra=forbid` (save/update могут падать 422).
2. `pending` (UI) vs `review` (backend) + read-only policy mismatch.
3. Moderation/UI ожидает плоские поля, а API гарантирует payload-centric форму.

