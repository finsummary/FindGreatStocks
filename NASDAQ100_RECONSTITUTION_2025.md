# NASDAQ 100 Reconstitution 2025

## Дата вступления в силу
**Monday, December 22, 2025** (перед открытием рынка)

## Компании для добавления (6)
- **ALNY** - Alnylam Pharmaceuticals, Inc.
- **FER** - Ferrovial SE
- **INSM** - Insmed Inc.
- **MPWR** - Monolithic Power Systems, Inc.
- **STX** - Seagate Technology Holdings plc
- **WDC** - Western Digital Corp.

## Компании для удаления (6)
- **BIIB** - Biogen Inc.
- **CDW** - CDW Corporation
- **GFS** - GlobalFoundries Inc.
- **LULU** - Lululemon Athletica Inc.
- **ON** - ON Semiconductor Corporation
- **TTD** - The Trade Desk, Inc.

## Процесс выполнения

### Вариант 1: Автоматический (рекомендуется)

Запустите скрипт, который автоматически выполнит все шаги:

```bash
node call-nasdaq100-update.js
```

Этот скрипт:
1. Удалит 6 компаний из NASDAQ 100
2. Добавит 6 новых компаний в таблицу
3. Заполнит все финансовые данные для новых компаний (11 шагов)

### Вариант 2: Ручной (по шагам)

#### Шаг 1: Удаление компаний

```bash
node call-index-manage.js remove nasdaq100 BIIB,CDW,GFS,LULU,ON,TTD
```

Или через API:
```javascript
POST /api/index/manage
{
  "action": "remove",
  "index": "nasdaq100",
  "symbols": ["BIIB", "CDW", "GFS", "LULU", "ON", "TTD"]
}
```

#### Шаг 2: Добавление и заполнение данных для новых компаний

```bash
# Через API endpoint (автоматически)
# Скрипт уже настроен на добавление ALNY, FER, INSM, MPWR, STX, WDC
```

Или через API:
```javascript
POST /api/nasdaq100/populate-new-companies-auto
```

## Что заполняется автоматически

Для каждой новой компании выполняется 11-шаговый процесс:

1. **Base Metrics** - Цена, рыночная капитализация, объемы торгов
2. **Financial Data** - Отчет о прибылях и убытках, баланс, денежный поток
3. **Returns and Drawdowns** - Доходность и максимальные просадки за 3/5/10 лет
4. **DuPont Metrics** - ROE, Asset Turnover, Financial Leverage, DuPont ROE
5. **Calculated Metrics** - Price-to-Sales, Net Profit Margin
6. **ROIC** - Текущий ROIC
7. **FCF Margin and History** - История FCF margin за 10 лет
8. **ROIC 10Y History** - История ROIC за 10 лет, среднее, стандартное отклонение, стабильность
9. **Debt and Cash Flow Metrics** - Debt-to-Equity, Interest Coverage, Cash Flow to Debt
10. **Current FCF Margin** - Текущий FCF margin
11. **DCF Metrics** - DCF Enterprise Value, Margin of Safety, DCF Implied Growth

## Проверка результатов

После выполнения скрипта проверьте следующие layouts для новых компаний:

1. **Compounders (ROIC)** - ROIC, ROIC 10Y Avg, ROIC 10Y Std, ROIC Stability, ROIC Stability Score, ROIC History
2. **Cashflow & Leverage** - Free Cash Flow, FCF Margin, FCF Margin Median 10Y, Debt-to-Equity, Interest Coverage, Cash Flow to Debt
3. **DuPont ROE** - Asset Turnover, Financial Leverage, ROE, DuPont ROE
4. **Return on Risk** - Return 3Y/5Y/10Y, Max Drawdown 3Y/5Y/10Y, AR/MDD Ratio 3Y/5Y/10Y
5. **DCF Valuation** - DCF Enterprise Value, Margin of Safety
6. **Reverse DCF** - DCF Implied Growth, DCF Verdict

## Мониторинг

- **Railway Logs**: Проверьте логи Railway для отслеживания прогресса
- **Время выполнения**: ~5-10 минут на компанию (зависит от API rate limits)
- **Общее время**: ~30-60 минут для всех 6 компаний

## Важные замечания

1. Скрипт автоматически проверяет существование компаний перед добавлением
2. Если компания уже существует, данные будут обновлены
3. Процесс выполняется в фоновом режиме через API
4. Все ошибки логируются в Railway logs

