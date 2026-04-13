# Courses Progress Visibility Audit

## 1. Scope
Аудит видимости уже существующего persistent progress/completion в Courses (runtime: `js/ui.js`, `index.html`, `css/style.css`, плюс контекст `docs/COURSES_PROGRESS_AUDIT.md`).

## 2. Confirmed strengths
- Persistence работает: курс восстанавливает сохранённый шаг, completion сохраняется.
- На уровне course card есть явный completion message на последнем шаге.
- Навигация остаётся простой (без UX-усложнения).

## 3. Issues
- **MEDIUM:** saved state слабо видим до открытия курса.
  - В списке курсов нет явного статуса (started/completed).
  - Resume-точка видна только имплицитно после входа в курс (по step badge).
  - Пользователь не получает ранний сигнал, что курс можно продолжить с сохранённого места.

- **LOW:** completion message виден в card-контексте, но не отражается на уровне списка, где пользователь принимает решение, что открыть дальше.

## 4. Final status
Visibility improved косвенно через persistence, но не fully explicit на list-entry уровне.

## 5. Recommended next step
**Single minimal step:** добавить в `courses-list` компактный текстовый статус на item (например, `In progress · Step N` / `Completed`) на базе уже сохранённого progress state, без редизайна и без новых сущностей.
