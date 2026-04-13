# ТЕКУЩИЕ ПРИОРИТЕТЫ ARTEMIS v4.0

Статус: checkpoint-обновление после завершения map exploration stabilization cycle (2026-04-13).
Назначение документа: фиксировать только актуальные load-bearing приоритеты проекта.

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
- снижает риск тихой деградации.

Если задача не влияет на эти четыре пункта, она не должна быть в top-priority списке.

---

## CHECKPOINT 2026-04-13 (фикс статуса)

Закрытые циклы, снятые из активного top-priority:
- contract sync / release-discipline fix;
- data layer stabilization;
- UI/UX stabilization;
- courses stabilization;
- map exploration stabilization.

Следующий load-bearing фокус:
- scaling/hardening трек (auth/session масштабирование, storage/runtime устойчивость);
- release-quality мониторинг без возврата к уже закрытым exploration/UI mini-cycles.

---

## КРИТИЧЕСКИЕ ПРИОРИТЕТЫ

### 1. Закрыть data-contract drift между `data/export_meta.json` и `scripts/release_check.py`
Что нужно:
- привести checked-in export metadata к формату, который реально ожидает release gate;
- зафиксировать один актуальный формат warning categories;
- убрать ситуацию, при которой snapshot и gate живут по разным контрактам.

Почему это важно:
- это текущий главный внутренний конфликт release-системы.

### 2. Собрать единый release contract
Что нужно:
- синхронизировать `export_meta.json`, `features.json`, `features.geojson`, `rejected.json`, release-check, workflow и readiness docs;
- зафиксировать, что release unit — пакетная публикация набора данных.

Почему это важно:
- проект уже имеет controlled release baseline, но он ещё не доведён до единой исполнимой системы.

### 3. Перевести документацию на новую иерархию
Что нужно:
- отделить canonical docs от working docs, audits и archive;
- убрать ситуацию, когда reference и старые snapshots воспринимаются как актуальные;
- зафиксировать docs sync как обязательную часть release discipline.

Почему это важно:
- сейчас документация информативна, но неустойчива как система управления.

### 4. Досинхронизировать README с реальным runtime/API surface
Что нужно:
- привести root-level описание проекта к фактическому backend/runtime surface;
- убрать укороченный и частично устаревший API summary.

Почему это важно:
- README должен быть первой точкой входа в проект, а не источником drift.

### 5. Устранить PWA semantic drift
Что нужно:
- проверять фактический bypass/no-cache private/auth requests;
- перестать опираться на грубую логику "строка встречается / не встречается" в `sw.js`.

Почему это важно:
- иначе release/readiness слой может давать ложные выводы о корректности private caching behavior.

---

## ВЫСОКИЙ ПРИОРИТЕТ

### 6. Зафиксировать canonical documentation framework в репозитории
Что нужно:
- создать устойчивую структуру `docs/`;
- выделить minimal canonical set;
- перевести старые документы в archive/reference-слой.

### 7. Удержать canonical public map source без повторного drift
Что нужно:
- продолжать удерживать `/data/features.geojson` как единственный public map source;
- не допускать implicit fallback или competing runtime architecture через `/api/map/feed`.

### 8. Изолировать или удалить mock runtime entities из `/api/map/feed`
Что нужно:
- перестать держать временные `place`-сущности в production-like контурах;
- явно отделить internal/tooling runtime read-model от публичного data layer.

### 9. Закрыть single-instance auth/scaling risk как документированный технический долг
Что нужно:
- зафиксировать архитектурное ограничение явно;
- подготовить отдельный scaling-cycle: session store, refresh registry, storage model.

### 10. Подтвердить release/readiness/manual smoke одной терминологией
Что нужно:
- унифицировать язык release docs;
- исключить документы, которые создают ложное ощущение полного production green при существующих ограничениях.

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
- перестать смешивать архитектурный долг и продуктовые идеи в одном operational списке.

---

## ВНЕ ТЕКУЩЕГО ПРИОРИТЕТНОГО ЦИКЛА

На текущем этапе не должны считаться top priority:
- monetization;
- enterprise/institutional integrations;
- gamification;
- native mobile apps;
- AR/VR;
- predictive AI layers;
- маркетинговые кампании;
- тяжёлое расширение social-функций.

Эти темы допустимы только после закрытия текущих load-bearing конфликтов.

---

## ПРАВИЛО ОБНОВЛЕНИЯ ДОКУМЕНТА

Файл обновляется только если:
1. появляется новый load-bearing риск;
2. существующий риск закрыт и может быть снят;
3. меняется активная последовательность фаз проекта.

Если задача просто "интересная" или "полезная в будущем", её здесь быть не должно.
