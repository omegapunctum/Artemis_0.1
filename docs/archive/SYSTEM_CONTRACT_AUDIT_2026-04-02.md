# SYSTEM CONTRACT AUDIT — 2026-04-02 (updated snapshot: 2026-04-04)

## Scope and method

Аудит выполнен без изменений кода: сопоставлены реальные UI-assumptions (frontend) с фактическими контрактами backend/API и ETL (статические данные map/search/layers + API UGC/moderation).

Проверенные артефакты:
- Frontend: `js/data.js`, `js/ui.js`, `js/ui.ugc.js`, `js/ui.moderation.js`, `js/auth.js`
- Backend/API: `app/main.py`, `app/drafts/routes.py`, `app/drafts/schemas.py`, `app/drafts/service.py`, `app/moderation/routes.py`, `app/moderation/service.py`
- ETL/data shape: `scripts/export_airtable.py`, `data/features.geojson`, `data/layers.json`

> Update note (2026-04-04): документ сохранён как исторический срез от 2026-04-02, но ниже статусы зон обновлены под текущее состояние репозитория. Ряд ранее помеченных CRITICAL пунктов переведён в resolved.

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
- `coords` поддерживается и синхронизируется с `latitude/longitude`.
- Разрешённые статусные значения в UI-ответе: `draft/pending/approved/rejected`.
- В `DraftResponse` ключевые доменные поля отдаются и в top-level (flatten), и в `payload`.

### Расхождения
1. **RESOLVED: `coords` в UI и API синхронизированы**  
   `coords` принимается schema, валидируется и синхронизируется с `latitude/longitude`; риск 422 из-за этого конфликта снят.
2. **RESOLVED: статусная модель выровнена под `pending` для UI**  
   Backend нормализует legacy `review` в `pending` на UI-границе.
3. **RESOLVED: read-only policy согласована по `pending/approved`**  
   UI и API согласованы для текущей pending-based модели.
4. **RESOLVED: flatten shape для draft details реализован**  
   Backend сериализует ключевые поля в top-level для UI, сохраняя `payload`.

### Риск
- **low**

### Требуется ли фикс
- **no**

---

## 4) ZONE: MODERATION

### Что ожидает UI
- Очередь moderation содержит поля для list/review напрямую на объекте draft: `name_ru`, `title_short`, `layer_id`, `layer_type`, `source_url`, `image_url`, `coordinates_confidence`, `tags`, `latitude/longitude`.
- UI обрабатывает `401` (session expired), `403` (forbidden), общий error fallback.
- UI работает со статусом как будто `pending`-ориентированная модель бейджей.

### Что гарантирует API
- `GET /api/moderation/queue` возвращает `list[DraftResponse]`.
- `DraftResponse` гарантирует: `id`, `title`, `description`, `geometry`, `image_url`, `payload`, `status`, `publish_status`, `airtable_record_id`, `published_at`, timestamps.
- Модерационная очередь backend отбирает `status in {"pending", "review"}` с UI-нормализацией к pending-модели.
- `POST /api/moderation/{id}/reject` не использует тело `reason` (причина от UI не сохраняется).

### Расхождения
1. **RESOLVED: payload flatten mismatch**  
   Для UI есть top-level сериализация ключевых полей, при сохранении payload-centric хранения.
2. **RESOLVED: status semantic mismatch (`review` vs `pending`)**  
   На UI-границе статусы нормализованы в pending-модель.
3. **ACTIVE (MEDIUM): reject reason mismatch**  
   UI отправляет `reason`, backend его не сохраняет и не возвращает (операционный UX-gap модерации).

### Риск
- **medium** (точечно: reject reason не персистится)

### Требуется ли фикс
- **yes** (для улучшения модерационного контекста)

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

## Runtime & delivery invariants (updated)

- **Canonical backend runtime:** `app.main:app` (`app/*`), API публикуется под `/api`.
- **Legacy runtime path removed from canonical role:** `api/main.py` отсутствует; `api/` оставлен как legacy package marker.
- **Canonical map data source:** `data/features.geojson` остаётся основным validated источником для карты.
- **Service Worker privacy guard:** private/auth `/api/*` запросы не кэшируются SW.
- **Courses/LIVE:** архитектурно интегрированы в current app shell; основной residual risk — не архитектура, а достаточность поведенческого test coverage.

---

## Resolved since previous audit

1. `coords` contract UI↔API синхронизирован.
2. Pending-based status normalization введён и выровнен для UI.
3. Draft/moderation flatten serialization реализован для top-level полей UI.
4. Canonical runtime закреплён в `app/*`, legacy `api/` выведен из runtime-роли.

---

## Current active risks

1. **Moderation reject reason gap (MEDIUM):** причина отклонения не сохраняется backend'ом.
2. **Test strategy risk for Courses/LIVE (MEDIUM):** нужен акцент на поведенческие тесты, а не только hook/static presence проверки.
3. **Doc drift risk (MEDIUM):** при дальнейших patch-циклах важно поддерживать синхронность этого snapshot-документа с кодом.

---

## Null / empty handling summary

- **Map/Search/Layers:** в целом устойчиво (много fallback-веток в UI).
- **UGC/Moderation:** логика в целом устойчивa к null; ранее критичный структурный разрыв (top-level vs payload) закрыт сериализацией для UI.

---

## Итог

На 2026-04-04 ранее зафиксированные критические UGC/moderation рассинхроны (coords/status/shape) считаются устранёнными. Текущее состояние: map/search/layers и UGC базовый контракт согласованы; активные риски смещены в область moderation UX-gap (`reject reason`) и качества test coverage для новых UI-блоков.

### Приоритетные риски (актуализировано)
1. Moderation `reject reason` не персистится (операционный контекст теряется).
2. Courses/LIVE требуют стабильного поведенческого тестового контура.
3. Поддержание doc↔code синхронности для предотвращения ложных patch-команд.
