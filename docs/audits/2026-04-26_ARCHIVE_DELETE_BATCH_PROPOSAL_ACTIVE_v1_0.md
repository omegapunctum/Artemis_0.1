# 2026-04-26_ARCHIVE_DELETE_BATCH_PROPOSAL_ACTIVE_v1_0

## Статус документа

- Тип: archive delete-batch proposal
- Статус: active proposal / no deletion performed
- Дата: 2026-04-26
- Layer: `docs/audits/*`
- Назначение: предложить первый небольшой batch архивных файлов-кандидатов на удаление после link-audit

---

## 1. Назначение

Документ предлагает первый безопасный delete-batch для `docs/archive/*`.

Этот документ не удаляет файлы и не является разрешением на удаление сам по себе.

Удаление допустимо только после отдельного подтверждения.

---

## 2. Основание

Основание для proposal:

- `docs/archive/README.md`
- `docs/audits/2026-04-26_ARCHIVE_LINK_AUDIT_NOTE_ACTIVE_v1_0.md`

Link-audit показал:

- canonical references: 0;
- work references: 0;
- audit references: 3;
- 35 archive files не имеют active references;
- большинство superseded snapshot-файлов упоминаются только в archive index.

---

## 3. Принцип первого delete-batch

Первый batch должен быть маленьким.

Цель:
- снизить шум архива;
- не потерять важный evidence/audit trail;
- не удалять файлы, которые могут объяснять release, auth, data, UI/UX или documentation evolution.

Правила:

1. Не удалять `KEEP_FOR_TRACEABILITY`.
2. Не удалять `DO_NOT_DELETE_YET`.
3. Не удалять файлы, на которые есть audit-layer references.
4. Не удалять evidence/smoke/audit files в первом batch.
5. Начинать только с superseded snapshot-файлов фаз, приоритетов и старых master prompts.

---

## 4. Recommended first delete-batch

### Batch A — lowest-risk superseded snapshots

Рекомендуемый первый batch:

| Файл | Причина |
|---|---|
| `docs/archive/artemis_master_prompt_v3_3.md` | superseded by `docs/ARTEMIS_MASTER_PROMPT.md`, active references not found |
| `docs/archive/artemis_master_prompt_v3_4.md` | superseded by `docs/ARTEMIS_MASTER_PROMPT.md`, active references not found |
| `docs/archive/Priorities_04_04_26_v3_5.md` | superseded by `docs/PRIORITIES.md`, active references not found |
| `docs/archive/Priorities_05_04_26_v3_6.md` | superseded by `docs/PRIORITIES.md`, active references not found |
| `docs/archive/Project_Phases_04_04_26_v3_5.md` | superseded by `docs/PROJECT_PHASES.md`, active references not found |
| `docs/archive/Project_Phases_05_04_26_v3_6.md` | superseded by `docs/PROJECT_PHASES.md`, active references not found |
| `docs/archive/Project_Structure_04_04_26_v3_5.md` | superseded by `docs/PROJECT_STRUCTURE.md`, active references not found |

Why this batch is safe:

- files are old v3.x/v3.5/v3.6 snapshots;
- current canonical docs already own these meanings;
- no active references were found;
- newer v4.1/foundation snapshots can remain temporarily as representative transition history.

---

## 5. Files intentionally not included in first batch

### Keep for now: foundation-sync snapshots

Not included:

- `docs/archive/artemis_master_prompt_v4_1_foundational_sync.md`
- `docs/archive/Priorities_14_04_26_v4_1_foundational_sync.md`
- `docs/archive/Project_Phases_14_04_26_v4_1_foundational_sync.md`
- `docs/archive/Project_Structure_14_04_26_v4_1_foundational_sync.md`

Reason:
- these files may be useful as transition history from foundational sync;
- delete later only after confirming current foundation docs fully replace their useful content.

### Keep for now: analysis snapshot

Not included:

- `docs/archive/Artemis_Analysis_Conclusion_04_04_2026.md`

Reason:
- may contain early conceptual synthesis;
- delete only after semantic review.

### Keep for now: release/evidence/audit files

Not included:

- `docs/archive/RELEASE_VERIFICATION_MVP_2026-03-30.md`
- `docs/archive/MANUAL_SMOKE_EVIDENCE_2026-04-11.md`
- `docs/archive/RELEASE_DISCIPLINE_AUDIT.md`
- `docs/archive/FINAL_RELEASE_READINESS_AUDIT.md`
- `docs/archive/DATA_LAYER_FINAL_AUDIT.md`
- other release/data/auth/UI audit files

Reason:
- evidence/audit trail is more valuable than cleanup in the first pass;
- remove only after explicit release-governance confirmation.

---

## 6. Pre-delete checks

Before deleting Batch A, run:

```bash
for f in \
  docs/archive/artemis_master_prompt_v3_3.md \
  docs/archive/artemis_master_prompt_v3_4.md \
  docs/archive/Priorities_04_04_26_v3_5.md \
  docs/archive/Priorities_05_04_26_v3_6.md \
  docs/archive/Project_Phases_04_04_26_v3_5.md \
  docs/archive/Project_Phases_05_04_26_v3_6.md \
  docs/archive/Project_Structure_04_04_26_v3_5.md; do
  grep -R "$(basename "$f")" -n README.md docs .github scripts tests app js css || true
done
```

Expected result:
- references only in `docs/archive/README.md` and this proposal note.

---

## 7. Delete command if confirmed

Only after explicit confirmation:

```bash
rm \
  docs/archive/artemis_master_prompt_v3_3.md \
  docs/archive/artemis_master_prompt_v3_4.md \
  docs/archive/Priorities_04_04_26_v3_5.md \
  docs/archive/Priorities_05_04_26_v3_6.md \
  docs/archive/Project_Phases_04_04_26_v3_5.md \
  docs/archive/Project_Phases_05_04_26_v3_6.md \
  docs/archive/Project_Structure_04_04_26_v3_5.md
```

Then update:

- `docs/archive/README.md`
- this proposal or a new cleanup note in `docs/audits/*`

---

## 8. Required checks after deletion

After deletion, run:

```bash
python scripts/release_check.py
pytest
git status --short
```

Expected:
- release_check passes, except allowed existing runtime/deployment warning about memory session backend;
- pytest passes;
- git status shows only intended deletes and docs updates before commit.

---

## 9. Recommendation

Recommended decision:

- approve Batch A only;
- do not delete release/evidence/audit files;
- do not delete foundation-sync v4.1 snapshots yet;
- do not delete UI/UX and courses audits yet;
- re-evaluate remaining archive after one more product/foundation cycle.

---

## 10. Current status

No files have been deleted.

This is a proposal for review and confirmation only.
