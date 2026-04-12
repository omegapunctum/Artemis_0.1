# Production Readiness Checklist

## 1. Data Layer

- [ ] Check: `data/features.geojson` существует и не пустой.
- PASS: Файл существует, валиден как JSON, содержит массив `features` и `features.length > 0`.
- FAIL: Файл отсутствует, невалиден, `features` не массив или массив пустой.

- [ ] Check: `data/export_meta.json` согласован с `data/features.geojson`.
- PASS: `export_meta.json` существует, содержит целочисленный `records_exported`, и `records_exported == len(features.geojson.features)`.
- FAIL: Файл отсутствует, нет `records_exported`, тип не `int`, либо счётчики не совпадают.

- [ ] Check: `data/rejected.json` существует.
- PASS: Файл присутствует в `data/`.
- FAIL: Файл отсутствует.

## 2. Backend

- [ ] Check: `app.main` импортируется.
- PASS: Импорт `app.main` выполняется без ошибки.
- FAIL: Любая ошибка импорта `app.main`.

- [ ] Check: `app.main:app` создан.
- PASS: В модуле `app.main` присутствует объект `app`.
- FAIL: Объект `app` отсутствует.

## 3. Frontend

- [ ] Check: `js/data.js` существует и использует canonical data source (`/data/*` или `data/*`).
- PASS: Файл `js/data.js` присутствует и содержит ссылку на canonical data source.
- FAIL: Файл отсутствует или в нём нет ссылки на canonical data source.

- [ ] Check: Нет fallback/substitution с canonical data source на `/api/map/feed`.
- PASS: Упоминание `/api/map/feed` допускается как auxiliary route, но нет признаков fallback/substitution.
- FAIL: Обнаружены fallback/substitution паттерны (например, `fallbackToMapFeed`, `loadMapFeedOnError`, `retryWithRuntimeFeed`, либо подозрительные сочетания `/data/*` + fallback/error semantics + `/api/map/feed`).

## 4. PWA

- [ ] Check: `sw.js` существует.
- PASS: Файл `sw.js` присутствует.
- FAIL: Файл `sw.js` отсутствует.

- [ ] Check: Service Worker не кэширует auth/private.
- PASS: `sw.js` содержит явный network-only bypass для private/auth-запросов (например, `isPrivateApiRequest -> event.respondWith(fetch(request)); return;`) и не содержит явного `cache.put` для private/auth route.
- FAIL: В `sw.js` нет явного bypass для private/auth-запросов либо найдены признаки их cache eligibility.

## 5. Governance

- [ ] Check: `scripts/export_airtable.py` существует.
- PASS: Файл `scripts/export_airtable.py` присутствует.
- FAIL: Файл отсутствует.

- [ ] Check: Public publish boundary зафиксирован как batch overwrite через ETL/export workflow.
- PASS: Runtime/UI/backend path не является direct public publish path; canonical public dataset публикуется только batch overwrite через ETL/export workflow.
- FAIL: Найдены признаки direct public publish из runtime/UI/backend path.

- [ ] Check: В runtime-коде нет прямого `publish(` вне moderation.
- PASS: В `app/` и `js/` отсутствует `publish(` за пределами moderation-слоя (исключая moderation review/staging semantics).
- FAIL: Найден `publish(` вне moderation-слоя.

## 6. Release Gate

- [ ] Check: Все проверки разделов 1–5 пройдены.
- PASS: Каждая проверка завершилась PASS; итоговый exit code = `0`.
- FAIL: Любая проверка завершилась FAIL; итоговый exit code = `1`.
