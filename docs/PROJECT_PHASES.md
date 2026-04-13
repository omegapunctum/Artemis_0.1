# ФАЗЫ ПРОЕКТА ARTEMIS v4.0

Статус: checkpoint-обновление после завершения map exploration stabilization cycle (2026-04-13).
Назначение документа: фиксировать только текущую фазовую модель проекта и ближайшие переходы между фазами.

Правило:
- этот документ является roadmap-уровнем;
- он не заменяет архитектурные, data-contract и release-документы;
- исторические snapshot-версии фаз хранятся отдельно в архиве и не считаются source of truth.

---

## ПРИНЦИП ФАЗОВОЙ МОДЕЛИ v4.0

В старой схеме фазы смешивали:
- уже выполненные базовые этапы;
- реальные технические gap'ы;
- продуктовые гипотезы;
- далёкие инициативы;
- маркетинг и монетизацию.

В версии v4.0 фазы используются только как инструмент управления разработкой.
Поэтому каждая фаза должна отвечать на три вопроса:
1. Что уже зафиксировано как baseline.
2. Что остаётся обязательным для перехода дальше.
3. Что нельзя считать частью текущей фазы.

---

## ФАЗА 0 — FOUNDATION [ЗАВЕРШЕНА]

Цель:
Собрать базовый технический контур проекта.

Зафиксировано:
- frontend baseline на `index.html` + `js/*` + `css/*`;
- карта на MapLibre;
- backend baseline на FastAPI;
- ETL baseline из Airtable в `data/*`;
- GitHub Pages / GitHub Actions как базовый deployment / automation контур;
- базовая структура репозитория закреплена.

Выход фазы:
- проект имеет рабочий каркас и воспроизводимую структуру.

Фаза считается закрытой окончательно.

---

## ФАЗА 1 — PUBLIC MAP BASELINE [ЗАВЕРШЕНА]

Цель:
Сделать публичную карту рабочим основным продуктовым ядром.

Зафиксировано:
- `data/features.geojson` закреплён как canonical public map source;
- базовые слои, фильтры, список объектов и detail-поведение существуют;
- production-default fallback карты на `/api/map/feed` запрещён;
- `/api/map/feed` зафиксирован как runtime support read-model (non-canonical);
- map-first логика проекта зафиксирована как ядро продукта.

Остаточные замечания:
- timeline и UX-polish не считаются причиной держать фазу открытой;
- эти задачи перенесены в отдельные активные фазы hardening / UX.

Выход фазы:
- публичная карта существует как отдельный устойчивый baseline.

---

## ФАЗА 2 — UGC / AUTH BASELINE [ЗАВЕРШЕНА С ЭКСПЛУАТАЦИОННЫМИ ОГРАНИЧЕНИЯМИ]

Цель:
Закрыть базовую пользовательскую авторизацию и контур черновиков / модерации.

Зафиксировано:
- auth baseline существует;
- drafts CRUD существует;
- upload API contract sync завершён (`POST /api/uploads`: required `file` + `license`, optional `title` + `description`, response `id/url/filename/license`);
- upload contract tests и anti-drift guard зафиксированы;
- moderation UI и lifecycle существуют;
- базовый XSS hardening есть;
- governance boundary против direct runtime publish уже зафиксирован кодом и тестами.

Ограничения фазы:
- auth/session слой всё ещё single-instance oriented;
- SQLite и process-local refresh registry не считаются production-grade масштабируемой моделью;
- эти ограничения не отменяют закрытие baseline-фазы, но запрещают считать контур готовым к multi-node production.

Выход фазы:
- пользовательский контур реализован по коду;
- дальнейшие работы относятся к scaling/hardening, а не к отсутствию самой фазы.

---

## ФАЗА 3 — CONTROLLED RELEASE STABILIZATION [ЗАВЕРШЕНА]

Цель:
Сделать release-систему внутренне согласованной и действительно исполнимой.

Фаза включает:
- синхронизацию `export_meta.json` и `scripts/release_check.py`;
- унификацию release terminology;
- синхронизацию checked-in data artifacts;
- фиксацию единого release contract;
- выравнивание README / release docs / checklist / workflows.

Обязательные условия закрытия:
- release gate проверяет тот же контракт, который реально лежит в `data/*`;
- `export_meta.json`, `features.json`, `features.geojson`, `rejected.json` не расходятся по смыслу;
- controlled release описан в одном термино-согласованном наборе документов;
- manual smoke, readiness и automated checks не противоречат друг другу.

Нельзя относить к этой фазе:
- новые продуктовые функции;
- новые роли пользователей;
- расширение курсов;
- визуальные эксперименты UI.

Выход фазы:
- проект получает предсказуемый release baseline.

---

## ФАЗА 4 — PWA / UX STABILIZATION [ЗАВЕРШЕНА]

Цель:
Довести пользовательский runtime до устойчивого и предсказуемого состояния.

Фаза включает:
- завершение PWA bypass/no-cache semantics;
- production smoke для service worker и installability;
- устранение ложных FAIL/ложных PASS в readiness по PWA;
- стабилизацию loading/error/offline сценариев;
- финальную доработку главного map-first UX;
- фиксацию базового onboarding и понятной точки входа в интерфейс.

Обязательные условия закрытия:
- private/auth requests не кэшируются фактически, а не только "по тексту проверки";
- runtime не показывает противоречивые loading-состояния;
- UI main flow стабилен на desktop/mobile baseline;
- UX-документы переведены в рабочий слой, а не размазаны по разным audit-файлам.

Нельзя относить к этой фазе:
- redesign всего продукта;
- ввод тяжёлого нового frontend stack;
- новый runtime source вместо canonical `/data/*`.

Выход фазы:
- пользовательский интерфейс становится эксплуатационно устойчивым.

---

## ФАЗА 5 — SCALING / HARDENING [АКТИВНАЯ ФАЗА №1]

Цель:
Убрать архитектурные ограничения MVP и подготовить проект к росту.

Планируемый scope:
- session store вне памяти процесса;
- переход от single-instance auth assumptions к масштабируемой модели;
- подготовка перехода на production-grade storage / DB;
- performance hardening для larger datasets;
- cleanup временных/mock runtime-слоёв;
- дополнительные regression-checks по canonical data path.
- синхронизация canonical docs и release-contract формулировок без competing source-of-truth.

Условие старта:
- Фаза 3 закрыта;
- release system не находится в состоянии contract drift.

Выход фазы:
- архитектура перестаёт зависеть от текущих MVP-допущений.

---

## ФАЗА 6 — PRODUCT EXPANSION [ЗАПЛАНИРОВАНА]

Цель:
Расширять продукт только после стабилизации baseline.

Планируемые направления:
- courses / guided scenarios;
- аналитика и compare flows;
- "Мои проекты";
- локализация;
- social / crowdsourcing extensions;
- расширение типов сущностей и сценариев использования.

Правило:
- эта фаза не должна открываться раньше закрытия release и runtime stabilization.

---

## ФАЗА 7 — BUSINESS / PLATFORM [ОТЛОЖЕНА]

Цель:
Монетизация, institutional tooling и platform-level expansion.

Вне текущего рабочего baseline:
- подписка;
- enterprise API;
- CRM/GIS integrations;
- marketplace / SDK / platform distribution;
- масштабная партнёрская и маркетинговая программа.

Правило:
- документы этого уровня не должны влиять на приоритеты активной технической разработки.

---

## АКТИВНЫЙ ПОРЯДОК РАБОТ

На текущем цикле проект работает так:
1. ФАЗА 5 — SCALING / HARDENING
2. CANONICAL DOCS / RELEASE CONTRACT SYNCHRONIZATION (операционный трек активного цикла)
3. RUNTIME UX/PWA STABILIZATION + contract/test hardening критических surface-слоёв

Это и есть фактическая последовательность следующего цикла.

---

## ЧТО БОЛЬШЕ НЕ НУЖНО ДЕЛАТЬ В ФАЙЛЕ ФАЗ

В этом документе больше не нужно:
- хранить длинный change-log по версиям;
- смешивать roadmap и archive;
- добавлять аудит-заметки как элементы фаз;
- включать сюда весь список дальних идей;
- дублировать priorities, release docs, UI/UX audits и structure docs.

---

## ПРАВИЛО ОБНОВЛЕНИЯ ДОКУМЕНТА

Файл обновляется только в трёх случаях:
1. закрыта или открыта фаза;
2. изменилась зависимость между фазами;
3. изменилась сама модель управления проектом.

Все остальные детали должны жить не здесь, а в:
- priorities;
- architecture/data/release docs;
- work docs;
- audits;
- archive.
