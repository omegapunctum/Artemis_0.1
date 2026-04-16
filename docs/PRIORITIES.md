# ТЕКУЩИЕ ПРИОРИТЕТЫ ARTEMIS v4.1

Статус: обновлённая версия после синхронизации с Foundational Pack и продуктовым контуром ARTEMIS v1.0 (2026-04-14).
Назначение документа: фиксировать только актуальные load-bearing приоритеты проекта без потери действующих технических задач и без расползания в дальние продуктовые идеи.

Правило:
- здесь нет архивных задач;
- здесь нет полного roadmap;
- здесь нет дальних продуктовых идей;
- если задача не влияет на устойчивость текущего цикла, она не должна попадать в этот файл.

---

## ПРИНЦИП ПРИОРИТИЗАЦИИ v4.0

Приоритетом считается только то, что:
- влияет на корректность public data / release / runtime;
- удерживает архитектурные boundaries;
- устраняет системный drift;
- снижает риск тихой деградации;
- защищает зафиксированный ARTEMIS v1.0 scope от product drift.

Если задача не влияет хотя бы на один из этих пунктов, она не должна быть в top-priority списке.

---

## КРИТИЧЕСКИЕ ПРИОРИТЕТЫ

### 1. Закрыть data-contract drift между `data/export_meta.json` и `scripts/release_check.py`
Статус: **COMPLETED / CLOSED (2026-04-15)**.
Что нужно:
- привести checked-in export metadata к формату, который реально ожидает release gate;
- зафиксировать один актуальный формат warning categories;
- убрать ситуацию, при которой snapshot и gate живут по разным контрактам.

Почему это важно:
- это текущий главный внутренний конфликт release-системы.
- Итог: data/export/release-check contract синхронизирован и закреплён в текущем baseline.

### 2. Собрать единый release contract
Статус: **COMPLETED / CLOSED (2026-04-15)**.
Что нужно:
- синхронизировать `export_meta.json`, `features.json`, `features.geojson`, `rejected.json`, release-check, workflow и readiness docs;
- зафиксировать, что release unit — пакетная публикация набора данных.

Почему это важно:
- проект уже имеет controlled release baseline, но он ещё не доведён до единой исполнимой системы.
- Итог: release gate и checked-in artifacts работают как единый исполнимый release unit.
- Дополнение: release gate runtime guards (implemented) зафиксированы как часть baseline release reliability.

### 3. Перевести документацию на новую иерархию и закрепить Foundational Pack
Статус: **MOSTLY COMPLETED / CLOSED FOR PHASE 3 BASELINE (2026-04-16)**.
Что нужно:
- отделить canonical docs от working docs, audits и archive;
- убрать ситуацию, когда reference и старые snapshots воспринимаются как актуальные;
- встроить `ARTEMIS_CONCEPT.md` и `ARTEMIS_PRODUCT_SCOPE.md` в canonical layer;
- встроить `docs/work/ARTEMIS_AI_STRATEGY.md` в working layer;
- зафиксировать docs sync как обязательную часть release discipline.

Почему это важно:
- сейчас документация информативна, но неустойчива как система управления;
- без зафиксированного Foundational Pack проект остаётся технически описанным, но концептуально размытым.
- Уточнение статуса: source-of-truth/readiness drift для controlled-release baseline закрыт; остаточные улучшения относятся к регулярной docs hygiene, а не к baseline blockers.

### 4. Досинхронизировать README с реальным runtime/API surface
Статус: **COMPLETED / CLOSED (2026-04-15)**.
Что нужно:
- привести root-level описание проекта к фактическому backend/runtime surface;
- убрать укороченный и частично устаревший API summary;
- отдельно исправить описание upload contract: текущий backend принимает `POST /api/uploads` с обязательным `license`, а публичная раздача файлов идёт через `/uploads/*`, поэтому старые или упрощённые описания upload API недопустимы.

Почему это важно:
- README должен быть первой точкой входа в проект, а не источником drift;
- сейчас именно в этой зоне наиболее вероятны ложные интеграционные ожидания.
- Итог: upload API summary и формулировки по `/api/map/feed` синхронизированы с фактическим backend/runtime surface.

### 5. Устранить PWA semantic drift
Статус: **COMPLETED / CLOSED (2026-04-16)**.
Что нужно:
- проверять фактический bypass/no-cache private/auth requests;
- перестать опираться на грубую логику "строка встречается / не встречается" в `sw.js`.

Почему это важно:
- иначе release/readiness слой может давать ложные выводы о корректности private caching behavior.
- Итог: behavioral PWA proof подключён в release-gating path (через release_check), static/pattern guards сохранены как дополнительный уровень контроля.

---

## ВЫСОКИЙ ПРИОРИТЕТ

### 6. Досинхронизировать canonical documentation framework в репозитории
Статус: **MOSTLY COMPLETED / BASELINE-ALIGNED (2026-04-16); PHASE-5 EVIDENCE SYNC REQUIRED**.
Что нужно:
- привести `README.md`, `docs/ARTEMIS_MASTER_PROMPT.md`, `docs/PROJECT_STRUCTURE.md`, `docs/PROJECT_PHASES.md`, `docs/PRIORITIES.md`, `docs/DATA_CONTRACT.md` и `docs/CONTROLLED_RELEASE_DECISION.md` к одному и тому же набору правил;
- убрать из canonical-описаний старые целевые имена документов (`ARCHITECTURE.md`, `RELEASE_SYSTEM.md`, `ROADMAP.md`), если они не являются действующими source-of-truth файлами;
- перевести старые документы в archive/reference-слой только как historical reference.
- дополнительная синхронизация текущего цикла: явно развести `proven strongly`, `proven baseline` и `still remaining` для scaling/hardening контуров, чтобы не допускать policy/evidence drift после новых integration proofs.

### 7. Удержать canonical public map source без повторного drift
Что нужно:
- продолжать удерживать `/data/features.geojson` как единственный public map source;
- не допускать implicit fallback или competing runtime architecture через `/api/map/feed`.

### 8. Изолировать или удалить mock runtime entities из `/api/map/feed`
Что нужно:
- перестать держать временные `place`-сущности в production-like контурах;
- явно отделить internal/tooling runtime read-model от публичного data layer.

### 9. Закрыть single-instance auth/scaling risk как документированный технический долг
Статус: **BASELINE CLOSED / SCALING OPEN (2026-04-15); HARDENING EVIDENCE PARTIALLY CLOSED (2026-04-16)**.
Что нужно:
- зафиксировать архитектурное ограничение явно;
- подготовить отдельный scaling-cycle: session store, refresh registry, storage model.
- Уточнение статуса (2026-04-16): это не unresolved baseline blocker; риск официально перенесён в контур ФАЗЫ 5 / Scaling-Hardening.
- Уточнение после текущего hardening-цикла (2026-04-16): Redis continuity (single-instance / multi-instance / restart) и consume-once invalidation уже подтверждены интеграционно; незакрытая часть риска смещается в production-grade persistence/ops envelope, а не в отсутствие базового Redis proof.

### 10. Подтвердить release/readiness/manual smoke одной терминологией
Статус: **COMPLETED / CLOSED (2026-04-15)**.
Что нужно:
- унифицировать язык release docs;
- исключить документы, которые создают ложное ощущение полного production green при существующих ограничениях;
- добавить coverage для upload/runtime contract, чтобы критичный drift не проходил между frontend и backend без тестового сигнала.

Короткие baseline-additions:
- Redis-backed session store (baseline ready): путь внедрён и доступен как baseline-capable режим.
- Release gate runtime guards (implemented): env/runtime invariants добавлены в release discipline.
- Test suite stabilization (completed): критичные release/static checks стабилизированы для текущего цикла.
- Hardening evidence additions (2026-04-16): Redis real infra proofs (single-instance/multi-instance/restart), moderation integration proof и moderation runbook считаются зафиксированными на текущем baseline/hardening уровне.

---

## СРЕДНИЙ ПРИОРИТЕТ

### 11. Завершить UX/PWA stabilization pass
Что нужно:
- offline edge cases;
- installability smoke;
- стабильные loading/error/offline состояния;
- финальный main-screen UX baseline.

### 12. Провести cleanup `docs/reference/` и старых snapshot-документов
Что нужно:
- сохранить архивную ценность старых версий;
- перестать использовать их как активные ориентиры.

### 13. Подготовить scaling/hardening backlog отдельно от product expansion backlog
Что нужно:
- перестать смешивать архитектурный долг и продуктовые идеи в одном operational списке;
- использовать `ARTEMIS_PRODUCT_SCOPE.md` как фильтр для product expansion задач.

### 14. Зафиксировать порядок продуктового ядра внутри будущей Product Expansion phase
Что нужно:
- закрепить `research slice` как главную единицу ценности ARTEMIS v1.0;
- держать первым продуктовым порядком `saved slices / shareable state`;
- затем `stories`;
- затем `courses`;
- затем `explainable AI assistance`;
- не допускать, чтобы вторичные функции вытесняли это ядро ещё до завершения stabilization cycle.

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

Если задача просто "интересная" или "полезная в будущем", её здесь быть не должно.
