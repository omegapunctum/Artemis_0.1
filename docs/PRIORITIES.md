# ТЕКУЩИЕ ПРИОРИТЕТЫ ARTEMIS v4.1

Статус: active canonical priorities document.
Назначение документа: фиксировать только актуальные load-bearing приоритеты проекта, не смешивая их с архивом, длинной историей закрытых baseline-работ и дальними продуктовыми идеями.

Правило:
- здесь нет полного roadmap;
- здесь нет archive-layer истории;
- здесь нет дальних продуктовых идей;
- если задача не влияет на устойчивость текущего цикла, она не должна попадать в этот файл.

---

## ПРИНЦИП ПРИОРИТИЗАЦИИ

Приоритетом считается только то, что:
- влияет на корректность public data / release / runtime;
- удерживает архитектурные boundaries;
- устраняет системный drift;
- снижает риск тихой деградации;
- защищает зафиксированный ARTEMIS v1.0 scope от product drift.

Если задача не влияет хотя бы на один из этих пунктов, она не должна быть в top-priority списке.

---

## ЗАКРЫТЫЙ BASELINE-БЛОК

Статус блока: **COMPLETED / CLOSED** в рамках controlled-release baseline.  
Этот блок сохраняется только как короткий reference уже закрытых load-bearing работ и **не является текущим главным активным приоритетом цикла**.

Закрытые baseline-задачи:
1. data-contract drift между `data/export_meta.json` и `scripts/release_check.py` устранён;
2. единый release contract собран и синхронизирован с checked-in artifacts;
3. root-level README приведён к актуальному runtime/API baseline на момент controlled-release stabilization;
4. PWA semantic drift для release/readiness слоя устранён;
5. canonical docs переведены на новую иерархию и включают foundational product layer.

Уточнение:
- этот блок не должен использоваться как список текущих задач;
- остаточные улучшения после baseline closure относятся к active priorities ниже.

---

## АКТИВНЫЙ ПОРЯДОК ПРИОРИТЕТОВ

Текущий практический порядок активных приоритетов:
1. **Scaling / hardening** — основной активный приоритет цикла;
2. **Product/documentation coherence** — активный сопутствующий контур без расширения implementation scope;
3. **Canonical data/source discipline** — удерживать `/data/*` как публичный source-of-truth без runtime drift.

---

## ВЫСОКИЙ ПРИОРИТЕТ

### 1. UX/PWA stabilization pass (Phase 4) — закрыто
Статус: **COMPLETED / CLOSED BASELINE (PHASE 4)**.
Зафиксировано:
- offline/installability/loading-error-offline baseline закрыт;
- остаточные UX/PWA темы не считаются blocker'ами закрытия и относятся к hardening/polish next track.

### 2. Закрыть остаточный canonical docs cleanup tail
Статус: **ACTIVE**.
Что нужно:
- удержать единый canonical set между `README.md`, `docs/ARTEMIS_MASTER_PROMPT.md`, `docs/PROJECT_STRUCTURE.md`, `docs/PROJECT_PHASES.md`, `docs/PRIORITIES.md`, `docs/DATA_CONTRACT.md`, `docs/CONTROLLED_RELEASE_DECISION.md` и `docs/DOCUMENTATION_SYSTEM.md`;
- завершить cleanup active `docs/` root против canonical allowlist;
- перевести non-canonical working/spec/snapshot документы в `docs/work/`, `docs/archive/` или `docs/reference/` по их реальной роли;
- после cleanup проверить cross-links и не допускать повторного competing documentation layer.

### 3. Удержать canonical public map source без повторного drift
Статус: **ACTIVE**.
Что нужно:
- продолжать удерживать `/data/features.geojson` как единственный public map source;
- не допускать implicit fallback или competing runtime architecture через `/api/map/feed`.

### 4. Изолировать или удалить mock runtime entities из `/api/map/feed`
Статус: **ACTIVE**.
Что нужно:
- перестать держать временные `place`-сущности в production-like контурах;
- явно отделить internal/tooling runtime read-model от публичного data layer.

### 5. Scaling/hardening cycle без ложных production-ready claims
Статус: **PRIMARY ACTIVE PRIORITY (PHASE 5)**.
Что нужно:
- удерживать уже зафиксированное различие между proven controlled baseline и production-hardened envelope;
- подготовить отдельный scaling-cycle: session store, refresh registry, storage model, persistence/ops contour;
- зафиксировать, что sticky fail-state из historical 5xx для `health.ok` уже устранён через process-local decay semantics; следующий hardening topic — улучшение observability/readiness интерпретации (thresholds/window tuning, signal policy, ops-гайд) без ложных claims о fully production-grade readiness platform;
- удерживать operator policy-интерпретацию текущего health-сигнала: `ok` трактуется как recent-error indicator в process-local окне, `total_errors` — как исторический counter процесса, а не как самостоятельный глобальный readiness verdict;
- зафиксировать SQLite operational guardrails как baseline-only storage mode и использовать явные trigger-conditions (lock contention, sustained write-latency, multi-instance write pressure) для перехода в следующий storage-hardening stage без преждевременных implementation claims;
- не выдавать имеющийся Redis/session proof за полностью production-ready multi-node модель.

### 6. Завершить финальную терминологическую полировку release/readiness docs
Статус: **ACTIVE DOCS-COHERENCE TAIL**.
Что нужно:
- удержать единый язык release/readiness/manual smoke после уже выполненной baseline-синхронизации;
- исключить остаточные документы или формулировки, создающие ложное ощущение полного production green при существующих ограничениях;
- удержать coverage для upload/runtime contract, чтобы критичный drift не проходил между frontend и backend без тестового сигнала.

---

## СРЕДНИЙ ПРИОРИТЕТ

### 7. Очистить `docs/PROJECT_PHASES.md` от historical/status overload
Статус: **NEXT DOCS CLEANUP TARGET**.
Что нужно:
- оставить только текущую фазовую модель и ближайшие переходы;
- сократить длинные dated status updates;
- убрать из phase document лишний closure/history noise.

### 8. Довести hygiene cleanup `docs/reference/` и snapshot-слоя до конца
Статус: **ACTIVE HYGIENE TAIL**.
Что нужно:
- сохранить архивную и reference-ценность старых версий;
- перестать использовать их как активные ориентиры;
- завершить разложение remaining non-canonical документов по правильным слоям.

### 9. Подготовить scaling/hardening backlog отдельно от product expansion backlog
Статус: **PHASE 5 PREP**.
Что нужно:
- перестать смешивать архитектурный долг и продуктовые идеи в одном operational списке;
- использовать `ARTEMIS_PRODUCT_SCOPE.md` как фильтр для product expansion задач;
- удерживать актуальный путь working-документов, включая `docs/work/ARTEMIS_AI_STRATEGY_v1_0.md`.

### 10. Зафиксировать порядок продуктового ядра внутри будущей Product Expansion phase
Статус: **POST PHASE 4/5 GATE**.
Что нужно:
- закрепить `research slice` как главную единицу ценности ARTEMIS v1.0;
- учесть, что baseline MVP `saved slices` уже реализован (save/list/open/delete, private/owner-only);
- держать следующим продуктовым порядком `shareable state`;
- затем `stories`;
- затем `courses`;
- затем `explainable AI assistance`;
- не допускать, чтобы вторичные функции вытесняли это ядро до завершения stabilization cycle.

---

## ВНЕ ТЕКУЩЕГО ПРИОРИТЕТНОГО ЦИКЛА

На текущем этапе не должны считаться top priority:
- monetization;
- enterprise/institutional integrations;
- gamification;
- native mobile apps;
- AR/VR;
- predictive AI layers;
- structured inference как обещанный продуктовый слой;
- counterfactual simulation;
- маркетинговые кампании;
- тяжёлое расширение social-функций.

Эти темы допустимы только после закрытия текущих load-bearing конфликтов.

---

## ПРАВИЛО ОБНОВЛЕНИЯ ДОКУМЕНТА

Файл обновляется только если:
1. появляется новый load-bearing риск;
2. существующий риск закрыт и может быть снят;
3. меняется активная последовательность фаз проекта;
4. меняется зафиксированное продуктовое ядро v1.0 и это влияет на operational order ближайшего цикла.

Если задача просто интересная или полезная в будущем, её здесь быть не должно.
