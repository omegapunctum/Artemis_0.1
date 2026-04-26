# ARTEMIS — Archive Index

## Статус документа

- Тип: archive index / historical documentation registry
- Статус: active index for archived materials
- Layer: `docs/archive/*`
- Назначение: объяснить, какие архивные документы существуют, зачем они сохранены и какие из них можно рассматривать как кандидаты на удаление после link-audit

---

## 1. Правило archive-layer

`docs/archive/*` — это historical reference layer.

Архивные документы:
- не являются текущим source of truth;
- не должны использоваться как operational guidance;
- могут содержать устаревшие имена файлов, устаревшие выводы, старые phase/status формулировки и прежние release assumptions;
- сохраняются только для traceability и понимания эволюции проекта.

Текущий source of truth находится в:
- `README.md`
- `docs/FOUNDATION_INDEX.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- canonical docs в корне `docs/`.

---

## 2. Archive classification model

Используются четыре статуса.

### KEEP_FOR_TRACEABILITY

Сохранять.

Причины:
- документ объясняет важное историческое решение;
- содержит evidence/audit trail;
- может понадобиться для понимания release, data, auth, UI/UX или contract evolution.

### DO_NOT_DELETE_YET

Пока не удалять.

Причины:
- документ может содержать полезные выводы;
- не ясно, перенесены ли все важные решения в canonical docs;
- нужен дополнительный semantic/link audit.

### SUPERSEDED

Заменён актуальными canonical docs.

Правила:
- не использовать как текущую инструкцию;
- можно оставить для истории;
- может стать delete-candidate после проверки ссылок и переноса ценных выводов.

### DELETE_CANDIDATE

Кандидат на удаление после link-audit.

Правила:
- не удалять без проверки ссылок;
- не удалять, если файл используется как historical evidence в audit trail;
- перед удалением подтвердить, что полезный смысл уже перенесён в canonical/work/audit docs.

---

## 3. KEEP_FOR_TRACEABILITY

| Файл | Причина |
|---|---|
| `AUTH_SCALING_AUDIT.md` | важный historical audit по auth/scaling baseline и ограничениям production-ready claims |
| `DATA_LAYER_FINAL_AUDIT.md` | важный audit trail по data layer/public artifact discipline |
| `RELEASE_DISCIPLINE_AUDIT.md` | historical release discipline audit; содержит контекст старых release checks/evidence |
| `FINAL_RELEASE_READINESS_AUDIT.md` | historical readiness audit, полезен для понимания controlled release evolution |
| `MANUAL_SMOKE_EVIDENCE_2026-04-11.md` | historical manual smoke evidence; не active evidence link, но полезен для traceability |
| `CONTRACT_SYNC_CYCLE_AUDIT.md` | historical audit по contract sync cycle |
| `SYSTEM_CONTRACT_AUDIT_2026-04-02.md` | ранний audit системного контракта |
| `PROJECT_CHECKPOINT_2026-04-13.md` | checkpoint состояния проекта, полезен для восстановления контекста решений |
| `ARTEMIS_CODEX_OPERATING_INSTRUCTION_v1.01.md` | историческая версия Codex operating instruction |
| `2026-04-18_CORE_MASTER_PROMPT_SYSTEM_ARCHIVE_v4_1.md` | historical master-prompt snapshot |
| `2026-04-19_DOCUMENTATION_SYSTEM_STRUCTURE_SPEC_ACTIVE_v1_0.md` | historical proposal по docs structure; текущий canonical owner — `docs/DOCUMENTATION_SYSTEM.md` |

---

## 4. DO_NOT_DELETE_YET

| Файл | Причина |
|---|---|
| `MVP_BASELINE_2026-04-02.md` | может содержать ранний baseline context; нужен semantic audit перед удалением |
| `PRODUCTION_READINESS_CHECKLIST.md` | checklist superseded по статусу, но может содержать useful readiness criteria |
| `RELEASE_VERIFICATION.md` | historical release verification; проверить, перенесены ли важные условия в canonical release docs |
| `SMOKE_VERIFICATION_REPORT_v1.md` | historical smoke report; возможно useful evidence trail |
| `UI_MAINSCREEN_FINAL_SMOKE_2026-04-02.md` | historical UI smoke; проверить перед удалением |
| `UI_UX_STABILIZATION_FINAL_AUDIT.md` | historical UI/UX stabilization audit; может объяснять закрытие Phase 4 |
| `UI_UX_STABILITY_AUDIT.md` | UI/UX historical audit, нужен quick semantic review |
| `UI_UX_READINESS_CHECKLIST.md` | UI/UX readiness checklist; может содержать useful UX criteria |
| `COURSES_SLICE1_AUDIT.md` | courses/slice integration history, может быть полезен до следующего product expansion cycle |
| `COURSES_CONTRACT_HARDENING_AUDIT.md` | courses contract history, проверить перед удалением |
| `COURSES_TWO_COURSE_AUDIT.md` | courses runtime/product audit history, проверить перед удалением |
| `DATA_LAYER_WARNING_AUDIT.md` | data warning history, может быть useful для ETL/data quality context |

---

## 5. SUPERSEDED

Эти документы заменены текущими canonical docs и не должны использоваться как актуальные инструкции.

| Файл | Заменён чем |
|---|---|
| `artemis_master_prompt_v3_3.md` | `docs/ARTEMIS_MASTER_PROMPT.md` |
| `artemis_master_prompt_v3_4.md` | `docs/ARTEMIS_MASTER_PROMPT.md` |
| `artemis_master_prompt_v4_1_foundational_sync.md` | `docs/ARTEMIS_MASTER_PROMPT.md` |
| `Priorities_04_04_26_v3_5.md` | `docs/PRIORITIES.md` |
| `Priorities_05_04_26_v3_6.md` | `docs/PRIORITIES.md` |
| `Priorities_14_04_26_v4_1_foundational_sync.md` | `docs/PRIORITIES.md` |
| `Project_Phases_04_04_26_v3_5.md` | `docs/PROJECT_PHASES.md` |
| `Project_Phases_05_04_26_v3_6.md` | `docs/PROJECT_PHASES.md` |
| `Project_Phases_14_04_26_v4_1_foundational_sync.md` | `docs/PROJECT_PHASES.md` |
| `Project_Structure_04_04_26_v3_5.md` | `docs/PROJECT_STRUCTURE.md` |
| `Project_Structure_14_04_26_v4_1_foundational_sync.md` | `docs/PROJECT_STRUCTURE.md` |
| `Artemis_Analysis_Conclusion_04_04_2026.md` | `docs/FOUNDATION_INDEX.md`, `docs/ARTEMIS_CONCEPT.md`, current canonical docs |

---

## 6. DELETE_CANDIDATE

Удалять только после link-audit.

| Файл | Условие удаления |
|---|---|
| `RELEASE_VERIFICATION_MVP_2026-03-30.md` | если не используется как required evidence trail и важные выводы перенесены |
| old duplicated master prompt snapshots | если подтверждено отсутствие ссылок и useful traceability |
| old duplicated priority/phase/structure snapshots | если подтверждено отсутствие ссылок и сохранена хотя бы одна representative history line |
| duplicated UI smoke reports | если итоговые UI/UX findings уже перенесены в current UI/UX docs или audits |

На текущем шаге конкретные файлы физически не удаляются.

---

## 7. Link-audit rule before deletion

Перед удалением archive-файла нужно выполнить:

```bash
grep -R "<filename>" -n README.md docs .github scripts tests app js css || true
```

Минимальное правило:
- если файл упомянут в canonical docs, сначала обновить ссылку или перенести смысл;
- если файл упомянут только в archive/audit historical context, можно оставить или удалить только после явного решения;
- если файл не упомянут нигде и является superseded snapshot, его можно рассматривать как delete-candidate.

---

## 8. Current archive cleanup policy

Текущая политика:

1. Не удалять evidence/audit traceability files без отдельного решения.
2. Не использовать archive as active guidance.
3. Сначала классифицировать.
4. Затем выполнить link-audit.
5. Затем удалять только confirmed delete-candidates.
6. После удаления обновить этот index и создать audit note.

---

## 9. Итог

Цель archive cleanup — не уменьшить число файлов ради чистоты, а снизить semantic noise.

Архив полезен, пока он:
- ясно маркирован;
- не конкурирует с canonical docs;
- помогает понять историю решений;
- не вводит агентов и участников в заблуждение.

Если архивный файл не выполняет ни одной из этих функций, он может быть удалён после link-audit.
