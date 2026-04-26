# ARTEMIS — FOUNDATION INDEX

## Статус документа

- Тип: canonical foundation index document
- Статус: active
- Роль: главный навигатор фундаментального слоя ARTEMIS
- Назначение: фиксирует, какие документы образуют foundation-layer, в каком порядке их читать и какой документ отвечает за какой тип решений
- Scope: concept, product scope, research slice, epistemic model, entity model, content governance, AI policy, data/release/runtime/documentation boundaries

---

## 1. Назначение foundation-layer

Foundation-layer ARTEMIS нужен, чтобы проект развивался как единая система, а не как набор отдельных модулей: карта, курсы, stories, AI, UGC, data pipeline и UI.

Фундаментальный слой отвечает на вопросы:

1. Что такое ARTEMIS.
2. Что является главной единицей ценности.
3. Что считается знанием внутри ARTEMIS.
4. Какие сущности существуют в системе.
5. Как проверяется и утверждается контент.
6. Что может и не может делать AI.
7. Какие документы являются source of truth для архитектуры, данных, release и документационной системы.

---

## 2. Главный принцип

ARTEMIS нельзя развивать через отдельные функции без проверки их связи с фундаментом.

Любое новое направление должно усиливать одну из базовых опор:

- spatial-temporal research workspace;
- research slice as primary value unit;
- explainable knowledge structure;
- curated and governed content;
- clear epistemic separation of facts, interpretations, hypotheses and AI outputs;
- controlled release/data/runtime discipline.

Если функция не усиливает эти опоры, она не входит в ядро ARTEMIS.

---

## 3. Текущий canonical foundation set

На текущем этапе foundation-layer состоит из действующих canonical docs.

| Документ | Роль |
|---|---|
| `README.md` | root entrypoint проекта |
| `docs/FOUNDATION_INDEX.md` | навигатор foundation-layer, порядок чтения и source-of-truth routing |
| `docs/ARTEMIS_CONCEPT.md` | миссия, видение, принципы, epistemic model, стратегическая лестница развития |
| `docs/ARTEMIS_PRODUCT_SCOPE.md` | продуктовые границы v1.0, главная единица ценности, product loop, запреты против product drift |
| `docs/RESEARCH_SLICE_CONTRACT.md` | canonical product/data/UI/AI contract для Research Slice как главной единицы ценности |
| `docs/RESEARCH_SLICE_SPEC.md` | runtime/API spec Research Slice baseline |
| `docs/EPISTEMIC_CONTRACT.md` | operational contract для fact/source/relation/interpretation/hypothesis/AI-output/uncertainty/counterfactual |
| `docs/ENTITY_MODEL.md` | единая модель knowledge/product/runtime/context entities и relation model |
| `docs/CONTENT_GOVERNANCE.md` | правила источников, валидации, модерации, UGC promotion, trust, correction и publish governance |
| `docs/AI_POLICY.md` | canonical границы AI behavior, AI-output, source discipline и запреты против AI drift |
| `docs/ARTEMIS_MASTER_PROMPT.md` | operational governance для AI-агентов и docs-first discipline |
| `docs/PROJECT_STRUCTURE.md` | структура репозитория, runtime boundaries, canonical entrypoints, documentation layers |
| `docs/PROJECT_PHASES.md` | фазы, переходы и текущий active cycle |
| `docs/PRIORITIES.md` | текущие load-bearing приоритеты |
| `docs/DATA_CONTRACT.md` | ETL/data/public map/release artifact contract |
| `docs/CONTROLLED_RELEASE_DECISION.md` | controlled release baseline, release/readiness interpretation, production-grade limitations |
| `docs/DOCUMENTATION_SYSTEM.md` | documentation governance, роли слоёв, правила конфликтов |

Правило:
- эти документы считаются active canonical foundation/source-of-truth set;
- archive/reference/working/audit docs не могут переопределять этот набор;
- если новый документ начинает задавать устойчивое правило foundation-layer, он должен быть явно зарегистрирован в `PROJECT_STRUCTURE.md` и `DOCUMENTATION_SYSTEM.md`.

---

## 4. Порядок чтения foundation docs

Рекомендуемый порядок чтения:

1. `README.md` — быстрый вход в проект.
2. `docs/FOUNDATION_INDEX.md` — карта фундаментального слоя.
3. `docs/ARTEMIS_CONCEPT.md` — зачем существует ARTEMIS и какие принципы нельзя нарушать.
4. `docs/ARTEMIS_PRODUCT_SCOPE.md` — что входит и не входит в ARTEMIS v1.0.
5. `docs/RESEARCH_SLICE_CONTRACT.md` — что является главной единицей ценности и как она работает.
6. `docs/EPISTEMIC_CONTRACT.md` — что считается знанием и как маркируется достоверность.
7. `docs/ENTITY_MODEL.md` — какие сущности и связи существуют в системе.
8. `docs/CONTENT_GOVERNANCE.md` — как данные становятся trusted content.
9. `docs/AI_POLICY.md` — что AI может и не может делать.
10. `docs/DATA_CONTRACT.md` — как данные проходят через ETL/export/public artifacts.
11. `docs/PROJECT_STRUCTURE.md` — где это живёт в repo/runtime/docs system.
12. `docs/PROJECT_PHASES.md` и `docs/PRIORITIES.md` — что делать сейчас.
13. `docs/CONTROLLED_RELEASE_DECISION.md` — как трактовать release baseline.
14. `docs/DOCUMENTATION_SYSTEM.md` — как разрешать doc-conflicts и где хранить документы.
15. `docs/ARTEMIS_MASTER_PROMPT.md` — как AI-агенты должны работать с проектом.

---

## 5. Решения по типам вопросов

### 5.1 Concept / mission questions

Primary authority:
- `docs/ARTEMIS_CONCEPT.md`

Secondary authority:
- `docs/ARTEMIS_PRODUCT_SCOPE.md`
- `docs/FOUNDATION_INDEX.md`

Примеры вопросов:
- чем является ARTEMIS;
- почему ARTEMIS не просто карта;
- почему AI не является source of truth;
- почему факт, интерпретация и гипотеза должны быть разделены.

### 5.2 Product scope questions

Primary authority:
- `docs/ARTEMIS_PRODUCT_SCOPE.md`

Secondary authority:
- `docs/PROJECT_PHASES.md`
- `docs/PRIORITIES.md`
- `docs/RESEARCH_SLICE_CONTRACT.md`

Примеры вопросов:
- входит ли feature в v1.0;
- что является primary user value;
- что делать сначала: slice, story, course или AI;
- какие направления являются forbidden product drift.

### 5.3 Research slice questions

Primary authority:
- `docs/RESEARCH_SLICE_CONTRACT.md`

Runtime/API authority:
- `docs/RESEARCH_SLICE_SPEC.md`

Supporting authority:
- `docs/ARTEMIS_PRODUCT_SCOPE.md`
- `docs/EPISTEMIC_CONTRACT.md`
- `docs/ENTITY_MODEL.md`

Примеры вопросов:
- чем slice отличается от saved view;
- как slice связан со story/course/AI;
- что входит в minimal slice;
- как работает lifecycle slice;
- как slice связан с AI context и epistemic status.

### 5.4 Knowledge / epistemic questions

Primary authority:
- `docs/EPISTEMIC_CONTRACT.md`

Supporting authority:
- `docs/ARTEMIS_CONCEPT.md`
- `docs/CONTENT_GOVERNANCE.md`
- `docs/AI_POLICY.md`

Примеры вопросов:
- что является фактом;
- что является интерпретацией;
- как маркировать гипотезу;
- как показывать AI-output;
- как работать с uncertainty;
- почему counterfactual не является history.

### 5.5 Entity / relation questions

Primary authority:
- `docs/ENTITY_MODEL.md`

Supporting authority:
- `docs/EPISTEMIC_CONTRACT.md`
- `docs/DATA_CONTRACT.md`
- `docs/RESEARCH_SLICE_CONTRACT.md`

Примеры вопросов:
- что такое entity;
- чем object отличается от event/process/place;
- как relation связывает сущности;
- как source/media относятся к entity;
- как entity входит в slice/story/course/AI context.

### 5.6 Content trust / governance questions

Primary authority:
- `docs/CONTENT_GOVERNANCE.md`

Supporting authority:
- `docs/EPISTEMIC_CONTRACT.md`
- `docs/ENTITY_MODEL.md`
- `docs/DATA_CONTRACT.md`
- relevant moderation/runtime docs

Примеры вопросов:
- как объект становится canonical content;
- как решать конфликт источников;
- что делать со спорными координатами;
- как UGC становится trusted;
- когда запись отклоняется;
- почему AI-generated content не становится source-backed fact без review.

### 5.7 AI behavior questions

Primary authority:
- `docs/AI_POLICY.md`

Supporting authority:
- `docs/EPISTEMIC_CONTRACT.md`
- `docs/RESEARCH_SLICE_CONTRACT.md`
- `docs/CONTENT_GOVERNANCE.md`
- `docs/work/ARTEMIS_AI_STRATEGY_v1_0.md` where it does not conflict with canonical docs

Примеры вопросов:
- может ли AI генерировать historical claim;
- как маркировать AI hypothesis;
- может ли AI менять canonical data;
- как AI должен использовать slice context;
- почему AI не является source.

### 5.8 Data / release / runtime questions

Primary authority:
- `docs/DATA_CONTRACT.md`
- `docs/CONTROLLED_RELEASE_DECISION.md`
- `docs/PROJECT_STRUCTURE.md`

Executable authority:
- `scripts/release_check.py`
- tests
- GitHub workflows

Примеры вопросов:
- что является public map source;
- какие artifacts обязательны;
- какие release checks блокируют deploy;
- что считается controlled baseline, а что production-grade claim.

---

## 6. Правило разрешения конфликтов

Если документы расходятся, действует порядок:

1. executable checks / tests / workflows for runtime facts;
2. `DATA_CONTRACT.md` for data/export/public map contract;
3. `CONTROLLED_RELEASE_DECISION.md` for release/readiness interpretation;
4. `ARTEMIS_CONCEPT.md` for mission/principles/epistemic constraints;
5. `ARTEMIS_PRODUCT_SCOPE.md` for v1.0 scope/product boundaries;
6. foundation contracts:
   - `RESEARCH_SLICE_CONTRACT.md`;
   - `EPISTEMIC_CONTRACT.md`;
   - `ENTITY_MODEL.md`;
   - `CONTENT_GOVERNANCE.md`;
   - `AI_POLICY.md`;
7. `PROJECT_STRUCTURE.md` for repo/runtime/docs boundaries;
8. `PROJECT_PHASES.md` and `PRIORITIES.md` for current work order;
9. `DOCUMENTATION_SYSTEM.md` for doc placement/governance conflicts;
10. working docs;
11. audits;
12. archive/reference.

Audit documents may reveal a conflict, but they do not become source of truth by themselves. The relevant canonical or working document must be updated.

---

## 7. Foundation change-control rule

A foundation document may be created or changed only if the change clearly states:

- what problem it solves;
- which existing canonical documents it affects;
- whether it changes product scope, data contract, AI behavior, content governance or runtime boundaries;
- which docs must be updated after the change;
- which tests/checks should be run if executable behavior is affected.

Foundation changes must not be mixed with unrelated UI/runtime refactors.

---

## 8. Forbidden shortcuts

Запрещено:

- добавлять AI-функции без проверки against `AI_POLICY.md` and `EPISTEMIC_CONTRACT.md`;
- развивать stories/courses вне `RESEARCH_SLICE_CONTRACT.md`;
- расширять entity/relation/source/media model вне `ENTITY_MODEL.md`;
- превращать object card в главную продуктовую единицу вместо slice;
- использовать UGC as canonical content без `CONTENT_GOVERNANCE.md`;
- смешивать fact, interpretation, hypothesis, AI-output и counterfactual;
- создавать новый source of truth в working docs или audits;
- использовать archive/reference documents как current guidance;
- расширять ARTEMIS в generic GIS/LMS/social/wiki platform без foundation decision.

---

## 9. Текущий статус foundation work

Status:
- foundation-layer создан;
- ключевые foundation docs зарегистрированы в `PROJECT_STRUCTURE.md` и `DOCUMENTATION_SYSTEM.md`;
- `ARTEMIS_MASTER_PROMPT.md` обновлён под foundation invariants;
- archive index создан и Batch A cleanup выполнен;
- release/docs drift частично защищён через `scripts/release_check.py`.

Closed foundation setup items:

1. `docs/RESEARCH_SLICE_CONTRACT.md` создан.
2. `docs/EPISTEMIC_CONTRACT.md` создан.
3. `docs/ENTITY_MODEL.md` создан.
4. `docs/CONTENT_GOVERNANCE.md` создан.
5. `docs/AI_POLICY.md` создан.
6. `docs/PROJECT_STRUCTURE.md` обновлён.
7. `docs/DOCUMENTATION_SYSTEM.md` обновлён.
8. `docs/ARTEMIS_MASTER_PROMPT.md` обновлён.
9. `docs/archive/README.md` обновлён.

Remaining non-blocking follow-up:
- semantic review оставшихся `DO_NOT_DELETE_YET` archive files;
- Phase 5 scaling/hardening tasks, включая production/HA ограничения memory session backend.

---

## 10. Итоговое правило

ARTEMIS должен развиваться от фундаментальной модели знания к продуктовым слоям, а не наоборот.

Порядок развития:

1. concept and product scope;
2. research slice contract;
3. epistemic contract;
4. entity model;
5. content governance;
6. AI policy;
7. stories/courses/AI/runtime expansion.

Если новый функциональный слой не может быть объяснён через foundation-layer, он не должен становиться частью ядра проекта.
