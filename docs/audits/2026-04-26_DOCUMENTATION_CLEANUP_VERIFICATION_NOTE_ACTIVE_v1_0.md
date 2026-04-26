# 2026-04-26_DOCUMENTATION_CLEANUP_VERIFICATION_NOTE_ACTIVE_v1_0

## Статус документа

- Тип: documentation cleanup verification note
- Статус: active
- Дата: 2026-04-26
- Layer: docs/audits

---

## 1. Назначение

Документ фиксирует итог текущего безопасного cleanup-цикла после total documentation audit.

Этот файл не заменяет canonical docs. Он фиксирует, какие проблемы были устранены через GitHub connector и какие действия оставлены на отдельный scoped pass.

---

## 2. Закрыто текущим cleanup-cycle

### 2.1 Deploy artifact drift

Закрыто:
- `.github/workflows/pages.yml` теперь включает `css/main-screen.css` в GitHub Pages artifact.

Риск до исправления:
- production deploy мог не получить текущий main-screen layout layer, хотя `index.html` его подключает.

### 2.2 Phase-order drift

Закрыто:
- `docs/ARTEMIS_MASTER_PROMPT.md` синхронизирован с текущим repo-baseline: Phase 5 / Scaling Hardening является активным рабочим контуром.

Риск до исправления:
- operational agent prompt мог направлять работу обратно в уже закрытую Phase 4 / PWA UX Stabilization.

### 2.3 Stale release evidence reference

Закрыто:
- `docs/CONTROLLED_RELEASE_DECISION.md` больше не ссылается напрямую на отсутствующий `docs/MANUAL_SMOKE_EVIDENCE_2026-04-11.md`.

Риск до исправления:
- canonical release decision ссылался на отсутствующий active artifact.

### 2.4 DATA_CONTRACT schema-level baseline

Закрыто:
- `docs/DATA_CONTRACT.md` расширен до schema-level contract и теперь фиксирует owner chain, release artifacts, public GeoJSON shape, feature properties schema, date contract, validation/rejection semantics и change-control rule.

Риск до исправления:
- data contract был слишком кратким и не давал достаточного schema-level ориентира для ETL/frontend/release изменений.

### 2.5 Reference status drift

Закрыто:
- `docs/reference/2026-04-19_DOCUMENTATION_STORAGE_POLICY_SYSTEM_ACTIVE_v1_0.md` понижен до reference / historical governance-support material.

Риск до исправления:
- reference-файл мог восприниматься как active governance source вместо `docs/DOCUMENTATION_SYSTEM.md`.

### 2.6 Archive status drift

Закрыто:
- `docs/archive/2026-04-19_DOCUMENTATION_SYSTEM_STRUCTURE_SPEC_ACTIVE_v1_0.md` понижен до archived / historical reference.
- `docs/archive/RELEASE_DISCIPLINE_AUDIT.md` получил archive-status disclaimer.

Риск до исправления:
- archive-файлы могли восприниматься как текущий source of truth.

### 2.7 Controlled release status block

Закрыто:
- `docs/CONTROLLED_RELEASE_DECISION.md` получил унифицированный status block с типом, статусом, ролью и scope.

Риск до исправления:
- canonical release document был понятен по функции, но не по формальному статусному блоку.

---

## 3. Cross-link check summary

Проверено:
- active canonical docs больше не используют старые `DOCUMENTATION_STORAGE_POLICY` / `DOCUMENTATION_SYSTEM_STRUCTURE` как текущий documentation-governance source;
- `docs/DOCUMENTATION_SYSTEM.md` остаётся canonical owner для documentation governance;
- stale smoke evidence path больше не используется в `docs/CONTROLLED_RELEASE_DECISION.md` как active evidence link;
- оставшиеся совпадения по old smoke path находятся в archive/audit context and must be treated as historical material.

---

## 4. Что не делалось намеренно

Не выполнялся широкий rewrite canonical docs.

Причина:
- canonical docs большие и смыслонесущие;
- style-only normalization лучше делать отдельным patch-pass с жёстким scope lock;
- текущий cleanup-cycle был направлен на real drift, stale references и misleading active/archive/reference statuses.

Не переименовывались файлы с `ACTIVE` в имени внутри `docs/archive/` и `docs/reference/`.

Причина:
- переименование может сломать исторические ссылки;
- внутренний статус уже понижен;
- naming cleanup лучше делать отдельным move/rename pass после link audit.

---

## 5. Оставшиеся действия

### 5.1 Optional style-only canonical pass

Scope:
- привести верхние status blocks canonical docs к одному формату;
- не менять содержание разделов;
- не менять phase/order/scope semantics.

Candidate files:
- `README.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/PROJECT_PHASES.md`
- `docs/PRIORITIES.md`
- `docs/ARTEMIS_MASTER_PROMPT.md`

### 5.2 Optional archive/reference rename pass

Scope:
- решить, надо ли переименовывать архивные/reference-файлы с `ACTIVE` в имени;
- перед rename выполнить link search;
- после rename обновить ссылки или оставить старые имена, если traceability важнее naming purity.

### 5.3 Required checks outside connector

Выполнено (после patch-pass с Redis test guard):
- `python scripts/release_check.py` — pass;
- `pytest` — pass в deterministic-режиме при недоступном Redis: `244 passed, 3 skipped`;
- 3 skipped-теста: только real-Redis auth integration tests:
  - `tests/test_auth_redis_integration.py::test_auth_refresh_lifecycle_with_real_redis_backend`
  - `tests/test_auth_redis_multi_instance.py::test_refresh_token_shared_between_instances_with_real_redis`
  - `tests/test_auth_redis_restart.py::test_refresh_survives_restart_with_real_redis`
- skip является environment-dependent и ожидаем, когда Redis недоступен по test URL;
- production auth behavior не изменялся (изменения ограничены test scope).

Примечание:
- в средах, где Redis доступен, Redis-backed integration tests должны выполняться в обычном режиме (без skip).
- GitHub Pages artifact verification after workflow run остаётся отдельной operational проверкой.

---

## 6. Итоговая оценка

Текущий documentation cleanup-cycle закрыл практические documentation-governance проблемы без широкого переписывания документации.

Состояние после цикла:
- critical deploy/docs drift: reduced;
- canonical release/data clarity: improved;
- archive/reference role clarity: improved;
- verification status: release gate passes; full pytest deterministic (`244 passed, 3 skipped`) при недоступном Redis;
- remaining work: style-only normalization and optional rename hygiene.
