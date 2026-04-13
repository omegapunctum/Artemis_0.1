# Backend Test Stability Audit

## 1. Scope
Точечный аудит нестабильности для:
- `tests/test_map_feed_endpoint.py`
- `tests/test_response_contract.py`
- `tests/test_serialization_contract.py`

Только анализ (без фиксов).

## 2. Failing tests
### Sequential run (baseline)
Все 3 файла проходят стабильно при последовательном запуске.

### Concurrent run (reproduction)
При конкурентном запуске этих 3 файлов воспроизводится падение в `tests/test_map_feed_endpoint.py`:
- `401 Invalid access token` на `/api/me` в `setUp`.

`tests/test_response_contract.py` и `tests/test_serialization_contract.py` в том же конкурентном прогоне проходят.

## 3. Root cause analysis
Единый root cause: **shared test state в общей SQLite БД** (`artemis_auth.db`, `artemis_drafts.db`) + **destructive cleanup** в других integration тестах.

Наблюдаемая цепочка:
1. Все три тестовых файла работают с одним и тем же DB path.
2. В `test_response_contract.py` и `test_serialization_contract.py` в `setUp` есть массовая очистка (`DELETE User`, `DELETE Draft`).
3. При конкурентном выполнении это удаляет пользователя, под которого уже выпущен access token в `test_map_feed_endpoint.py`.
4. Токен декодируется, но user record отсутствует -> `401 Invalid access token`.

Вывод по категориям: это не timeout, не response contract drift, не serialization inconsistency; это **flaky environment dependency (test isolation race)** с auth-симптомом.

## 4. Classification
- `tests/test_map_feed_endpoint.py`: **intermittent/non-deterministic** при concurrency; тип ошибки — auth failure (`401`) из-за race по данным.
- `tests/test_response_contract.py`: **stable** в baseline; выступает источником side effect (табличная очистка) в concurrent режиме.
- `tests/test_serialization_contract.py`: **stable** в baseline; выступает источником side effect (табличная очистка) в concurrent режиме.

Итоговая классификация:
- reproducible code issue: **нет отдельного deterministic дефекта бизнес-логики endpoint**;
- flaky/non-deterministic issue: **да** (конкурентный shared DB state);
- environment-only issue: **частично** (проявляется в режиме запуска), но корень в тестовой изоляции.

## 5. Recommended next fix
**Single next fix:** перевести integration tests на изолированный DB path на каждый тестовый процесс/файл (unique SQLite file per worker), чтобы исключить cross-test deletion races.
