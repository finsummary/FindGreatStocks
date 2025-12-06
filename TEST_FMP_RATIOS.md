# Инструкция: Проверка доступности Debt-to-Equity и Interest Coverage в FMP API

## Шаг 1: Дождитесь деплоя Railway

После того, как Railway задеплоит последние изменения (обычно 1-2 минуты), можно запускать тест.

## Шаг 2: Откройте консоль браузера

1. Откройте https://findgreatstocks.com
2. Убедитесь, что вы залогинены с admin email
3. Откройте DevTools (F12) → вкладка **"Console"**

## Шаг 3: Запустите тест

Вставьте и выполните следующий код (скопируйте только содержимое, без ```javascript и ```):

```javascript
(async () => {
  const k = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  const s = JSON.parse(localStorage.getItem(k));
  const t = s?.access_token || s?.currentSession?.access_token;
  
  console.log('🔍 Проверка доступных полей в FMP API для Debt-to-Equity и Interest Coverage...');
  console.log('📊 Проверяю тикер: AAPL');
  
  const res = await fetch('/api/test/fmp-ratios?symbol=AAPL', {
    headers: { 'Authorization': `Bearer ${t}` }
  });
  
  if (!res.ok) {
    console.error('❌ Ошибка:', res.status, res.statusText);
    const text = await res.text();
    console.error('Ответ:', text);
    return;
  }
  
  const json = await res.json();
  console.log('✅ Результат проверки FMP API:');
  console.log(JSON.stringify(json, null, 2));
  
  // Краткая сводка
  console.log('\n📋 Краткая сводка:');
  
  if (json.results?.ratios?.fields?.length > 0) {
    console.log('✅ В /ratios найдены релевантные поля:', json.results.ratios.fields.map(f => f.key).join(', '));
  }
  
  if (json.results?.ratiosTTM?.fields?.length > 0) {
    console.log('✅ В /ratios-ttm найдены релевантные поля:', json.results.ratiosTTM.fields.map(f => f.key).join(', '));
  }
  
  if (json.results?.keyMetrics?.fields?.length > 0) {
    console.log('✅ В /key-metrics найдены релевантные поля:', json.results.keyMetrics.fields.map(f => f.key).join(', '));
  }
  
  if (json.results?.balanceSheet?.fields?.length > 0) {
    console.log('✅ В /balance-sheet-statement найдены релевантные поля:', json.results.balanceSheet.fields.map(f => f.key).join(', '));
  }
  
  if (json.results?.incomeStatement?.fields?.length > 0) {
    console.log('✅ В /income-statement найдены релевантные поля:', json.results.incomeStatement.fields.map(f => f.key).join(', '));
  }
})();
```

## Шаг 4: Проверьте результаты

Endpoint проверит следующие endpoints FMP API:

1. **`/ratios/{symbol}`** — финансовые коэффициенты (годовые)
2. **`/ratios-ttm/{symbol}`** — коэффициенты TTM (Trailing Twelve Months)
3. **`/key-metrics/{symbol}`** — ключевые метрики
4. **`/balance-sheet-statement/{symbol}`** — балансовый отчет (для расчета Debt-to-Equity)
5. **`/income-statement/{symbol}`** — отчет о прибылях (для расчета Interest Coverage)

## Что искать в результатах

### Для Debt-to-Equity Ratio:
- Готовый коэффициент: `debtToEquity`, `debtEquityRatio`, `debtEquity` и т.д.
- Или компоненты для расчета: `totalDebt`, `totalEquity`, `stockholdersEquity`

### Для Interest Coverage Ratio:
- Готовый коэффициент: `interestCoverage`, `interestCoverageRatio`, `timesInterestEarned` и т.д.
- Или компоненты для расчета: `ebit`, `operatingIncome`, `interestExpense`

## Что делать после проверки

После получения результатов отправьте мне:
1. Какие поля доступны в каждом endpoint
2. Есть ли готовые коэффициенты Debt-to-Equity и Interest Coverage
3. Или нужно вычислять их вручную из баланса/отчета о прибылях

На основе этого я определю, как лучше добавить эти метрики в ваш проект.


