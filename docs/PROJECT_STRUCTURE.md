# ARTEMIS — СТРУКТУРА ПРОЕКТА v4.1

Статус: обновлённая версия после синхронизации с Foundational Pack и концептуальной базой проекта (2026-04-14).
Назначение документа: фиксировать canonical структуру репозитория, архитектурные boundaries, новую систему документации и место концептуального основания проекта в doc-system.

---

## 1. ПРИНЦИП СТРУКТУРЫ v4.0

Структура проекта должна отвечать на три вопроса:
1. Где находится production/runtime код.
2. Где находятся canonical публичные данные.
3. Где находится документация и какой у неё статус.

В версии v4.0 к технической структуре добавляется жёсткая документационная иерархия:
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
| `api/` | legacy compatibility shim без самостоятельного runtime | legacy |
| `app/` | canonical backend runtime | основной |
| `css/` | основной UI style layer | основной |
| `data/` | canonical public data layer + export diagnostics | основной |
| `docs/` | canonical / working / audits / archive documentation system | основной |
| `icons/` | PWA assets | основной |
| `js/` | frontend modules | основной |
| `scripts/` | ETL, import/export, audit, release checks | основной |
| `tests/` | automated checks | основной |
| `README.md` | корневой entrypoint документации | canonical |
| `sw.js` | service worker | основной |
| `manifest.json` | PWA manifest | основной |

Дополнение по release/workflow layer:
- structural release discipline закреплён исполнимыми checks в workflow-слое (`.github/workflows/*`) и в `scripts/release_check.py`;
- Pages deploy и release-gate используют один и тот же release-check entrypoint;
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
- env/runtime configuration закрепляется только за `app.main:app`;
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
- `PRIORITIES.md` — load-bearing приоритеты текущего цикла.

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
└── moderation-runbook.md
```

Назначение:
- рабочие документы текущего цикла;
- допускают быстрые изменения;
- не считаются canonical по умолчанию;
- `ARTEMIS_AI_STRATEGY_v1_0.md` является стратегическим рабочим документом высокого уровня: он обязателен к учёту, но может обновляться быстрее, чем миссия и product scope, поэтому не входит в immutable conceptual core.

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
- миссия, product scope и статус Foundational Pack как части canonical documentation layer.

Без этого change считается незавершённым.

---

## 11. ПРАВИЛО ОБНОВЛЕНИЯ СТРУКТУРНОГО ДОКУМЕНТА

Файл обновляется только если:
1. меняется структура репозитория;
2. меняется статус canonical entrypoints;
3. меняется документационная система проекта;
4. в canonical layer добавляется или из него исключается foundational document проекта.

Детали реализации конкретных модулей не должны расползаться в этот документ.
