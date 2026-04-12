# MVP BASELINE — 2026-04-02

Этот документ фиксирует **freeze-point** системы ARTEMIS в первом полностью консистентном состоянии (UI ↔ backend/API ↔ tests).

---

## 1) System snapshot

На дату **2026-04-02** baseline системы зафиксирован как:

- **UI layer:** stable
- **API contract:** flat response
- **Status model:** `draft / pending / approved / rejected`
- **Coords model:** `coords` + `latitude/longitude` sync
- **Moderation model:** pending-based

---

## 2) Contract rules (обязательно)

Нормативные правила baseline:

1. **UI = source of truth**
2. **Backend follows UI contract**
3. **Flat response only**
4. **No `review` status**
5. **Coords required / mapped** (через `coords` и/или `lat/lng` с синхронизацией)

Эти правила обязательны для всех следующих изменений в MVP-контуре.

---

## 3) Test baseline

### Baseline criterion
- **pytest green** — обязательное условие соответствия baseline.

### Contract test set (baseline)
Контрактно-значимыми для текущего freeze-point считаются:

- `tests/test_moderation.py`
- `tests/test_mvp_contract_static.py`

### Coverage mapping
- **UGC flow:** покрывается в рамках contract/static checks и draft-schema validation, зафиксированных в текущем тестовом слое.
- **Moderation flow:** покрывается `tests/test_moderation.py` (submit → pending, queue, approve, reject, publish outcomes).
- **ETL sanity:** покрывается `tests/test_mvp_contract_static.py` (origin/dedupe/validate_feature sanity + static data guards).

---

## 4) Known constraints

Текущие ограничения baseline:

- design system неполный
- full UX consistency не покрыт end-to-end
- performance не оптимизирован (базовый функциональный уровень, не perf baseline)

---

## 5) What is NOT allowed

В рамках зафиксированного baseline **запрещено**:

1. Менять response shape
2. Менять статусную модель
3. Вводить nested payload как основной response-контракт
4. Менять coords-модель (`coords` + lat/lng sync)

Любое из перечисленного требует отдельного пересмотра baseline.

---

## 6) Next phase entry conditions

Переход к следующей фазе возможен только при соблюдении цикла:

**audit → patch → verification**

Где:
- `audit` — фиксирует изменения контрактов и риски;
- `patch` — вносит минимально необходимые правки;
- `verification` — подтверждает green tests + отсутствие контрактной деградации.

Без этого цикла изменения в baseline-контур не допускаются.
