# ARTEMIS — СТРУКТУРА ПРОЕКТА v4.1

Статус: updated canonical project structure document.
Назначение документа: фиксировать canonical структуру репозитория, архитектурные boundaries, documentation system и место концептуального основания проекта в doc-system.

---

## 1. ПРИНЦИП СТРУКТУРЫ

Структура проекта должна отвечать на три вопроса:
1. Где находится production/runtime код.
2. Где находятся canonical публичные данные.
3. Где находится документация и какой у неё статус.

К технической структуре добавляется жёсткая документационная иерархия:
- canonical source-of-truth layer;
- working layer (`docs/work/*`);
- audit layer (`docs/audits/*`);
- historical reference layer (`docs/archive/*`, `docs/reference/*`).

Это обязательная часть структуры проекта, а не вспомогательная заметка.

---

## 2. КОРЕНЬ ПРОЕКТА

```text
/
├── .github/
├── api/
├── app/
├── css/
├── data/
├── docs/
├── icons/
├── js/
├── scripts/
├── tests/
├── index.html
├── manifest.json
├── pytest.ini
├── README.md
├── requirements.txt
├── sw.js
└── ...
```

### Назначение верхнего уровня

| Путь | Назначение | Статус |
|---|---|---|
| `.github/` | workflows, CI/CD, release/publish automation | системный |
| `api/` | legacy compatibility shim без самостоятельного runtime; допускается как переходный package marker до cleanup legacy references | legacy |
| `app/` | canonical backend runtime | основной |
| `css/` | основной UI style layer | основной |
| `data/` | canonical public data layer + export diagnostics | основной |
| `docs/` | canonical / working / audits / archive / reference documentation system | основной |
| `icons/` | PWA assets | основной |
| `js/` | frontend modules | основной |
| `scripts/` | ETL, import/export, audit, release checks | основной |
| `tests/` | automated checks | основной |
| `README.md` | корневой entrypoint документации | canonical |
| `sw.js` | service worker | основной |
| `manifest.json` | PWA manifest | основной |

Дополнение по release/workflow layer:
- structural release discipline закреплён исполнимыми checks в workflow-слое (`.github/workflows/*`) и в `scripts/release_check.py`;
- `scripts/release_check.py` остаётся canonical executable release/readiness entrypoint;
- точные enforcement points должны определяться по текущим workflow files, а не по упрощённой формулировке в одном summary-документе;
- workflow-слой не заменяет полный regression suite и не должен описываться как его эквивалент.

---

## 3. CANONICAL ENTRYPOINTS

| Слой | Entry point |
|---|---|
| Frontend | `index.html` |
| Backend | `app/main.py` |
| ETL | `scripts/export_airtable.py` |
| Release check | `scripts/release_check.py` |
| Public map data | `data/features.geojson` |
| Root documentation entry | `README.md` |

Правило:
- canonical entrypoint всегда должен быть один;
- competing entrypoints запрещены;
- legacy-слои не могут становиться скрытым альтернативным runtime.

---

## 4. FRONTEND СЛОЙ

```text
index.html
css/
└── style.css

js/
├── auth.js
├── courses_runtime.js
├── data.js
├── explain_context.js
├── map.js
├── pwa.js
├── research_slices.js
├── safe-dom.js
├── state.js
├── stories.js
├── ugc.js
├── ui.js
├── ui.moderation.js
├── ui.ugc.js
├── uploads.js
└── ux.js
```

Правила:
- frontend остаётся vanilla JS без нового framework layer;
- карта читает canonical public data только из `data/*`;
- `/api/map/feed` не становится альтернативным public data source;
- безопасный DOM-rendering обязателен для пользовательского контента;
- PWA и UX-hardenings не должны подменять архитектурные boundaries.

---

## 5. BACKEND СЛОЙ

```text
app/
├── main.py
├── routes/
├── auth/
├── courses/
├── drafts/
├── explain_context/
├── moderation/
├── research_slices/
├── security/
├── stories/
├── uploads/
├── observability.py
├── map_feed_schemas.py
└── url_validation.py
```

Правила:
- `app/` — единственный backend runtime;
- новый runtime-код в `api/` запрещён;
- сохранение пустого legacy package в `api/` само по себе не считается отдельным runtime entrypoint;
- env/runtime configuration закрепляется только за `app.main:app`;
- session backend deployment policy: memory-backed refresh sessions допустимы только для development/testing/local baseline (включая short aliases `dev`/`test`); non-development/testing/local deployments обязаны использовать Redis-backed session store (`AUTH_SESSION_BACKEND=redis` + `REDIS_URL`) с fail-fast на misconfiguration;
- Redis-backed refresh-session consume в текущем baseline трактуется как atomic one-time operation (`GETDEL` или atomic fallback path), а legacy non-atomic `get+delete` не должен считаться допустимым baseline-поведением;
- rate limiting в текущем baseline остаётся process-local/in-memory; `X-Forwarded-For` для извлечения client IP в rate-limit key trusted только от configured trusted proxy peers (`ARTEMIS_TRUSTED_PROXIES` / `TRUSTED_PROXY_IPS`, exact IP + CIDR), иначе используется peer IP (`request.client.host`);
- текущий persistence baseline использует shared SQLAlchemy scope: `app.auth.service` задаёт общий `engine`/`Base`, который переиспользуется в `drafts` / `research_slices` / `stories` / `courses`;
- migration/bootstrap path текущего baseline выполняется при runtime startup через `init_db()` вызовы в `app.main.py`, а не через отдельный внешний migration orchestrator;
- versioned migrations в backend опираются на общую `schema_version` discipline как baseline-механизм и не должны трактоваться как fully hardened production migration platform;
- общая `schema_version` таблица рассматривается как shared baseline coordination mechanism для всех runtime-доменов, а не как изолированный per-service журнал;
- migration version ids в общей `schema_version` модели должны оставаться глобально уникальными и domain-coordinated между `auth` / `drafts` / `research_slices` / `stories` / `courses`;
- новые migration steps нельзя добавлять произвольно: перед добавлением версии обязателен локальный check текущего version space в общей `schema_version` discipline, чтобы избежать ручного drift/коллизий;
- startup owner gate текущего baseline: migration apply path выполняется только при `MIGRATION_STARTUP_ROLE=owner`; `MIGRATION_STARTUP_ROLE=non-owner` выполняет обычный runtime boot без apply;
- вне development/testing/local aliases `MIGRATION_STARTUP_ROLE` должен быть явно задан (`owner`/`non-owner`), иначе startup трактуется как fail-fast config error;
- execution policy текущего baseline: migration/apply path выполняется в controlled single-writer режиме (явный owner запуска), а не как некоординированный конкурентный first-boot apply из нескольких инстансов одновременно;
- рекомендуемый baseline порядок выполнения: preflight-only discipline check → migration/apply path (`init_db()` startup sequence) → обычный runtime boot;
- concurrent first-boot apply считается нарушением baseline guardrail и не должен нормализоваться как допустимая operational практика;
- ошибка preflight трактуется как stop-before-apply event; ошибка startup apply трактуется как fail-fast operational event, а не как silent retry semantics внутри текущего baseline.
- moderation path не является direct publish path для public dataset;
- текущий upload surface должен описываться как runtime split: API-приём файлов идёт через `/api/uploads` и `/api/uploads/image`, а публичная выдача загруженных файлов идёт через статический `/uploads/*` mount;
- документация не должна описывать несуществующий отдельный runtime route `GET /api/uploads/{filename}`, если фактическая раздача файлов закреплена за static mount.

---

## 6. DATA LAYER

```text
data/
├── courses.json
├── export_errors.log
├── export_meta.json
├── features.geojson
├── features.json
├── layers.json
├── rejected.json
└── validation_report.json
```

Правила:
- `data/features.geojson` — canonical public map source;
- `features.json` не является public source of truth;
- raw / validated / rejected слои не смешиваются;
- checked-in data artifacts должны использовать тот же contract, что и release gate;
- `validation_report.json` и `export_errors.log` следует трактовать как диагностические артефакты, а не как отдельные source-of-truth слои, если release gate не опирается на них напрямую.

---

## 7. SCRIPTS / ETL / CHECKS

```text
scripts/
├── audit_airtable.py
├── build_geojson.py
├── export_airtable.py
├── import_features.py
└── release_check.py
```

```text
tests/
└── ...
```

Правила:
- `scripts/` отвечают за ETL, import/export, checks, preparation;
- `tests/` отвечают за автоматическую проверку контрактов и регрессий;
- release discipline не должна жить только в Markdown без исполнимой проверки.

---

## 8. НОВАЯ СИСТЕМА ДОКУМЕНТАЦИИ

Цель:
Перевести документацию ARTEMIS из разросшегося набора файлов в управляемую систему.

### 8.1 Root-level canonical document

```text
README.md
```

Назначение:
- главный вход в проект;
- краткое описание продукта, стека, запуска и ссылок на canonical docs;
- не заменяет архитектурные и release-документы, но направляет к ним.

### 8.2 Canonical docs

Целевой слой:

```text
docs/
├── ARTEMIS_CONCEPT.md
├── ARTEMIS_MASTER_PROMPT.md
├── ARTEMIS_PRODUCT_SCOPE.md
├── CONTROLLED_RELEASE_DECISION.md
├── DATA_CONTRACT.md
├── DOCUMENTATION_SYSTEM.md
├── PRIORITIES.md
├── PROJECT_PHASES.md
└── PROJECT_STRUCTURE.md
```

Назначение:
- `ARTEMIS_CONCEPT.md` — миссия, видение, жёсткие принципы, эпистемическая модель и строгая лестница развития проекта;
- `ARTEMIS_MASTER_PROMPT.md` — общие правила работы агентов, docs-first discipline, архитектурные инварианты и порядок принятия решений;
- `ARTEMIS_PRODUCT_SCOPE.md` — границы ARTEMIS v1.0, главная единица ценности, primary loop и запреты против product drift;
- `DATA_CONTRACT.md` — ETL/data/publish contract;
- `CONTROLLED_RELEASE_DECISION.md` — правила controlled release, baseline-ограничения и критерии допуска;
- `PROJECT_STRUCTURE.md` — boundaries, entrypoints, runtime rules и структура документационной системы;
- `PROJECT_PHASES.md` — активные фазы и переходы;
- `PRIORITIES.md` — load-bearing приоритеты текущего цикла;
- `DOCUMENTATION_SYSTEM.md` — правила documentation governance, роли слоёв и порядок разрешения doc-conflicts.

Правило:
- только этот набор плюс `README.md` считается source of truth;
- conceptual foundation (`ARTEMIS_CONCEPT.md` + `ARTEMIS_PRODUCT_SCOPE.md`) входит в canonical layer и не может существовать только как внешний черновик;
- упоминание старого canonical-набора (`ARCHITECTURE.md`, `RELEASE_SYSTEM.md`, `ROADMAP.md`) считается documentation drift, если эти файлы не являются реальными действующими canonical entrypoints.

### 8.3 Working docs

Текущий слой:

```text
docs/work/
├── ARTEMIS_AI_STRATEGY_v1_0.md
├── ARTEMIS_UI_UX_IMPLEMENTATION_PLAN_v1_0.md
├── moderation-runbook.md
└── uiux/
    ├── ARTEMIS_UI_UX_SYSTEM.md
    ├── ARTEMIS_UI_UX_COMPONENT_MAP.md
    └── ARTEMIS_UI_UX_VISUAL_SYSTEM.md
```

Назначение:
- рабочие документы текущего цикла;
- допускают быстрые изменения;
- не считаются canonical по умолчанию;
- `ARTEMIS_AI_STRATEGY_v1_0.md` является стратегическим рабочим документом высокого уровня: он обязателен к учёту, но может обновляться быстрее, чем миссия и product scope, поэтому не входит в immutable conceptual core;
- UI/UX working specs физически размещаются в `docs/work/uiux/`, а не в canonical root `docs/`; `ARTEMIS_UI_UX_SYSTEM.md` владеет общей UX-моделью, `ARTEMIS_UI_UX_COMPONENT_MAP.md` — картой компонентов и состояний, `ARTEMIS_UI_UX_VISUAL_SYSTEM.md` — visual design layer.

### 8.4 Audits

Текущий слой:

```text
docs/audits/
└── *.md
```

Назначение:
- фиксируют результаты проверок;
- не определяют архитектуру или roadmap;
- всегда проверяют canonical docs, а не заменяют их.

### 8.5 Archive / Reference

Текущий слой:

```text
docs/archive/
└── ...

docs/reference/
└── ...
```

Назначение:
- старые snapshot-документы и reference-материалы;
- historical context;
- reference only.

Правило:
- archive/reference слой нельзя использовать как текущий source of truth.

---

## 9. ЧТО СЧИТАЕТСЯ НАРУШЕНИЕМ СТРУКТУРЫ

Технические нарушения:
- новый runtime-код в `api/`;
- прямой доступ frontend к Airtable;
- implicit fallback public map на runtime API;
- смешивание draft/runtime/public data contracts;
- competing backend entrypoints.

Документационные нарушения:
- несколько равноправных source-of-truth документов по одной теме;
- хранение активного roadmap в archive/reference-слое;
- несинхрон canonical docs и checked-in release/data behavior;
- использование audit-файла вместо обновления canonical doc;
- обновление кода без обязательного docs sync для архитектурных, data и release изменений;
- сохранение в canonical docs старых имён документов или старых API summary после смены фактической структуры проекта;
- отсутствие в canonical layer зафиксированной концептуальной базы проекта при фактическом использовании Foundational Pack в решениях куратора и ИИ.

---

## 10. ПРАВИЛО DOCS SYNC

Любое изменение в следующих областях обязано сопровождаться обновлением canonical docs:
- architecture boundaries;
- data contract;
- release gate / workflow / readiness semantics;
- canonical public map source;
- auth/runtime deployment constraints;
- миссия, product scope и статус Foundational Pack как части canonical documentation layer;
- documentation governance и правила размещения документов.

Без этого change считается незавершённым.

---

## 11. ПРАВИЛО ОБНОВЛЕНИЯ СТРУКТУРНОГО ДОКУМЕНТА

Файл обновляется только если:
1. меняется структура репозитория;
2. меняется статус canonical entrypoints;
3. меняется документационная система проекта;
4. в canonical layer добавляется или из него исключается foundational document проекта.

Детали реализации конкретных модулей не должны расползаться в этот документ.
