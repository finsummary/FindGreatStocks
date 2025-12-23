# Стандартизированный процесс добавления новых компаний в индексы

## Проблема
Добавление новых компаний в индексы (S&P 500, NASDAQ 100, Dow Jones, FTSE 100) было сложным и нестандартизированным процессом, что приводило к ошибкам и отсутствующим данным.

## Решение
Создан стандартизированный скрипт `server/populate-new-sp500-companies.ts`, который автоматически заполняет все необходимые данные в правильном порядке.

## Процесс заполнения данных (11 шагов)

1. **Base Metrics** - Цена, рыночная капитализация, объемы торгов
2. **Financial Data** - Отчет о прибылях и убытках, баланс, денежный поток
3. **Returns and Drawdowns** - Доходность и максимальные просадки за 3/5/10 лет
4. **DuPont Metrics** - ROE, Asset Turnover, Financial Leverage, DuPont ROE
5. **Calculated Metrics** - Price-to-Sales, Net Profit Margin
6. **ROIC** - Текущий ROIC (хранится как десятичное число: 0.15 для 15%)
7. **FCF Margin and History** - История FCF margin за 10 лет
8. **ROIC 10Y History** - История ROIC за 10 лет, среднее, стандартное отклонение, стабильность
9. **Debt and Cash Flow Metrics** - Debt-to-Equity, Interest Coverage, Cash Flow to Debt
10. **Current FCF Margin** - Текущий FCF margin
11. **DCF Metrics** - DCF Enterprise Value, Margin of Safety, DCF Implied Growth (должно быть последним, требует latest_fcf и revenue_growth_10y)

## Использование

### Для S&P 500 компаний:

1. **Обновите список символов** в `server/populate-new-sp500-companies.ts`:
   ```typescript
   const SYMBOLS = ['CVNA', 'CRH', 'FIX']; // Добавьте новые тикеры
   ```

2. **Выполните миграцию базы данных** (если нужно):
   - Откройте Supabase SQL Editor
   - Выполните SQL из `migrations/add-roic-stability-fcf-margin-columns.sql` (если еще не выполнено)

3. **Запустите скрипт**:
   ```bash
   # Локально
   tsx server/populate-new-sp500-companies.ts
   
   # Или через API endpoint (автоматически на Railway)
   node call-populate-endpoint.js
   ```

### Для других индексов:

Создайте аналогичный скрипт или используйте универсальный `server/populate-new-index-companies.ts` (в разработке).

## Важные исправления

### 1. ROIC хранится как десятичное число
- **Было**: `roic = (operatingIncome / investedCapital) * 100;` → хранилось как 15.0 для 15%
- **Стало**: `roic = operatingIncome / investedCapital;` → хранится как 0.15 для 15%
- UI умножает на 100 для отображения

### 2. DCF метрики вычисляются в конце
- **Было**: DCF вызывался сразу после base metrics, до заполнения latest_fcf и revenue_growth_10y
- **Стало**: DCF вызывается последним, после всех финансовых данных

### 3. DuPont ROE вычисляется правильно
- Добавлен расчет: `dupontRoe = netProfitMargin × assetTurnover × financialLeverage`

### 4. Исправлен символ CRH
- **Было**: 'CHR' (неправильно)
- **Стало**: 'CRH' (правильно - CRH plc)

## Проверка результатов

После выполнения скрипта проверьте следующие layouts:

1. **Compounders (ROIC)** - должны быть заполнены:
   - ROIC, ROIC 10Y Avg, ROIC 10Y Std, ROIC Stability, ROIC Stability Score, ROIC History

2. **Cashflow & Leverage** - должны быть заполнены:
   - Free Cash Flow, FCF Margin, FCF Margin Median 10Y, FCF Margin History
   - Debt-to-Equity, Interest Coverage, Cash Flow to Debt

3. **DuPont ROE** - должны быть заполнены:
   - Asset Turnover, Financial Leverage, ROE, DuPont ROE

4. **Return on Risk** - должны быть заполнены:
   - Return 3Y/5Y/10Y, Max Drawdown 3Y/5Y/10Y, AR/MDD Ratio 3Y/5Y/10Y

5. **DCF Valuation** - должны быть заполнены:
   - DCF Enterprise Value, Margin of Safety

6. **Reverse DCF** - должны быть заполнены:
   - DCF Implied Growth, DCF Verdict

## Автоматизация

Скрипт можно автоматизировать через API endpoint:
- `POST /api/sp500/populate-new-companies-auto`
- Endpoint запускает скрипт в фоновом режиме
- Можно вызвать через `node call-populate-endpoint.js`

## Будущие улучшения

1. Создать универсальный скрипт для всех индексов
2. Добавить валидацию данных перед сохранением
3. Добавить логирование ошибок в отдельную таблицу
4. Создать dashboard для мониторинга процесса заполнения

