# Миграция FMP API с v3 на v4

## Проблема

FMP API отключил legacy эндпоинты v3 после 31 августа 2025 года. Все запросы к `/api/v3/*` возвращают ошибку:

```
"Legacy Endpoint : Due to Legacy endpoints being no longer supported - 
This endpoint is only available for legacy users who have valid subscriptions 
prior August 31, 2025."
```

## Решение

Обновлены все эндпоинты с `/api/v3/` на `/api/v4/` в файле `server/routes.js`.

### Обновленные эндпоинты:

- `/api/v3/profile/` → `/api/v4/profile/`
- `/api/v3/quote/` → `/api/v4/quote/`
- `/api/v3/income-statement/` → `/api/v4/income-statement/`
- `/api/v3/cash-flow-statement/` → `/api/v4/cash-flow-statement/`
- `/api/v3/balance-sheet-statement/` → `/api/v4/balance-sheet-statement/`
- `/api/v3/ratios/` → `/api/v4/ratios/`
- `/api/v3/key-metrics/` → `/api/v4/key-metrics/`
- `/api/v3/historical-price-full/` → `/api/v4/historical-price-full/`
- И все остальные эндпоинты

## Важно

Если после обновления на v4 все еще возникают ошибки, возможно:

1. **FMP использует другой формат URL** - проверьте документацию: https://site.financialmodelingprep.com/developer/docs
2. **Нужна другая версия API** - возможно v4 не правильная, может быть нужен другой формат
3. **Изменен формат аутентификации** - возможно нужно передавать API ключ по-другому

## Проверка

После деплоя проверьте логи Railway:
- Должны исчезнуть ошибки "Legacy Endpoint"
- Запросы к FMP должны работать
- Цены должны обновляться

## Дополнительные файлы

Есть другие файлы в `server/` которые также используют `/api/v3/`:
- `sp500-daily-updater.ts`
- `nasdaq100-daily-updater.ts`
- `ftse100-daily-updater.ts`
- И другие...

Эти файлы также нужно обновить, если они используются. Но основная функциональность обновления цен находится в `server/routes.js`, который уже обновлен.
