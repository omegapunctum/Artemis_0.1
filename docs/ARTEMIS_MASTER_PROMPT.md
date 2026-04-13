# ARTEMIS — МАСТЕР-ПРОМПТ v4.0

Статус: обновлённая рабочая версия перед изменениями в репозитории.
Назначение: единая инструкция для ИИ-ассистентов и агентов, работающих над проектом ARTEMIS.

---

## 1. РОЛЬ ПРОЕКТА

ARTEMIS — map-first платформа для исследования пространственно-временных данных.
Ядро продукта:
- интерактивная карта;
- временная навигация;
- слои данных;
- исследовательские, образовательные и авторские сценарии поверх карты.

Ключевой принцип продукта:
**explore first, learn second, create third**.

---

## 2. ОСНОВНЫЕ ПРАВИЛА ИСТОЧНИКА ИСТИНЫ

В проекте действует новая иерархия документации.

### 2.1 Canonical source of truth
Единственными canonical документами считаются:
- `README.md`
- `docs/ARTEMIS_MASTER_PROMPT.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/PROJECT_PHASES.md`
- `docs/PRIORITIES.md`
- `docs/DATA_CONTRACT.md`
- `docs/CONTROLLED_RELEASE_DECISION.md`

Правило:
- если информация не синхронизирована с canonical docs, она не должна считаться окончательной.

### 2.2 Working docs
`docs/work/*` — рабочие документы текущего цикла.
Они помогают в разработке, но не заменяют canonical layer.

### 2.3 Audits
`docs/audits/*` — документы проверки.
Они не определяют архитектуру или roadmap, а только проверяют их.

### 2.4 Archive
`docs/archive/*` и старые snapshot-файлы — только historical reference.
Их нельзя использовать как актуальный source of truth.

---

## 3. РОЛИ ИИ-ИНСТРУМЕНТОВ

| Инструмент | Основная ответственность |
|---|---|
| ChatGPT | архитектура, системный анализ, документация, промпты, приоритизация |
| Codex | точечные patch-изменения, ETL, backend, CI, tests |
| Claude | исторический контент, тексты, таблицы, CSV, нормализация данных |

Правила:
- роли не смешивать без явной причины;
- один запрос — один тип артефакта;
- сначала решение и документация, потом patch в репозиторий.

---

## 4. ТЕХНИЧЕСКИЙ СТЕК (ЗАФИКСИРОВАН)

### Frontend
- Vanilla JavaScript ES modules
- HTML
- CSS
- MapLibre

### Backend
- FastAPI
- SQLite как текущий baseline
- дальнейший рост допускает PostgreSQL

### Data
- Airtable как curated source
- ETL публикует canonical данные в `data/*`
- public map читает только `data/features.geojson`

### Hosting / automation
- GitHub Pages для frontend
- backend отдельно
- GitHub Actions для ETL / checks / release workflows

### Жёсткие запреты
- React / Vue / Angular / TypeScript без отдельного архитектурного решения
- прямой доступ frontend к Airtable
- хранение токенов в browser storage
- превращение `/api/map/feed` в второй canonical public source
- скрытое изменение архитектуры через "маленький патч"

---

## 5. АРХИТЕКТУРНЫЕ ИНВАРИАНТЫ

### 5.1 Public data contract
- `data/features.geojson` — единственный canonical public map source.
- `features.json` — не public source of truth.
- `/api/map/feed` — runtime support read-model и non-canonical слой.
- runtime API не подменяет published `/data/*`.

### 5.1.1 Upload contract
- upload/media runtime контракт: `POST /api/uploads`;
- required multipart fields: `file`, `license`;
- optional multipart fields: `title`, `description`;
- canonical response fields: `id`, `url`, `filename`, `license`;
- frontend обязан использовать backend-returned `url` как runtime source of truth для доступа к загруженному файлу.

### 5.2 Runtime boundaries
- `app/` — единственный backend runtime.
- `api/` — только legacy compatibility shim.
- moderation path не равен publish path.

### 5.3 Governance
- intake → review 1 → review 2 → batch publish → overwrite public dataset.
- publish не выполняется напрямую из runtime UI.

### 5.4 Auth
- access token — только в памяти клиента;
- refresh token — только в httpOnly cookie;
- текущая модель auth single-instance oriented и не должна выдаваться за multi-node ready.

### 5.5 PWA
- private/auth requests не должны кэшироваться;
- PWA semantics проверяются по реальному поведению, а не по наличию/отсутствию строк в `sw.js`.

---

## 6. ТЕКУЩИЙ ПОРЯДОК РАБОТ

Приоритет фаз:
1. Scaling / Hardening
2. Canonical docs + release-contract synchronization
3. Runtime UX/PWA stabilization
4. Contract/test hardening для критических surface-слоёв
5. Product Expansion

Приоритет задач внутри цикла:
1. закрыть contract drift;
2. синхронизировать docs и release system;
3. удержать architecture boundaries;
4. только потом добавлять новый продуктовый scope.

---

## 7. ПРАВИЛО DOCS-FIRST

Для изменений в ARTEMIS действует порядок:
1. анализ;
2. обновление проектной документации;
3. проверка внутренней согласованности;
4. только потом patch / команда для Codex;
5. затем тесты, smoke и audit note.

Если изменение затрагивает architecture / data contract / release semantics / docs hierarchy, нельзя сразу идти в код.

---

## 8. ПРАВИЛА ДЛЯ ЛЮБОГО ИЗМЕНЕНИЯ

### 8.1 Что обязательно определить до patch
- цель изменения;
- конкретные файлы;
- текущий конфликт;
- границы scope;
- проверки;
- какие canonical docs должны быть обновлены.

### 8.2 Что запрещено
- рефакторинг без явной причины;
- расширение scope по ходу patch;
- скрытое изменение API/контракта;
- изменение архитектуры под видом багфикса;
- работа по старому архивному документу как по основному ориентиру.

### 8.3 Обязательная проверка после patch
- изменены только заявленные файлы;
- контракт не сломан;
- tests проходят;
- docs sync выполнен;
- нет competing architecture.

---

## 9. DEFINITION OF READY

Задача готова к исполнению, только если:
- проблема воспроизводима;
- указан ожидаемый результат;
- есть scope lock;
- названы конкретные файлы;
- понятны happy path и error case;
- ясно, требует ли задача обновления canonical docs.

Если один из пунктов отсутствует, задача не считается готовой.

---

## 10. DEFINITION OF DONE

Задача считается выполненной только если:
- patch применён чисто;
- изменены только нужные файлы;
- tests прошли;
- happy path подтверждён;
- error case подтверждён;
- архитектурные инварианты сохранены;
- docs sync выполнен;
- нет скрытого drift после изменения.

---

## 11. ПРАВИЛА РАБОТЫ С ДОКУМЕНТАМИ

### Обновлять canonical docs обязательно при изменении:
- architecture boundaries;
- backend/runtime entrypoints;
- data contract;
- ETL/export/publish semantics;
- release gate / readiness / smoke semantics;
- статуса фаз и порядка работ.

### Не использовать audits как замену canonical docs
Если аудит выявил конфликт, нужно обновить соответствующий canonical doc, а не только добавить новый audit file.

### Не использовать archive как текущий ориентир
Старые v3.x snapshot-документы можно читать только для истории решений.

---

## 12. ФОРМАТ ОТВЕТА ДЛЯ РАБОЧИХ ЗАДАЧ

Если требуется анализ:
- сначала вывод;
- затем список конфликтов;
- затем next action.

Если требуется документация:
- сначала готовый документ или пакет документов;
- затем краткий комментарий, что именно изменилось.

Если требуется задача для Codex:
- GOAL
- CONTEXT
- DO
- SCOPE LOCK
- CHECKS
- OUTPUT FORMAT

---

## 13. АНТИ-ПАТТЕРНЫ

Запрещено:
- "сделай всё сразу";
- "улучши весь проект";
- patch без scope lock;
- patch без checks;
- работа только по устаревшему snapshot-документу;
- смешение roadmap, audits и archive в одном operational файле;
- добавление нового уровня архитектуры без отдельного решения.

---

## 14. КРАТКАЯ ЦЕЛЬ ДЛЯ ВСЕХ АГЕНТОВ

Не расширять ARTEMIS ценой потери целостности.

Сначала:
- согласованный release system;
- согласованный data contract;
- согласованная documentation hierarchy;
- устойчивый map-first runtime.

Потом:
- новые функции;
- новые продуктовые сценарии;
- platform-level expansion.
