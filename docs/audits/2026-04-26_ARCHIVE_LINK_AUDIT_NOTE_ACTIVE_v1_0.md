# 2026-04-26_ARCHIVE_LINK_AUDIT_NOTE_ACTIVE_v1_0

## Статус документа

- Тип: archive link-audit note
- Статус: active
- Дата: 2026-04-26
- Layer: `docs/audits/*`
- Назначение: зафиксировать результаты link-audit `docs/archive/*` после создания archive index

---

## 1. Контекст

После обновления `docs/archive/README.md` был выполнен link-audit архивных файлов.

Цель проверки:
- понять, какие архивные файлы упоминаются в активных слоях проекта;
- отделить traceability-файлы от superseded snapshots;
- подготовить будущий delete-candidate batch без немедленного удаления.

Удаления файлов в рамках audit не выполнялись.

---

## 2. Проверенный scope

Проверялись упоминания archive-файлов в следующих зонах:

- `README.md`
- `docs/*.md`
- `docs/work/**`
- `docs/audits/**`
- `.github/**`
- `scripts/**`
- `tests/**`
- `app/**`
- `js/**`
- `css/**`

Само упоминание файла внутри `docs/archive/README.md` не считалось активной ссылкой.

---

## 3. Результаты link-audit

Общее число archive-файлов:
- 38, без учёта `docs/archive/README.md`.

Итоги:

| Категория | Количество | Примечание |
|---|---:|---|
| referenced_by_canonical | 0 | активных canonical-ссылок на archive-файлы не найдено |
| referenced_by_work | 0 | рабочих ссылок на archive-файлы не найдено |
| referenced_by_audit | 3 | ссылки есть только в audit/context слоях |
| referenced_only_by_archive_index | 35 | файлы упоминаются только в индексе архива |
| unreferenced | 35 | активных ссылок не найдено |

---

## 4. Archive files referenced by audit layer

Найдены audit-layer ссылки на:

- `2026-04-19_DOCUMENTATION_SYSTEM_STRUCTURE_SPEC_ACTIVE_v1_0.md`
- `MANUAL_SMOKE_EVIDENCE_2026-04-11.md`
- `RELEASE_DISCIPLINE_AUDIT.md`

Интерпретация:
- это не active guidance;
- эти файлы не должны удаляться в первом delete-batch;
- они остаются `KEEP_FOR_TRACEABILITY`, пока audit trail зависит от них.

---

## 5. Delete-candidate finding

### `RELEASE_VERIFICATION_MVP_2026-03-30.md`

References:
- активных ссылок не найдено.

Recommendation:
- `candidate_for_delete_after_confirmation`.

Reason:
- файл уже находится в `DELETE_CANDIDATE` секции archive index;
- active references отсутствуют;
- перед удалением нужно подтвердить, что он не нужен как evidence trail.

---

## 6. Superseded findings

Следующие файлы не имеют active references и могут рассматриваться как delete-candidates after confirmation:

- `artemis_master_prompt_v3_3.md`
- `artemis_master_prompt_v3_4.md`
- `artemis_master_prompt_v4_1_foundational_sync.md`
- `Priorities_04_04_26_v3_5.md`
- `Priorities_05_04_26_v3_6.md`
- `Priorities_14_04_26_v4_1_foundational_sync.md`
- `Project_Phases_04_04_26_v3_5.md`
- `Project_Phases_05_04_26_v3_6.md`
- `Project_Phases_14_04_26_v4_1_foundational_sync.md`
- `Project_Structure_04_04_26_v3_5.md`
- `Project_Structure_14_04_26_v4_1_foundational_sync.md`
- `Artemis_Analysis_Conclusion_04_04_2026.md`

Recommendation:
- не удалять автоматически;
- сформировать отдельный small delete batch только после human confirmation;
- оставить как минимум один representative historical snapshot per category if traceability is preferred over cleanup.

---

## 7. Index correction applied

В ходе проверки была обнаружена проблема:

- `docs/archive/README.md` имел статусную строку с `active`, что нарушало release-check rule для `docs/archive/*`.

Исправлено в `docs/archive/README.md`:

- статус изменён на `archive index / not canonical guidance`.

Также был добавлен пропущенный файл:

- `UI_UX_TARGETED_SMOKE_2026-04-02.md`

Категория:
- `DO_NOT_DELETE_YET`.

---

## 8. Проверки и caveat

Codex local environment reported:

- `pytest`: mostly passing, but one upload integration timeout was observed in one run;
- `git status`: clean;
- `release_check`: failed in stale local snapshot because local `docs/archive/README.md` still contained old `active` status line.

Connector verification against GitHub `main` showed:

- `docs/archive/README.md` already has corrected status: `archive index / not canonical guidance`;
- the stale `active index for archived materials` line is not present on GitHub `main`.

Interpretation:
- the release-check failure in that Codex run was caused by stale local state, not current GitHub `main`.

---

## 9. Recommended next action

Recommended next step:

1. Do not delete traceability/evidence audits.
2. Prepare a small confirmation list for superseded snapshot deletion.
3. First delete-batch candidate set should include only files that:
   - are listed as `SUPERSEDED` or explicit `DELETE_CANDIDATE`;
   - have no active references;
   - are not needed as evidence/audit trail.
4. After deletion, run:
   - `python scripts/release_check.py`
   - `pytest`
   - `git status --short`
5. Update `docs/archive/README.md` and create cleanup note.

---

## 10. Current decision

No archive files are deleted by this note.

This note only records link-audit findings and prepares the next cleanup decision.
