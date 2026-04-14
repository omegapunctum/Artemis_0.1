# ARTEMIS — МАСТЕР-ПРОМПТ v4.1

Статус: обновлённая версия после синхронизации с Foundational Pack и концептуальной базой ARTEMIS v1.0 (2026-04-14).
Назначение: единая инструкция для ИИ-ассистентов и агентов, работающих над проектом ARTEMIS.

---

## 1. РОЛЬ ПРОЕКТА

ARTEMIS — AI-native explainable spatial-temporal research platform.
В operational контуре проекта это означает:
- map-first платформа для исследования пространственно-временных данных;
- интерактивная карта, временная навигация и слои данных как базовый runtime;
- исследовательские, образовательные и авторские сценарии поверх карты;
- объяснимый ИИ как слой помощи, а не как источник истины.

Ключевой принцип продукта:
**explore first, learn second, create third**.

Ключевая продуктовая единица ARTEMIS v1.0:
**research slice / исследовательский срез**.

---

## 2. ОСНОВНЫЕ ПРАВИЛА ИСТОЧНИКА ИСТИНЫ

В проекте действует новая иерархия документации.

### 2.1 Canonical source of truth
Единственными canonical документами считаются:
- `README.md`
- `docs/ARTEMIS_CONCEPT.md`
- `docs/ARTEMIS_MASTER_PROMPT.md`
- `docs/ARTEMIS_PRODUCT_SCOPE.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/PROJECT_PHASES.md`
- `docs/PRIORITIES.md`
- `docs/DATA_CONTRACT.md`
- `docs/CONTROLLED_RELEASE_DECISION.md`

Правило:
- если информация не синхронизирована с canonical docs, она не должна считаться окончательной;
- `ARTEMIS_CONCEPT.md` определяет миссию, жёсткие принципы, эпистемическую модель и долгосрочную лестницу развития;
- `ARTEMIS_PRODUCT_SCOPE.md` определяет границы ARTEMIS v1.0, главную единицу ценности и запреты против product drift;
- старые целевые имена вроде `ARCHITECTURE.md`, `RELEASE_SYSTEM.md` и `ROADMAP.md` не должны использоваться как текущий canonical-набор, если они не существуют как действующие source-of-truth файлы в репозитории.

### 2.2 Working docs
`docs/work/*` — рабочие документы текущего цикла.
Они помогают в разработке, но не заменяют canonical layer.

Отдельное правило:
- `docs/work/ARTEMIS_AI_STRATEGY.md` обязателен к учёту при продуктовых и AI-related решениях, но остаётся working document, потому что должен обновляться быстрее, чем миссия и product scope.

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
- release/workflow слой должен быть согласован с checked-in `data/*` и текущим набором canonical docs

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
- runtime API не подменяет published `/data/*`.

### 5.2 Runtime boundaries
- `app/` — единственный backend runtime.
- `api/` — только legacy compatibility shim.
- moderation path не равен publish path.
- upload runtime contract должен быть синхронизирован между `js/*`, `app/uploads/*`, `README.md` и tests; нельзя допускать, чтобы frontend и backend ожидали разные обязательные поля одного и того же endpoint.

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
1. Controlled Release Stabilization
2. PWA / UX Stabilization
3. Scaling / Hardening
4. Product Expansion

Приоритет задач внутри цикла:
1. закрыть contract drift;
2. синхронизировать docs и release system;
3. устранить runtime/API drift между frontend и backend;
4. удержать architecture boundaries;
5. только потом открывать product expansion в границах `ARTEMIS_PRODUCT_SCOPE.md`.

Внутренний порядок будущего product expansion:
1. research slices / saved state
2. stories
3. courses
4. explainable AI assistance
5. вторичные product extensions

---

## 7. ПРАВИЛО DOCS-FIRST

Для изменений в ARTEMIS действует порядок:
1. анализ;
2. обновление проектной документации;
3. проверка внутренней согласованности;
4. только потом patch / команда для Codex;
5. затем тесты, smoke и audit note.

Если изменение затрагивает architecture / data contract / release semantics / docs hierarchy / product scope / роль ИИ в продукте, нельзя сразу идти в код.

---

## 8. ПРАВИЛА ДЛЯ ЛЮБОГО ИЗМЕНЕНИЯ

### 8.1 Что обязательно определить до patch
- цель изменения;
- конкретные файлы;
- текущий конфликт;
- границы scope;
- проверки;
- какие canonical docs должны быть обновлены;
- затрагивает ли изменение `ARTEMIS_CONCEPT.md`, `ARTEMIS_PRODUCT_SCOPE.md` или `docs/work/ARTEMIS_AI_STRATEGY.md`.

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
- upload/auth/runtime API surface;
- статуса фаз и порядка работ;
- миссии, продуктового ядра и допустимой роли ИИ в проекте.

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
- затем краткий комментарий, что именно изменилось;
- не дублировать уже действующую информацию между `ARTEMIS_CONCEPT`, `ARTEMIS_PRODUCT_SCOPE`, `PROJECT_PHASES`, `PRIORITIES` и `MASTER_PROMPT`, а только связывать роли этих документов.

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
- research slices как стабильная продуктовая единица;
- stories и courses;
- explainable AI assistance;
- только затем вторичные продуктовые сценарии и platform-level expansion.
