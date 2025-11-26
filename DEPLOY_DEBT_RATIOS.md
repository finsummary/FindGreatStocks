# Инструкция: Добавление Debt-to-Equity и Interest Coverage

## Что было добавлено

- ✅ Колонки `debt_to_equity` и `interest_coverage` в базу данных (все таблицы)
- ✅ Backend endpoints для получения данных из FMP API
- ✅ Колонки в Compounders layout с цветовой индикацией
- ✅ Tooltips с объяснением метрик

## Шаг 1: Добавление колонок в Supabase

1. Откройте Supabase → SQL Editor
2. Скопируйте содержимое файла `migrations/add-debt-ratios-columns.sql`
3. Вставьте и выполните SQL скрипт

## Шаг 2: Деплой

После добавления колонок в Supabase, изменения автоматически задеплоятся:
- Vercel (frontend) - автоматически после push в Git
- Railway (backend) - автоматически после push в Git

## Шаг 3: Заполнение данных

### Тестовый пересчёт (для нескольких компаний)

В консоли браузера (F12 → Console):

```
(async () => {
  const k = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  const s = JSON.parse(localStorage.getItem(k));
  const t = s?.access_token || s?.currentSession?.access_token;
  
  const res = await fetch('/api/metrics/recompute-debt-ratios?symbols=AAPL,MSFT,GOOGL', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${t}` }
  });
  const json = await res.json();
  console.log('Результат:', json);
})();
```

### Массовый пересчёт (для всех компаний)

Используйте batch endpoint для обработки порциями:

```
(async () => {
  const k = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  const s = JSON.parse(localStorage.getItem(k));
  const t = s?.access_token || s?.currentSession?.access_token;
  
  let offset = 0;
  const limit = 50;
  let totalProcessed = 0;
  
  const processBatch = async (off) => {
    const url = `/api/metrics/recompute-debt-ratios-batch?offset=${off}&limit=${limit}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${t}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  };
  
  console.log('🚀 Начинаем массовый пересчёт Debt-to-Equity и Interest Coverage...');
  
  while (true) {
    try {
      const result = await processBatch(offset);
      const success = result.results?.filter(r => r.updated).length || 0;
      totalProcessed += success;
      
      console.log(`✅ Батч ${Math.floor(offset/limit) + 1}: обработано ${success}. Прогресс: ${result.progress}%`);
      
      if (!result.hasMore) {
        console.log(`🎉 Завершено! Всего обработано: ${totalProcessed}`);
        break;
      }
      
      offset = result.nextOffset;
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`❌ Ошибка:`, e);
      offset += limit;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
})();
```

## Шаг 4: Проверка

1. Откройте https://findgreatstocks.com
2. Выберите датасет (S&P 500, Dow Jones и т.д.)
3. Нажмите **"Choose Layout"** → **"Compounders (ROIC, FCF)"**
4. Найдите новые колонки:
   - **Debt-to-Equity** (зеленый <0.5, желтый 0.5-1.0, красный >1.0)
   - **Interest Coverage** (зеленый ≥5, желтый 2-5, красный <2)

## Backend Endpoints

- `/api/metrics/recompute-debt-ratios?symbols=SYM1,SYM2` - для отдельных символов
- `/api/metrics/recompute-debt-ratios-batch?offset=0&limit=50` - для порционной обработки

## Цветовая индикация

### Debt-to-Equity:
- 🟢 Зеленый: < 0.5 (низкий долг, хорошо)
- 🟡 Желтый: 0.5 - 1.0 (умеренный долг)
- 🔴 Красный: > 1.0 (высокий долг, плохо)

### Interest Coverage:
- 🟢 Зеленый: ≥ 5 (отличное покрытие)
- 🟡 Желтый: 2 - 5 (удовлетворительное покрытие)
- 🔴 Красный: < 2 (слабое покрытие, рискованно)

