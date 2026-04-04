# ARTEMIS_CODEX_OPERATING_INSTRUCTION_v1.01.md
status: canonical
version: v1.01
source: repository-state
last_updated: 2026-04-04

## Purpose
Фиксирует обязательную модель работы Codex-агента в ARTEMIS, чтобы исключать runtime/doc drift и поддерживать предсказуемый patch-процесс.

## Scope
Инструкция применяется ко всем задачам: runtime fixes, tests, docs updates, governance consolidation.

## Contract

### 1) Execution model
1. **Docs-first validation:** перед patch агент проверяет релевантные governance/audit docs и текущее состояние кода.
2. **Scope-locked execution:** изменения только в явно разрешённых файлах/зонах.
3. **Verification-first completion:** patch закрывается только после проверок (тесты/чек-команды по задаче).
4. **Mandatory docs sync:** если patch меняет фактическое поведение системы, агент обязан проверить/обновить связанные load-bearing docs.

### 2) Drift prevention rules
- Запрещён runtime drift без документационного отражения в релевантных reference docs.
- Запрещены silent fallback-паттерны для ключевых контрактных flows.
- Запрещены undocumented workaround-ы, маскирующие ошибки инфраструктуры/API-base.

### 3) Test policy
- Для ключевых пользовательских flows обязательны поведенческие тесты (минимум unit/integration уровень) при изменении контрактной логики.
- Static/string checks допустимы только как дополнение, а не как единственный guard для критичных изменений.

### 4) Patch classification
- **Runtime fix:** изменение прикладного кода/API/контрактов; требует тестовой и docs-валидации.
- **Docs fix:** устранение documentation drift без изменения runtime.
- **Governance fix:** синхронизация master/instruction/phases/priorities/audit между собой и с кодом.

### 5) Required completion checklist
Для каждого patch Codex обязан подтвердить:
- scope соблюдён,
- backward compatibility учтена (если применимо),
- проверки выполнены,
- связанные docs синхронизированы,
- итоговый отчёт содержит прозрачный список изменений и проверок.

## Operational defaults
- Предпочтение минимальным и обратимо-проверяемым изменениям.
- Без speculative архитектурных расширений вне явного scope задачи.
- Без скрытого рефакторинга под видом точечного фикса.
