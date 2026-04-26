# ARTEMIS — DOCUMENTATION SYSTEM STRUCTURE SPEC

**Статус:** archived / historical reference  
**Дата:** 2026-04-19  
**Версия:** v1_0  
**Назначение:** historical structure proposal for ARTEMIS documentation placement. Current canonical documentation governance is defined in `docs/DOCUMENTATION_SYSTEM.md`.

---

## 1. Цель документа

Этот документ фиксирует целевую организацию документации проекта ARTEMIS:
- какие документы должны храниться в репозитории;
- какие документы допустимо держать в ChatGPT;
- какие материалы целесообразно вести в Google Drive;
- как должна выглядеть структура папок `docs/`;
- какие текущие документы должны считаться canonical, working, audit или archive;
- какие документы нужно перенести, переименовать, архивировать или исключить из active layer.

Документ не заменяет `README.md`, `PROJECT_STRUCTURE.md`, `PROJECT_PHASES.md` или `PRIORITIES.md`, а задаёт практическую схему размещения и организации документационного слоя.

---

## 2. Принцип организации

В ARTEMIS должно быть **три носителя документации**, но только **один основной source of truth для системных решений**.

### 2.1 Носители

1. **GitHub / репозиторий**
   - основной versioned слой;
   - единственный source of truth для архитектуры, структуры проекта, фаз, приоритетов, data contract, release rules и load-bearing документации.

2. **ChatGPT**
   - operational intelligence layer;
   - место для мастер-промптов, агентных инструкций, synthesis-документов, временных decision packs, audit synthesis и рабочих разложений задач.

3. **Google Drive**
   - collaborative editing layer;
   - место для длинных контентных документов, исследовательских заметок, редакторских пайплайнов, таблиц источников, контентных реестров, презентационных материалов.

### 2.2 Главный принцип

Если документ определяет:
- архитектурные границы;
- продуктовые границы;
- runtime semantics;
- data contract;
- release readiness;
- порядок фаз;
- приоритеты;
- правила документационной иерархии;

то он должен жить в **GitHub**, а не в ChatGPT и не в Google Drive.

---

## 3. Целевая структура GitHub-документации

### 3.1 Верхний уровень репозитория

```text
/
├── README.md
├── docs/
├── scripts/
├── tests/
├── app/
├── js/
├── css/
├── data/
└── ...
```

### 3.2 Целевая структура `docs/`

```text
docs/
├── ARTEMIS_CONCEPT.md
├── ARTEMIS_MASTER_PROMPT.md
├── ARTEMIS_PRODUCT_SCOPE.md
├── PROJECT_STRUCTURE.md
├── PROJECT_PHASES.md
├── PRIORITIES.md
├── DATA_CONTRACT.md
├── CONTROLLED_RELEASE_DECISION.md
├── DOCUMENTATION_STORAGE_POLICY.md
├── DOCUMENTATION_SYSTEM_STRUCTURE.md
│
├── work/
│   ├── ARTEMIS_AI_STRATEGY.md
│   ├── UI_UX_SYSTEM.md
│   ├── UI_UX_COMPONENT_MAP.md
│   ├── COURSES_SCOPE.md
│   ├── FUNCTIONAL_EXPANSION_PLAN.md
│   └── other active working docs...
│
├── audits/
│   ├── runtime audits
│   ├── frontend audits
│   ├── backend audits
│   ├── release audits
│   └── docs sync audits
│
├── archive/
│   ├── old snapshots
│   ├── superseded sync files
│   ├── deprecated roadmap files
│   └── historical planning docs
│
└── reference/
    ├── optional external references
    └── non-governing background materials only
```

---

## 4. Что считать canonical в GitHub

В canonical layer должны остаться только документы, которые определяют систему проекта.

### 4.1 Обязательный canonical-набор

- `README.md`
- `docs/ARTEMIS_CONCEPT.md`
- `docs/ARTEMIS_MASTER_PROMPT.md`
- `docs/ARTEMIS_PRODUCT_SCOPE.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/PROJECT_PHASES.md`
- `docs/PRIORITIES.md`
- `docs/DATA_CONTRACT.md`
- `docs/CONTROLLED_RELEASE_DECISION.md`
- `docs/DOCUMENTATION_STORAGE_POLICY.md`
- `docs/DOCUMENTATION_SYSTEM_STRUCTURE.md`

### 4.2 Роль canonical layer

Canonical layer отвечает только на следующие вопросы:
- что такое ARTEMIS;
- где продуктовые границы;
- как устроен проект;
- какой сейчас operational baseline;
- какой data contract обязателен;
- как выглядит release logic;
- как организована документационная система;
- какие фазы активны;
- какие приоритеты действуют сейчас.

### 4.3 Что не должно попадать в canonical

В canonical layer нельзя держать:
- узкие UI/UX-черновики;
- временные аналитические сводки;
- аудиты;
- snapshot-файлы;
- старые sync-версии;
- редакторские исследования;
- длинные brainstorm-документы;
- документы, которые быстро устаревают и не задают системные правила.

---

## 5. Что должно находиться в `docs/work/`

`docs/work/` — это active working layer внутри репозитория.

Туда следует размещать документы, которые:
- нужны в текущем цикле разработки;
- влияют на работу, но не являются верхнеуровневым source of truth;
- могут меняться чаще, чем canonical docs;
- конкретизируют отдельные продуктовые или UI/UX блоки.

### 5.1 Типы рабочих документов

- AI strategy
- UI/UX system spec
- UI/UX component map
- courses scope
- expansion plans
- migration plans
- docs cleanup plans
- working design notes
- rollout plans

### 5.2 Правило

Если рабочий документ начинает определять системные правила всего проекта, его нужно либо:
- поднять в canonical layer;
- либо извлечь из него системную часть в отдельный canonical document.

---

## 6. Что должно находиться в `docs/audits/`

В `docs/audits/` должны находиться только проверочные документы.

### 6.1 Допустимое содержимое

- deep audit repo state;
- release readiness audit;
- frontend/runtime audit;
- backend audit;
- documentation sync audit;
- PWA audit;
- map/UX audit;
- smoke check notes;
- post-change verification.

### 6.2 Ограничение

Audit-документы:
- не задают архитектуру;
- не заменяют canonical docs;
- не должны быть единственным местом, где описана проблема или правило.

Если аудит нашёл конфликт, нужно обновить соответствующий canonical или working document.

---

## 7. Что должно находиться в `docs/archive/`

`docs/archive/` хранит только historical reference.

Туда необходимо переносить:
- старые snapshot-документы;
- superseded версии фаз/приоритетов/структуры;
- старые master prompt snapshots;
- obsolete roadmap files;
- прежние sync files после их переноса в актуальный canonical layer;
- документы, которые важны для traceability, но не должны участвовать в текущем управлении проектом.

### 7.1 Ограничение

Ничего из `docs/archive/` нельзя использовать как текущий operational ориентир без явного подтверждения в canonical docs.

---

## 8. Что оставлять в ChatGPT

В ChatGPT нужно держать только те документы, которые полезны как рабочая память и orchestration layer.

### 8.1 Оставлять в ChatGPT

- Codex operating instructions;
- мастер-промпты агентов;
- role definitions;
- audit-agent prompts;
- decomposition frameworks;
- synthesis of repo/doc conflicts;
- next action packs;
- decision drafts до их фиксации;
- временные аналитические сводки;
- рабочие пакеты для конкретного цикла.

### 8.2 Не оставлять только в ChatGPT

Нельзя держать только в ChatGPT документы, если они определяют:
- архитектуру;
- phases;
- priorities;
- data contract;
- release rules;
- product scope;
- documentation hierarchy.

Если это происходит, документ должен быть перенесён в репозиторий.

---

## 9. Что выносить в Google Drive

Google Drive нужен для документов, которые активно правятся вручную, согласуются людьми или требуют удобного совместного редактирования.

### 9.1 Подходящие типы материалов

**Google Docs**
- исторические исследования;
- контентные драфты;
- long-form narratives;
- drafts for stories/courses;
- источниковедческие сводки;
- редакторские briefs.

**Google Sheets**
- реестр объектов;
- source tracking;
- контентный pipeline;
- moderation queues;
- editorial checklists;
- verification tables;
- data collection plans.

**Google Slides**
- концептуальные презентации;
- внешние презентационные материалы;
- визуальные narrative decks;
- презентации для партнёров/показов.

### 9.2 Ограничение

Google Drive не должен быть основным источником истины для:
- архитектуры проекта;
- фаз;
- приоритетов;
- API/runtimes;
- release logic;
- документационной иерархии.

После согласования load-bearing выводы должны переноситься в GitHub.

---

## 10. Целевое распределение текущих ARTEMIS-документов

### 10.1 Оставить в GitHub как canonical

- `README.md`
- `ARTEMIS_CONCEPT.md`
- `ARTEMIS_MASTER_PROMPT.md`
- `ARTEMIS_PRODUCT_SCOPE.md`
- `PROJECT_STRUCTURE.md`
- `PROJECT_PHASES.md`
- `PRIORITIES.md`
- `DATA_CONTRACT.md`
- `CONTROLLED_RELEASE_DECISION.md`
- новый `DOCUMENTATION_STORAGE_POLICY.md`
- новый `DOCUMENTATION_SYSTEM_STRUCTURE.md`

### 10.2 Переместить в `docs/work/`

Документы такого типа:
- UI/UX system files;
- UI/UX component map;
- AI strategy;
- courses scope;
- functional expansion planning;
- другие активные специализированные рабочие спецификации.

### 10.3 Переместить в `docs/archive/`

Документы такого типа:
- foundational sync snapshots;
- old priorities/project phases/project structure snapshots;
- superseded master prompt files;
- устаревшие roadmap-пакеты;
- checkpoint-документы, если они больше не участвуют в текущем управлении.

### 10.4 Оставить в ChatGPT

- `ARTEMIS_CODEX_OPERATING_INSTRUCTION_v1.01`
- мастер-промпты рабочих агентов;
- внутренние task-pack templates;
- temporary synthesis docs;
- conflict maps между repo и docs;
- пакеты разложений для текущих рабочих циклов.

### 10.5 Вести в Google Drive

- исследовательские контентные массивы;
- таблицы по историческим объектам и источникам;
- редакторские пайплайны;
- narrative/course drafts;
- совместные long-form документы;
- бренд и визуальные материалы.

---

## 11. Что нужно сделать в текущем репозитории

### 11.1 Структурные действия

1. Зафиксировать `DOCUMENTATION_STORAGE_POLICY.md` в `docs/`.
2. Зафиксировать `DOCUMENTATION_SYSTEM_STRUCTURE.md` в `docs/`.
3. Переместить специализированные рабочие документы в `docs/work/`.
4. Убрать snapshot/sync-файлы из active root `docs/` в `docs/archive/`.
5. Проверить, нужен ли `docs/reference/`; если он не несёт отдельной функции, сократить его роль.
6. Обновить `README.md` и/или `PROJECT_STRUCTURE.md`, если там ещё не отражены новые документы policy/system structure.

### 11.2 Naming cleanup

Нужно привести документы к единой naming policy:
- без `updated`;
- без `final_version`;
- без `sync` как operational suffix;
- без дублирующих смыслов;
- с ясной функцией файла.

При необходимости snapshot-версии можно сохранять в archive, но они не должны конкурировать с active-layer naming.

---

## 12. Governance-правила

### 12.1 При конфликте носителей

Если информация расходится между:
- GitHub и ChatGPT;
- GitHub и Google Drive;
- ChatGPT и Google Drive;

приоритет такой:

1. **GitHub canonical docs**
2. **GitHub working docs**
3. **ChatGPT operational materials**
4. **Google Drive collaborative drafts**
5. **archive/reference materials**

### 12.2 Когда переносить документ из ChatGPT или Drive в GitHub

Документ должен быть перенесён в GitHub, если он начинает:
- фиксировать системное решение;
- задавать правило для репозитория;
- определять структуру проекта;
- менять фазы или приоритеты;
- менять contract/release semantics;
- использоваться как основание для patch/change request.

### 12.3 Когда документ можно оставить вне GitHub

Документ можно оставить в ChatGPT или Drive, если он:
- временный;
- подготовительный;
- редакторский;
- не задаёт source of truth;
- не нужен для repo-linked governance.

---

## 13. Definition of documentation hygiene

Документационная система ARTEMIS считается организованной корректно, если:
- у canonical layer нет конкурентов в том же слое;
- working docs физически отделены;
- audits не подменяют системные документы;
- archive не смешан с active layer;
- ChatGPT не хранит единственную версию load-bearing решений;
- Google Drive не выступает как скрытый source of truth;
- README ведёт в правильные документы;
- naming system единообразна;
- пользователь и ИИ-агенты понимают, какой документ обновлять в каждом типе задачи.

---

## 14. Итоговая модель

Целевая документационная система ARTEMIS должна выглядеть так:

- **GitHub** — официальный системный слой проекта;
- **ChatGPT** — слой оперативного мышления, координации и агентных инструкций;
- **Google Drive** — слой совместной ручной подготовки и редактирования материалов;
- **archive** — только историческая память;
- **audits** — только проверка;
- **canonical** — только один верхний слой истины.

Главная задача этой модели — исключить competing documentation layers и удержать единый управляемый source of truth при активной разработке.
