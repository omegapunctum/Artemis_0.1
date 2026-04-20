# ФАЗЫ ПРОЕКТА ARTEMIS v4.1

Статус: active canonical phases document.
Назначение документа: фиксировать только текущую фазовую модель проекта, активный порядок работ и ближайшие переходы между фазами, не смешивая это с архивом, длинной историей закрытых baseline-работ и дальними инициативами.

Правило:
- этот документ фиксирует operational phase model;
- он не заменяет архитектурные, data-contract, release и product-scope документы;
- исторические snapshot-версии фаз хранятся отдельно в archive/audit layer и не считаются source of truth.

---

## ПРИНЦИП ФАЗОВОЙ МОДЕЛИ

Фазы ARTEMIS используются только как инструмент управления исполнением.
Поэтому каждая фаза должна отвечать на три вопроса:
1. Что уже зафиксировано как baseline.
2. Что остаётся обязательным для перехода дальше.
3. Что нельзя считать частью текущей фазы.

Дополнительное правило:
- operational phases не заменяют концептуальную лестницу из `ARTEMIS_CONCEPT.md`;
- фазы описывают текущий цикл исполнения, а не всю долгосрочную эволюцию ARTEMIS;
- уровни `Structured Inference`, `Counterfactual / Probabilistic Layer` и `AI Research Infrastructure` допускаются только как перспектива следующих этапов и не должны неявно протаскиваться в текущий execution scope.

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
- map-first логика проекта зафиксирована как ядро продукта.

Остаточные замечания:
- timeline и UX-polish не считаются причиной держать фазу открытой;
- эти задачи перенесены в отдельные активные фазы hardening / UX.

Выход фазы:
- публичная карта существует как отдельный устойчивый baseline.

---

## ФАЗА 2 — UGC / AUTH BASELINE [ЗАВЕРШЕНА С ОГРАНИЧЕНИЯМИ]

Цель:
Закрыть базовую пользовательскую авторизацию и контур черновиков / модерации.

Зафиксировано:
- auth baseline существует;
- drafts CRUD существует;
- upload API существует;
- moderation UI и lifecycle существуют;
- базовый XSS hardening есть;
- governance boundary против direct runtime publish уже зафиксирован кодом и тестами.

Ограничения фазы:
- auth/session слой не должен описываться как полностью production-hardened multi-instance модель;
- baseline auth/session ушёл дальше исходного memory-only MVP, но scaling/hardening контур остаётся отдельной фазой;
- эти ограничения не отменяют закрытие baseline-фазы, но запрещают считать контур финально масштабированным.

Выход фазы:
- пользовательский контур реализован по коду;
- дальнейшие работы относятся к scaling/hardening, а не к отсутствию самой фазы.

---

## ФАЗА 3 — CONTROLLED RELEASE STABILIZATION [ЗАВЕРШЕНА / CLOSED]

Цель:
Сделать release-систему внутренне согласованной и действительно исполнимой.

Итоговый статус:
- baseline stabilized;
- release gate hardened;
- controlled-release baseline закрыт в текущем scope.

Фаза зафиксировала:
- единый release/data contract для checked-in artifacts и release gate;
- согласованную release terminology между canonical docs и workflow/readiness-слоем;
- устранение критичного runtime/API drift между frontend, backend, README и tests в baseline-контуре;
- закрытие controlled-release baseline без reopen при отсутствии нового contract drift.

Нельзя относить к этой фазе:
- новые продуктовые функции;
- новые роли пользователей;
- расширение курсов;
- визуальные эксперименты UI.

Выход фазы:
- проект получил предсказуемый release baseline.

Явные ограничения после закрытия:
- multi-instance не должен описываться как fully production-ready;
- scaling/persistence/ops contour остаётся отдельным следующим классом задач.

---

## ФАЗА 4 — PWA / UX STABILIZATION [АКТИВНАЯ ФАЗА №1]

Цель:
Довести пользовательский runtime до устойчивого и предсказуемого состояния.

Текущая граница фазы:
- активная задача этой фазы — эксплуатационная устойчивость интерфейса и PWA/runtime-поведения;
- продуктовые thin runtime layers уже существуют в baseline, но не должны раздувать scope этой фазы;
- share mode и AI-generation/explanation слой остаются в следующих фазах.

Фаза включает:
- завершение PWA bypass/no-cache semantics;
- production smoke для service worker и installability;
- устранение ложных FAIL/ложных PASS в readiness по PWA;
- стабилизацию loading/error/offline сценариев;
- финальную доработку главного map-first UX;
- фиксацию базового onboarding и понятной точки входа в интерфейс.

Обязательные условия закрытия:
- private/auth requests не кэшируются фактически, а не только по тексту проверки;
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

## ФАЗА 5 — SCALING / HARDENING [ЗАПЛАНИРОВАНА]

Цель:
Убрать архитектурные ограничения MVP и подготовить проект к росту.

Планируемый scope:
- session store вне памяти процесса;
- переход от single-instance auth assumptions к масштабируемой модели;
- подготовка перехода на production-grade storage / DB;
- performance hardening для larger datasets;
- cleanup временных/mock runtime-слоёв;
- дополнительные regression-checks по canonical data path.

Условие старта:
- Фаза 3 закрыта;
- release system не находится в состоянии contract drift.

Выход фазы:
- архитектура перестаёт зависеть от текущих MVP-допущений.

---

## ФАЗА 6 — PRODUCT EXPANSION [ЗАПЛАНИРОВАНА]

Цель:
Расширять продукт только после стабилизации baseline и в границах зафиксированного ARTEMIS v1.0 scope.

Планируемое ядро фазы:
- развитие research-slice слоя, включая shareable-state как следующий слой;
- stories как следующий слой глубины;
- courses как следующий слой глубины;
- explainable AI assistance как следующий слой поверх ECC;
- только затем вторичные product extensions.

Правило:
- эта фаза не должна открываться раньше закрытия release и runtime stabilization;
- product expansion обязан следовать `ARTEMIS_PRODUCT_SCOPE.md`, а не набору несвязанных feature-идей;
- social / crowdsourcing extensions допустимы только в управляемом и неядерном виде;
- causal claims, counterfactual simulation и predictive layers не входят в scope этой фазы и остаются перспективой более поздних уровней развития.

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
1. ФАЗА 4 — PWA / UX STABILIZATION
2. ФАЗА 5 — SCALING / HARDENING
3. ФАЗА 6 — PRODUCT EXPANSION
4. ФАЗА 3 — CONTROLLED RELEASE STABILIZATION (закрытая baseline-фаза; без reopen при отсутствии нового drift)

Статус-уточнение:
- следующий активный рабочий контур: ФАЗА 4;
- следующий технический контур: ФАЗА 5;
- ФАЗА 3 остаётся закрытой baseline-фазой и не требует reopen без нового contract drift.

Внутренний порядок работ внутри ФАЗЫ 6 заранее ограничен:
1. research slices / saved state
2. stories
3. courses
4. explainable AI assistance
5. только затем вторичные product extensions

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

Файл обновляется только в четырёх случаях:
1. закрыта или открыта фаза;
2. изменилась зависимость между фазами;
3. изменилась сама модель управления проектом;
4. изменилось соотношение между operational phases и зафиксированной концептуальной лестницей проекта.

Все остальные детали должны жить не здесь, а в:
- `PRIORITIES.md`;
- architecture/data/release docs;
- work docs;
- audits;
- archive.
