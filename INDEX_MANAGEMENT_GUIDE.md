# Руководство по управлению индексами

## Обзор

Эта система позволяет добавлять и удалять компании из любых индексов (S&P 500, NASDAQ 100, Dow Jones, FTSE 100) стандартизированным способом.

**ВАЖНО:** В настоящее время полностью реализован только процесс для S&P 500. Для других индексов используется тот же процесс, но нужно адаптировать `populate-new-sp500-companies.ts` для работы с другими таблицами.

## Доступные индексы

- `sp500` - S&P 500
- `nasdaq100` - NASDAQ 100
- `dowjones` - Dow Jones
- `ftse100` - FTSE 100

## Использование через API

### Добавление компаний в индекс

```bash
POST /api/index/manage
Content-Type: application/json

{
  "action": "add",
  "index": "nasdaq100",
  "symbols": ["AAPL", "MSFT", "GOOGL"]
}
```

### Удаление компаний из индекса

```bash
POST /api/index/manage
Content-Type: application/json

{
  "action": "remove",
  "index": "nasdaq100",
  "symbols": ["OLD1", "OLD2"]
}
```

## Процесс добавления (11 шагов)

При добавлении компании автоматически выполняется следующий процесс:

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

## Текущий статус реализации

- ✅ **S&P 500**: Полностью реализован (используйте `populate-new-sp500-companies.ts`)
- ⚠️ **NASDAQ 100**: Базовая структура готова, нужна адаптация функций populate
- ⚠️ **Dow Jones**: Базовая структура готова, нужна адаптация функций populate
- ⚠️ **FTSE 100**: Базовая структура готова, нужна адаптация функций populate

## Примеры использования

### Добавление компаний в NASDAQ 100 (после полной реализации)

```javascript
// Через fetch
const response = await fetch('https://your-railway-app.railway.app/api/index/manage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'add',
    index: 'nasdaq100',
    symbols: ['NEW1', 'NEW2', 'NEW3']
  })
});
```

### Временное решение для NASDAQ 100

Пока полная реализация не готова, можно использовать процесс для S&P 500 как шаблон:

1. Скопируйте `server/populate-new-sp500-companies.ts` в `server/populate-new-nasdaq100-companies.ts`
2. Замените все `'sp500_companies'` на `'nasdaq100_companies'`
3. Замените `schema.sp500Companies` на `schema.nasdaq100Companies`
4. Обновите `SYMBOLS` массив
5. Создайте аналогичный API endpoint в `routes.js`

### Удаление компаний из NASDAQ 100

```javascript
const response = await fetch('https://your-railway-app.railway.app/api/index/manage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'remove',
    index: 'nasdaq100',
    symbols: ['OLD1', 'OLD2']
  })
});
```

## Проверка результатов

После добавления компаний проверьте следующие layouts:

1. **Compounders (ROIC)** - ROIC, ROIC 10Y Avg, ROIC 10Y Std, ROIC Stability, ROIC Stability Score, ROIC History
2. **Cashflow & Leverage** - Free Cash Flow, FCF Margin, FCF Margin Median 10Y, Debt-to-Equity, Interest Coverage, Cash Flow to Debt
3. **DuPont ROE** - Asset Turnover, Financial Leverage, ROE, DuPont ROE
4. **Return on Risk** - Return 3Y/5Y/10Y, Max Drawdown 3Y/5Y/10Y, AR/MDD Ratio 3Y/5Y/10Y
5. **DCF Valuation** - DCF Enterprise Value, Margin of Safety
6. **Reverse DCF** - DCF Implied Growth, DCF Verdict

## Важные замечания

1. **ROIC хранится как десятичное число** (0.15 для 15%)
2. **DCF метрики вычисляются последними** (требуют latest_fcf и revenue_growth_10y)
3. **Процесс может занять несколько минут** для каждой компании
4. **API возвращает статус "started"** - процесс выполняется в фоновом режиме
5. **Проверяйте логи Railway** для отслеживания прогресса

## Автоматизация

Процесс можно автоматизировать через скрипт:

```javascript
// call-index-manage.js
const RAILWAY_URL = 'https://findgreatstocks-production.up.railway.app';
const ENDPOINT = `${RAILWAY_URL}/api/index/manage`;

async function manageIndex(action, index, symbols) {
  console.log(`🚀 ${action === 'add' ? 'Adding' : 'Removing'} companies to/from ${index}...`);
  console.log(`📡 Symbols: ${symbols.join(', ')}\n`);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, index, symbols }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success!', JSON.stringify(data, null, 2));
      console.log('💡 Check Railway logs for progress...');
    } else {
      console.error(`❌ Error: ${response.status}`);
      const errorText = await response.text();
      console.error('Response:', errorText);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Использование:
// manageIndex('add', 'nasdaq100', ['AAPL', 'MSFT']);
// manageIndex('remove', 'nasdaq100', ['OLD1', 'OLD2']);
```

