# Priorities_04_04_26_v3_5.md
status: canonical
version: v3.5
source: repository-state
last_updated: 2026-04-04

## Purpose
Фиксирует реальный backlog и порядок выполнения задач после завершённого cleanup-cycle.

## Scope
Актуальные приоритеты по governance, coverage и стабильности контуров без повторной постановки уже закрытых дефектов.

## Contract
- Закрытые задачи не должны оставаться в active high-priority списке.
- Backlog должен соответствовать текущей фазе C (`Governance & Coverage maturity`).
- Приоритеты формируются от фактического состояния кода/тестов/документов в репозитории.

## Closed and removed from active backlog
Следующие задачи считаются закрытыми и **не являются активными приоритетами**:
- ✅ Reference docs layer restoration.
- ✅ SYSTEM_CONTRACT_AUDIT sync with current code.
- ✅ Courses/LIVE behavioral baseline tests.
- ✅ Reject reason contract fix (UI↔backend).
- ✅ Legacy `/drafts/*` fallback removal in UGC client.

## Active priorities (Phase C aligned)

### P1 — Semantic docs fill / source-of-truth completion
- Довести ключевые reference docs до semantic canonical уровня (минимум stubs, максимум фактических контрактов).
- Поддерживать непрерывную синхронизацию planning/audit docs после каждого patch-цикла.

### P2 — Behavioral coverage expansion (UGC/moderation critical flows)
- Расширить поведенческие тесты для edge-case сценариев UGC/moderation (error handling, status transitions, reject reason visibility consistency).
- Сохранить быстрый unit-level подход без e2e усложнения.

### P3 — Governance/process hardening against future doc drift
- Зафиксировать процесс обязательного обновления load-bearing docs сразу после закрытия runtime-фиксов.
- Контролировать соответствие `audit -> priorities -> phases` единому состоянию.

### P4 — Low-priority cleanup / residue
- Планово убирать оставшийся low-impact legacy residue (терминология/naming/docs consistency), не расширяя scope.

## Execution order
1. Закрыть P1 (semantic canonical completion для load-bearing docs).
2. Выполнить P2 (targeted behavioral coverage expansion).
3. Закрепить P3 как операционный стандарт.
4. Выполнять P4 только при отсутствии конфликтов с P1–P3.

## Out-of-priority (explicit)
Не возвращать в urgent/high:
- координатные CRITICAL mismatch,
- pending/review CRITICAL mismatch,
- payload flatten CRITICAL mismatch,
- legacy `/drafts/*` fallback workaround.
