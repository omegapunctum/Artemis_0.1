# ARTEMIS — МАСТЕР-ПРОМПТ v4.1

Статус: canonical operational governance document for AI agents and assistants in ARTEMIS.
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

В проекте действует иерархия документации с отдельным foundation-layer.

### 2.1 Canonical source of truth
Единственными canonical документами считаются:
- `README.md`
- `docs/FOUNDATION_INDEX.md`
- `docs/ARTEMIS_CONCEPT.md`
- `docs/ARTEMIS_MASTER_PROMPT.md`
- `docs/ARTEMIS_PRODUCT_SCOPE.md`
- `docs/RESEARCH_SLICE_CONTRACT.md`
- `docs/RESEARCH_SLICE_SPEC.md`
- `docs/EPISTEMIC_CONTRACT.md`
- `docs/ENTITY_MODEL.md`
- `docs/CONTENT_GOVERNANCE.md`
- `docs/AI_POLICY.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/PROJECT_PHASES.md`
- `docs/PRIORITIES.md`
- `docs/DATA_CONTRACT.md`
- `docs/CONTROLLED_RELEASE_DECISION.md`
- `docs/DOCUMENTATION_SYSTEM.md`

Правило:
- если информация не синхронизирована с canonical docs, она не должна считаться окончательной;
- `FOUNDATION_INDEX.md` определяет foundation-layer, порядок чтения и выбор source of truth по типам решений;
- `ARTEMIS_CONCEPT.md` определяет миссию, жёсткие принципы, эпистемическую модель и долгосрочную лестницу развития;
- `ARTEMIS_PRODUCT_SCOPE.md` определяет границы ARTEMIS v1.0, главную единицу ценности и запреты против product drift;
- `RESEARCH_SLICE_CONTRACT.md` определяет Research Slice как главную product/data/UI/AI единицу ценности;
- `EPISTEMIC_CONTRACT.md` определяет операционное разделение fact/source/relation/interpretation/hypothesis/AI-output/uncertainty/counterfactual;
- `ENTITY_MODEL.md` определяет knowledge/product/runtime/context entities и relation model;
- `CONTENT_GOVERNANCE.md` определяет source policy, UGC/moderation, validation, trust, correction и publish governance;
- `AI_POLICY.md` определяет canonical границы AI behavior, AI-output, source discipline и запреты против AI drift;
- `DOCUMENTATION_SYSTEM.md` определяет роли слоёв, порядок чтения, правила размещения документов и приоритет разрешения doc-conflicts;
- старые целевые имена вроде `ARCHITECTURE.md`, `RELEASE_SYSTEM.md` и `ROADMAP.md` не должны использоваться как текущий canonical-набор, если они не существуют как действующие source-of-truth файлы в репозитории.

### 2.2 Working docs
`docs/work/*` — рабочие документы текущего цикла.
Они помогают в разработке, но не заменяют canonical layer.

Отдельное правило:
- `docs/work/ARTEMIS_AI_STRATEGY_v1_0.md` обязателен к учёту при продуктовых и AI-related решениях, но не может противоречить `AI_POLICY.md`, `EPISTEMIC_CONTRACT.md`, `CONTENT_GOVERNANCE.md`, `RESEARCH_SLICE_CONTRACT.md` и `ARTEMIS_PRODUCT_SCOPE.md`.

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
- UGC не становится canonical public content без `CONTENT_GOVERNANCE.md`, ETL/export validation и release discipline.

### 5.4 Auth
- access token — только в памяти клиента;
- refresh token — только в httpOnly cookie;
- текущие auth/session guarantees следует трактовать как baseline-capable, но не fully production-hardened для multi-instance deployments;
- hardening beyond original memory-only MVP уже существует, но не должен описываться как finished production-ready multi-node architecture.

### 5.5 PWA
- private/auth requests не должны кэшироваться;
- PWA semantics проверяются по реальному поведению, а не по наличию/отсутствию строк в `sw.js`.

### 5.6 Foundation invariants
- Research Slice остаётся главной единицей ценности ARTEMIS v1.0.
- Stories/courses должны строиться поверх slices или slice-like context, а не заменять slice model.
- AI работает как assistant/explainer/hypothesis generator, но не как source of truth.
- Fact, interpretation, hypothesis, AI-output and counterfactual scenario must not be visually or semantically collapsed.
- Entity/relation/source/media model must remain coherent with `ENTITY_MODEL.md` and `EPISTEMIC_CONTRACT.md`.

---

## 6. ТЕКУЩИЙ ПОРЯДОК РАБОТ

Активный рабочий контур:
1. **Scaling / Hardening** — Фаза 5, текущий основной активный цикл.
2. **Product / documentation coherence** — сопутствующий guardrail без расширения implementation scope.
3. **Product Expansion** — Фаза 6, запланирована после стабилизации hardening-контура и только в границах `ARTEMIS_PRODUCT_SCOPE.md` и foundation-layer.
4. **PWA / UX Stabilization** — Фаза 4 закрыта; не reopen без нового подтверждённого runtime/PWA drift.
5. **Controlled Release Stabilization** — Фаза 3 закрыта; не reopen без нового contract/release drift.

Приоритет задач внутри текущего цикла:
1. устранить scaling/hardening gaps без ложных production-ready claims;
2. удержать execution coherence между runtime, docs, release semantics и checked-in artifacts;
3. поддерживать canonical public map source discipline (`data/features.geojson` как production-default public source);
4. точечно устранять documentation drift, если он влияет на архитектуру, release, data contract, foundation-layer, phase order или product scope;
5. открывать следующий product expansion слой только после stabilization/coherence и в границах `ARTEMIS_PRODUCT_SCOPE.md`, `RESEARCH_SLICE_CONTRACT.md`, `EPISTEMIC_CONTRACT.md`, `CONTENT_GOVERNANCE.md` и `AI_POLICY.md`.

Внутренний порядок будущего product expansion:
1. research slices / saved state / shareable state;
2. stories;
3. courses;
4. explainable AI assistance;
5. вторичные product extensions.

---

## 7. ПРАВИЛО DOCS-FIRST

Для изменений в ARTEMIS действует порядок:
1. анализ;
2. определение затронутых foundation/canonical/working docs;
3. обновление проектной документации;
4. проверка внутренней согласованности;
5. только потом patch / команда для Codex;
6. затем тесты, smoke и audit note.

Если изменение затрагивает architecture / data contract / release semantics / docs hierarchy / product scope / research slice semantics / entity model / epistemic model / content governance / роль ИИ в продукте, нельзя сразу идти в код.

---

## 8. ПРАВИЛА ДЛЯ ЛЮБОГО ИЗМЕНЕНИЯ

### 8.1 Что обязательно определить до patch
- цель изменения;
- конкретные файлы;
- текущий конфликт;
- границы scope;
- проверки;
- какие canonical docs должны быть обновлены;
- затрагивает ли изменение `FOUNDATION_INDEX.md`, `ARTEMIS_CONCEPT.md`, `ARTEMIS_PRODUCT_SCOPE.md`, `RESEARCH_SLICE_CONTRACT.md`, `EPISTEMIC_CONTRACT.md`, `ENTITY_MODEL.md`, `CONTENT_GOVERNANCE.md`, `AI_POLICY.md` или `docs/work/ARTEMIS_AI_STRATEGY_v1_0.md`.

### 8.2 Что запрещено
- рефакторинг без явной причины;
- расширение scope по ходу patch;
- скрытое изменение API/контракта;
- изменение архитектуры под видом багфикса;
- развитие stories/courses/AI вне Research Slice model;
- использование AI-output как source-backed/canonical knowledge без governance;
- смешение fact/interpretation/hypothesis/AI-output/counterfactual;
- работа по старому архивному документу как по основному ориентиру.

### 8.3 Обязательная проверка после patch
- изменены только заявленные файлы;
- контракт не сломан;
- tests проходят;
- docs sync выполнен;
- foundation-layer не нарушен;
- нет competing architecture.

---

## 9. DEFINITION OF READY

Задача готова к исполнению, только если:
- проблема воспроизводима;
- указан ожидаемый результат;
- есть scope lock;
- названы конкретные файлы;
- понятны happy path и error case;
- ясно, требует ли задача обновления canonical docs;
- ясно, затрагивает ли задача foundation-layer.

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
- foundation инварианты сохранены;
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
- миссии, продуктового ядра и допустимой роли ИИ в проекте;
- Research Slice semantics;
- epistemic status / uncertainty / source discipline;
- entity/relation/source/media model;
- content governance / UGC promotion / moderation trust model;
- AI behavior / AI-output / AI policy.

### Не использовать audits как замену canonical docs
Если аудит выявил конфликт, нужно обновить соответствующий canonical doc, а не только добавить новый audit file.

### Не использовать working docs как скрытый foundation-layer
Если working doc начинает определять устойчивое правило продукта, AI, content governance, entity model или epistemic behavior, его смысл должен быть перенесён в canonical/foundation doc.

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
- не дублировать уже действующую информацию между foundation/canonical docs, а только связывать роли этих документов.

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
- добавление нового уровня архитектуры без отдельного решения;
- product expansion без проверки against foundation-layer;
- AI feature без `AI_POLICY.md` и `EPISTEMIC_CONTRACT.md`;
- UGC/public content feature без `CONTENT_GOVERNANCE.md`;
- story/course feature, обходящая `RESEARCH_SLICE_CONTRACT.md`;
- entity/relation expansion, обходящая `ENTITY_MODEL.md`.

---

## 14. КРАТКАЯ ЦЕЛЬ ДЛЯ ВСЕХ АГЕНТОВ

Не расширять ARTEMIS ценой потери целостности.

Сначала:
- устойчивый map-first runtime;
- устойчивый release/data/docs coherence;
- foundation-layer as hard guardrail;
- scaling/hardening цикл без ложных production-ready claims.

Потом:
- research slices как стабильная продуктовая единица;
- stories и courses поверх slice model;
- explainable AI assistance в рамках AI policy and epistemic contract;
- только затем вторичные продуктовые сценарии и platform-level expansion.
