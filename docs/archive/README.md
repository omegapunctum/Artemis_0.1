# Reference Documentation Index (Historical Archive)

`docs/reference/` — это **исторический архив snapshot-документов**, а не текущий canonical слой проекта.
Актуальные правила/решения для текущего релизного цикла нужно брать из `docs/` (корневой каталог документации).

## Documents

- `artemis_master_prompt_v3_4.md` — status: historical snapshot (stub); master prompt на дату snapshot.
- `ARTEMIS_CODEX_OPERATING_INSTRUCTION_v1.01.md` — status: historical snapshot (stub); операционные инструкции на дату snapshot.
- `Artemis_Analysis_Conclusion_04_04_2026.md` — status: historical snapshot (stub); аналитические выводы на контрольную дату.
- `Priorities_04_04_26_v3_5.md` — status: historical snapshot (stub); приоритеты и порядок исправлений на дату snapshot.
- `Project_Structure_04_04_26_v3_5.md` — status: historical snapshot (stub); структура репозитория на дату snapshot.
- `Project_Phases_04_04_26_v3_5.md` — status: historical snapshot (stub); фазность и gate-критерии на дату snapshot.
- `Artemis_UI_UX_Report.md` — status: historical snapshot (stub); UI/UX baseline на дату snapshot.

## Status model

- **historical snapshot** — архивный материал для контекста/трассировки эволюции; не источник текущих обязательных правил.
- **stub** — исходный текст не восстановлен; размещён минимальный контрактный шаблон до заполнения оригиналом.

## Canonical source rule

- Для текущих release/audit решений canonical source — документы в корне `docs/`.
- При конфликте трактовок между `docs/reference/*` и `docs/*` приоритет всегда у `docs/*`.
