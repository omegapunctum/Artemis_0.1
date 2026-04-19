# ARTEMIS — DOCUMENTATION SYSTEM

Тип: canonical documentation governance document  
Роль: единый source of truth для правил организации документации ARTEMIS  
Статус: active  
Назначение: зафиксировать структуру documentation system, роли слоёв, порядок чтения, правила переноса документов между слоями и приоритет разрешения конфликтов.

---

## 1. ЗАЧЕМ НУЖЕН ЭТОТ ДОКУМЕНТ

ARTEMIS использует документацию не как набор заметок, а как систему управления проектом.

Этот документ нужен, чтобы:
- исключить competing source-of-truth;
- развести canonical, working, audit, archive и reference слои;
- зафиксировать, где должен жить каждый тип документа;
- определить, какой слой имеет приоритет при конфликте;
- закрепить docs-first discipline как обязательную часть развития проекта.

Без этого документа даже качественные файлы могут начать расходиться по статусу, роли и месту хранения.

---

## 2. БАЗОВЫЙ ПРИНЦИП

В ARTEMIS не должно существовать нескольких равноправных источников истины по одной теме.

Правило:
- один вопрос системы → один главный документ-владелец смысла;
- остальные документы могут ссылаться на него, но не должны дублировать его роль;
- audit, archive, reference и working docs не заменяют canonical layer.

---

## 3. СЛОИ ДОКУМЕНТАЦИИ

### 3.1 Canonical layer

Canonical layer — это source of truth для текущего состояния проекта.

Он определяет:
- миссию проекта;
- продуктовые границы;
- архитектурные boundaries;
- data contract;
- release discipline;
- фазовую модель;
- активные приоритеты;
- систему документации.

Текущий canonical layer:
- `README.md`
- `docs/ARTEMIS_CONCEPT.md`
- `docs/ARTEMIS_MASTER_PROMPT.md`
- `docs/ARTEMIS_PRODUCT_SCOPE.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/PROJECT_PHASES.md`
- `docs/PRIORITIES.md`
- `docs/DATA_CONTRACT.md`
- `docs/CONTROLLED_RELEASE_DECISION.md`
- `docs/DOCUMENTATION_SYSTEM.md`

Правило:
- если информация не синхронизирована с canonical docs, она не считается окончательной.

### 3.2 Working layer

`docs/work/*` — рабочий слой текущего цикла.

Назначение:
- быстрые спецификации;
- implementation plans;
- runbooks;
- UI/UX system specs;
- AI strategy;
- operational notes;
- рабочие документы, которые меняются быстрее canonical core.

Правила:
- working docs могут уточнять implementation detail;
- working docs не имеют права переопределять canonical rules;
- при конфликте с canonical docs working doc считается несинхронизированным и должен быть обновлён или перемещён.

### 3.3 Audit layer

`docs/audits/*` — слой проверок.

Назначение:
- фиксировать результаты audit/verification;
- выявлять drift;
- проверять repo, runtime, contracts, release system, docs sync.

Правила:
- audit не задаёт архитектуру;
- audit не заменяет canonical doc;
- если audit выявил конфликт, должен быть обновлён canonical document, а не только создан новый audit file.

### 3.4 Archive layer

`docs/archive/*` — исторический слой.

Назначение:
- хранить прежние версии документов;
- сохранять traceability решений;
- не терять историю смены моделей.

Правила:
- archive нельзя использовать как текущий source of truth;
- архивный документ допускается только как historical reference.

### 3.5 Reference layer

`docs/reference/*` — справочные и диагностические материалы.

Назначение:
- исследования;
- отчёты;
- диагностические материалы;
- внешние reference-основания;
- производные материалы, которые полезны для анализа, но не задают правила проекта.

Правила:
- reference не имеет нормативного статуса;
- reference не заменяет canonical или working docs.

---

## 4. ПРИОРИТЕТ СЛОЁВ ПРИ КОНФЛИКТЕ

Если документы противоречат друг другу, действует следующий порядок приоритета:

1. `README.md` + canonical docs  
2. working docs  
3. audits  
4. reference  
5. archive

Уточнение:
- `README.md` — root entrypoint и краткая синхронизирующая точка;
- детальные правила задаются профильным canonical документом, а не README;
- при конфликте между двумя canonical docs нужно не выбирать "удобный", а устранять drift обновлением владельца смысла и связанных документов.

---

## 5. ВЛАДЕЛЬЦЫ СМЫСЛА ПО ТЕМАМ

Чтобы уменьшить semantic overlap, в ARTEMIS фиксируются владельцы смысла.

- `ARTEMIS_CONCEPT.md` — миссия, принципы, epistemic model, лестница развития
- `ARTEMIS_PRODUCT_SCOPE.md` — границы ARTEMIS v1.0, ядро ценности, разрешённый и запрещённый scope
- `PROJECT_STRUCTURE.md` — структура репозитория, entrypoints, runtime/documentation boundaries
- `PROJECT_PHASES.md` — активные фазы и переходы между ними
- `PRIORITIES.md` — load-bearing приоритеты текущего цикла
- `DATA_CONTRACT.md` — contract данных, publish/export semantics
- `CONTROLLED_RELEASE_DECISION.md` — controlled release baseline и критерии допуска
- `ARTEMIS_MASTER_PROMPT.md` — docs-first discipline, правила агентов, operational invariants
- `DOCUMENTATION_SYSTEM.md` — правила системы документации

Правило:
- если тема уже имеет владельца смысла, другой документ не должен дублировать её полноценно;
- в остальных местах допустима только краткая operational связка или ссылка.

---

## 6. ПОРЯДОК ЧТЕНИЯ ДОКУМЕНТАЦИИ

Базовый путь входа в документацию ARTEMIS:

1. `README.md`
2. `docs/DOCUMENTATION_SYSTEM.md`
3. `docs/ARTEMIS_CONCEPT.md`
4. `docs/ARTEMIS_PRODUCT_SCOPE.md`
5. `docs/PROJECT_STRUCTURE.md`
6. `docs/PROJECT_PHASES.md`
7. `docs/PRIORITIES.md`
8. затем профильные canonical docs (`DATA_CONTRACT`, `CONTROLLED_RELEASE_DECISION`, `ARTEMIS_MASTER_PROMPT`)
9. только после этого `docs/work/*`, `docs/audits/*`, `docs/reference/*`, `docs/archive/*`

Для ИИ-агентов и новых участников проекта это обязательный navigation order.

---

## 7. КАК РЕШАТЬ, КУДА КЛАСТЬ ДОКУМЕНТ

### Документ должен быть canonical, если он:
- определяет правило системы;
- фиксирует архитектурную границу;
- определяет продуктовый scope;
- задаёт фазовую модель;
- задаёт приоритеты текущего цикла;
- определяет data/release/docs governance;
- должен быть source of truth для кода, release или решений.

### Документ должен быть working, если он:
- описывает реализацию текущего трека;
- меняется быстро;
- является спецификацией рабочего слоя;
- нужен для текущего execution cycle, но не должен переопределять project core.

### Документ должен быть audit, если он:
- проверяет состояние repo/runtime/docs;
- фиксирует найденный drift;
- является результатом проверки, а не правилом.

### Документ должен быть archive, если он:
- потерял актуальный статус;
- нужен для истории решений;
- не должен больше использоваться как operational source.

### Документ должен быть reference, если он:
- полезен как аналитическая основа;
- не задаёт нормативных правил;
- служит справочным или диагностическим материалом.

---

## 8. ПРАВИЛО ПЕРЕНОСА WORKING → CANONICAL

Документ переносится или поднимается в canonical layer только если одновременно выполняются условия:

1. он определяет устойчивое правило, а не временную реализацию;
2. его смысл больше не является локальным для одного трека;
3. он нужен как source of truth для других документов, кода или release logic;
4. его содержание очищено от временных заметок, промежуточной истории и implementation noise;
5. обновлены связанные canonical docs.

Правило:
- перенос в canonical без docs-sync остальных владельцев смысла запрещён.

---

## 9. ПРАВИЛО СОЗДАНИЯ НОВОГО ДОКУМЕНТА

Перед созданием нового документа обязательно определить:
- какую единственную функцию он выполняет;
- к какому слою он относится;
- какой existing document уже владеет близким смыслом;
- не создаёт ли новый файл competing source-of-truth;
- должен ли он быть постоянным или transitional.

Нельзя создавать новый документ, если:
- он дублирует роль существующего canonical file;
- он нужен только как временная версия без плана переноса/архивации;
- его статус не определён.

---

## 10. ПРАВИЛО ОБНОВЛЕНИЯ ДОКУМЕНТОВ

Canonical docs обновляются обязательно, если изменение затрагивает:
- миссию или концепцию проекта;
- продуктовый scope;
- архитектурные boundaries;
- data contract;
- release semantics;
- фазовую модель;
- активные приоритеты;
- документационную иерархию.

Working docs обновляются, если меняется:
- реализация текущего трека;
- UI/UX behavior;
- AI strategy;
- runbook/операционный порядок;
- implementation plan.

Audit docs создаются или обновляются после проверки.

Archive docs не редактируются как active layer, а только пополняются новыми historical snapshots при необходимости.

---

## 11. ПРАВИЛО DOCS-FIRST

Для ARTEMIS действует обязательный порядок:
1. анализ;
2. определение затронутых canonical/working docs;
3. docs sync;
4. только потом patch / implementation;
5. затем checks / audit note.

Запрещено:
- менять architecture/data/release/doc boundaries сначала кодом;
- оставлять canonical docs несинхронизированными после изменения системы.

---

## 12. CHATGPT, GITHUB И GOOGLE DRIVE

### GitHub
GitHub — единственный canonical source of truth для проектной documentation system ARTEMIS.

Именно в репозитории должны жить:
- canonical docs;
- working docs, связанные с repo/runtime;
- audits;
- archive/reference repo-слоя.

### ChatGPT
ChatGPT используется как operational/intelligence layer:
- мастер-промпты агентов;
- временные synthesis-документы;
- промежуточные аналитические сборки;
- подготовка doc refactor, migration plan, audit interpretation.

Правило:
- документы в ChatGPT не считаются canonical source of truth, пока не перенесены в GitHub.

### Google Drive
Google Drive используется для collaborative drafting layer:
- большие исследовательские тексты;
- контентные заготовки;
- таблицы источников и наполнения;
- материалы, требующие совместной ручной редакции.

Правило:
- Drive не должен быть source of truth для архитектуры, product scope, release rules или documentation governance.

---

## 13. ПРАВИЛО ИМЕНОВАНИЯ

Для canonical repo-docs приоритетны стабильные семантические имена без дат в имени файла.

Примеры:
- `ARTEMIS_CONCEPT.md`
- `PROJECT_STRUCTURE.md`
- `DOCUMENTATION_SYSTEM.md`

Датированные или version-like имена допускаются в:
- archive;
- reference;
- exported reports;
- transitional materials вне canonical layer.

Нельзя использовать в canonical layer:
- `*_updated*`
- `*_final*`
- `*_sync*`
- `*_new*`
- другие несемантичные суффиксы

---

## 14. ЧТО СЧИТАЕТСЯ НАРУШЕНИЕМ DOC-SYSTEM

Нарушением считается:
- несколько равноправных документов по одной и той же нормативной теме;
- working doc в роли фактического canonical source;
- использование audit вместо обновления canonical doc;
- использование archive/reference как active guidance;
- отсутствие docs sync после изменения architecture/data/release/product rules;
- хранение load-bearing governance только вне GitHub;
- несоответствие физического размещения документа его реальной роли.

---

## 15. МИНИМАЛЬНЫЙ GOVERNANCE-CHECK ПРИ ЛЮБОМ DOC-ИЗМЕНЕНИИ

Перед завершением изменения документации нужно проверить:

1. правильно ли определён слой документа;
2. не появился ли новый competing source-of-truth;
3. обновлены ли связанные canonical docs;
4. не осталась ли старая активная версия в другом слое;
5. не должен ли старый файл уйти в archive/reference;
6. совпадает ли физическое место документа с его фактической ролью.

Если хотя бы один ответ отрицательный, docs-change не считается завершённым.

---

## 16. ИТОГОВОЕ ПРАВИЛО

ARTEMIS должен иметь не просто много хороших документов, а одну управляемую documentation system.

Краткая формула:
- **canonical** определяет правила;
- **work** помогает реализовывать;
- **audits** проверяют;
- **archive** хранит историю;
- **reference** помогает понимать;
- **GitHub** является source of truth;
- **ChatGPT** помогает думать и собирать;
- **Drive** помогает совместно готовить материалы.

Если документ нарушает эту логику, его статус или место хранения должны быть исправлены.