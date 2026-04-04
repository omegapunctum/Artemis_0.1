# Priorities_04_04_26_v3_5.md
status: canonical
version: v3.5
source: reconstructed
last_updated: 2026-04-04

## Purpose
Фиксирует приоритеты работ и порядок исполнения задач после аудита.

## Scope
Backlog-приоритеты, критические зоны, последовательность исправлений и ограничители scope.

## Contract
Правила приоритизации задач, критерии срочности и обязательные условия перехода между этапами.

## Priority status (synced with current repo)

### Closed in the latest cleanup cycle
- ✅ Reference docs layer восстановлен в `docs/reference/*`.
- ✅ `SYSTEM_CONTRACT_AUDIT` синхронизирован с текущим кодом.
- ✅ Courses/LIVE behavioral tests добавлены.
- ✅ Reject reason contract UI↔backend закрыт.
- ✅ Legacy fallback `/drafts/*` удалён из UGC-клиента (оставлен canonical `/api/drafts/*`).

### Active backlog (actual)

#### P1 — High
1. **Doc sync continuation (non-critical, high impact on governance)**
   - Синхронизировать остальные reference docs с фактическим кодом (не только stubs), чтобы исключить повторный doc drift при следующих audit/patch циклах.

2. **Behavioral coverage expansion for frontend critical flows**
   - Укрепить поведенческие тесты для UGC/moderation edge-cases (ошибки API, статусные переходы, reject reason отображение), без перехода в e2e.

#### P2 — Medium
3. **Moderation traceability hardening**
   - Уточнить и стабилизировать контракт по полям moderation metadata (например, единый naming для причины отклонения на всем UI/API-пути).

4. **Operational observability alignment**
   - Проверить, что ключевые UX-critical ошибки (UGC save/submit/reject) consistently отражаются в логах и документации по инцидентам.

#### P3 — Low
5. **Residual legacy naming cleanup (docs/planning level)**
   - Планово убрать остаточные legacy naming references из roadmap-слоя и согласовать терминологию.

## De-prioritized / removed from active high list
- ❌ Coordinates contract mismatch (закрыто).
- ❌ `pending/review` CRITICAL mismatch (закрыто на UI boundary normalization).
- ❌ Payload flatten mismatch как CRITICAL (закрыто).
- ❌ Legacy `/drafts/*` fallback как runtime workaround (удалён).

## Execution order
1. Завершить doc sync (reference + planning docs).
2. Расширить поведенческое покрытие наиболее рискованных frontend сценариев.
3. Доработать moderation traceability и observability consistency.

## Notes
Этот backlog отражает состояние после cleanup-цикла и должен обновляться после каждого цикла `audit → patch → verification`.
