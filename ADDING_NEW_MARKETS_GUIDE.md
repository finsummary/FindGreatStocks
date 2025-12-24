# Систематическая процедура добавления новых рынков/индексов

## Обзор

Этот документ описывает пошаговый процесс добавления нового рынка/индекса на сайт (например, FTSE 100, S&P 400 Mid Cap, CAC 40, DAX 40 и т.д.).

**Время выполнения:** ~2-4 часа для полной интеграции нового индекса

---

## Шаг 1: Подготовка данных об индексе

### 1.1 Соберите информацию:
- **Название индекса:** Например, "FTSE 100", "S&P 400 Mid Cap", "CAC 40"
- **Код индекса (для API):** Например, `ftse100`, `spmid400`, `cac40`
- **Название таблицы в БД:** Например, `ftse100_companies`, `sp400_companies`, `cac40_companies`
- **FMP API endpoint (если есть):** Проверьте, есть ли в FMP API endpoint для получения списка компаний индекса
- **Список компаний:** Получите список всех компаний индекса с их символами

### 1.2 Определите naming convention:
- **Table name:** `{index_code}_companies` (snake_case, lowercase)
- **Schema name:** `{IndexCode}Companies` (PascalCase)
- **API endpoint:** `/api/{index_code}` (lowercase)
- **UI dataset code:** `{index_code}` (lowercase)

**Примеры:**
- FTSE 100: `ftse100_companies`, `ftse100Companies`, `/api/ftse100`, `ftse100`
- S&P 400: `sp400_companies`, `sp400Companies`, `/api/sp400`, `sp400`
- CAC 40: `cac40_companies`, `cac40Companies`, `/api/cac40`, `cac40`

---

## Шаг 2: Создание таблицы в базе данных

### 2.1 Создайте SQL миграцию

Создайте файл: `migrations/add-{index_code}-table.sql`

**Шаблон:**
```sql
-- Migration: Add {Index Name} table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS {table_name} (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL UNIQUE,
  market_cap NUMERIC(20, 2),
  price NUMERIC(10, 2),
  daily_change NUMERIC(10, 2),
  daily_change_percent NUMERIC(5, 2),
  country TEXT,
  country_code TEXT,
  rank INTEGER,
  logo_url TEXT,
  industry TEXT,
  sector TEXT,
  website TEXT,
  description TEXT,
  ceo TEXT,
  employees INTEGER,
  pe_ratio NUMERIC(10, 2),
  eps NUMERIC(10, 2),
  beta NUMERIC(8, 4),
  dividend_yield NUMERIC(8, 4),
  price_to_sales_ratio NUMERIC(10, 2),
  net_profit_margin NUMERIC(8, 4),
  volume NUMERIC(20, 0),
  avg_volume NUMERIC(20, 0),
  day_low NUMERIC(10, 2),
  day_high NUMERIC(10, 2),
  year_low NUMERIC(10, 2),
  year_high NUMERIC(10, 2),
  revenue NUMERIC(20, 0),
  gross_profit NUMERIC(20, 0),
  operating_income NUMERIC(20, 0),
  net_income NUMERIC(20, 0),
  total_assets NUMERIC(20, 0),
  total_debt NUMERIC(20, 0),
  cash_and_equivalents NUMERIC(20, 0),
  return_3_year NUMERIC(8, 2),
  return_5_year NUMERIC(8, 2),
  return_10_year NUMERIC(8, 2),
  max_drawdown_10_year NUMERIC(8, 2),
  max_drawdown_5_year NUMERIC(8, 2),
  max_drawdown_3_year NUMERIC(8, 2),
  ar_mdd_ratio_3_year NUMERIC(10, 4),
  ar_mdd_ratio_5_year NUMERIC(10, 4),
  ar_mdd_ratio_10_year NUMERIC(10, 4),
  revenue_growth_3y NUMERIC(8, 2),
  revenue_growth_5y NUMERIC(8, 2),
  revenue_growth_10y NUMERIC(8, 2),
  free_cash_flow NUMERIC(20, 0),
  latest_fcf NUMERIC(20, 0),
  margin_of_safety NUMERIC(10, 4),
  dcf_implied_growth NUMERIC(10, 4),
  dcf_enterprise_value NUMERIC(20, 0),
  total_equity NUMERIC(20, 0),
  asset_turnover NUMERIC(10, 4),
  financial_leverage NUMERIC(10, 4),
  dupont_roe NUMERIC(10, 4),
  roe NUMERIC(10, 4),
  roic NUMERIC(10, 4),
  roic_10y_avg NUMERIC(10, 4),
  roic_10y_std NUMERIC(10, 4),
  roic_stability NUMERIC(10, 4),
  roic_stability_score NUMERIC(10, 2),
  roic_y1 NUMERIC(10, 4),
  roic_y2 NUMERIC(10, 4),
  roic_y3 NUMERIC(10, 4),
  roic_y4 NUMERIC(10, 4),
  roic_y5 NUMERIC(10, 4),
  roic_y6 NUMERIC(10, 4),
  roic_y7 NUMERIC(10, 4),
  roic_y8 NUMERIC(10, 4),
  roic_y9 NUMERIC(10, 4),
  roic_y10 NUMERIC(10, 4),
  revenue_y1 NUMERIC(20, 0),
  revenue_y2 NUMERIC(20, 0),
  revenue_y3 NUMERIC(20, 0),
  revenue_y4 NUMERIC(20, 0),
  revenue_y5 NUMERIC(20, 0),
  revenue_y6 NUMERIC(20, 0),
  revenue_y7 NUMERIC(20, 0),
  revenue_y8 NUMERIC(20, 0),
  revenue_y9 NUMERIC(20, 0),
  revenue_y10 NUMERIC(20, 0),
  fcf_y1 NUMERIC(20, 0),
  fcf_y2 NUMERIC(20, 0),
  fcf_y3 NUMERIC(20, 0),
  fcf_y4 NUMERIC(20, 0),
  fcf_y5 NUMERIC(20, 0),
  fcf_y6 NUMERIC(20, 0),
  fcf_y7 NUMERIC(20, 0),
  fcf_y8 NUMERIC(20, 0),
  fcf_y9 NUMERIC(20, 0),
  fcf_y10 NUMERIC(20, 0),
  fcf_margin NUMERIC(10, 4),
  fcf_margin_median_10y NUMERIC(10, 4),
  debt_to_equity NUMERIC(10, 4),
  interest_coverage NUMERIC(10, 4),
  cash_flow_to_debt NUMERIC(10, 4),
  income_before_tax NUMERIC(20, 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS {table_name}_symbol_unique ON {table_name}(symbol);
CREATE INDEX IF NOT EXISTS {table_name}_market_cap_idx ON {table_name}(market_cap);
CREATE INDEX IF NOT EXISTS {table_name}_symbol_idx ON {table_name}(symbol);
```

### 2.2 Выполните миграцию в Supabase

1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Скопируйте и выполните SQL из миграции
4. Проверьте, что таблица создана

---

## Шаг 3: Обновление Drizzle Schema

### 3.1 Добавьте схему в `shared/schema.ts`

Скопируйте структуру из существующего индекса (например, `ftse100Companies`) и адаптируйте:

```typescript
export const {schemaName} = pgTable("{table_name}", {
  // ... все поля как в других индексах
}, (table) => ({
  {schemaName}SymbolUnique: unique("{table_name}_symbol_unique").on(table.symbol),
}));
```

**Пример для S&P 400:**
```typescript
export const sp400Companies = pgTable("sp400_companies", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  symbol: text().notNull(),
  // ... все остальные поля
}, (table) => ({
  sp400CompaniesSymbolUnique: unique("sp400_companies_symbol_unique").on(table.symbol),
}));
```

### 3.2 Экспортируйте схему

Убедитесь, что схема экспортирована в конце файла (если используется экспорт по умолчанию).

---

## Шаг 4: Создание API Endpoints

### 4.1 Добавьте GET endpoint в `server/routes.js`

Найдите секцию с другими индексами и добавьте:

```javascript
app.get('/api/{index_code}', (req, res) => listFromTable('{table_name}', req, res));
```

**Пример:**
```javascript
app.get('/api/sp400', (req, res) => listFromTable('sp400_companies', req, res));
```

### 4.2 Добавьте endpoint для управления (опционально)

Если нужны endpoints для добавления/удаления компаний:

```javascript
// Auto endpoint для заполнения данных новых компаний
app.post('/api/{index_code}/populate-new-companies-auto', async (_req, res) => {
  try {
    console.log(`🚀 Auto-populating data for new {Index Name} companies...`);
    await import('tsx/esm');
    import('./populate-new-{index_code}-companies.ts')
      .then(mod => {
        mod.populateNew{IndexCode}Companies()
          .then(() => console.log('✅ Auto-population completed'))
          .catch(e => console.error('❌ Auto-population error:', e));
      })
      .catch(e => console.error('populate-new-{index_code}-companies async error:', e));
    return res.json({ status: 'started', message: 'Started populating data for new {Index Name} companies' });
  } catch (e) {
    console.error('populate-new-{index_code}-companies error:', e);
    return res.status(500).json({ message: 'Failed to populate new {Index Name} companies data', error: e.message });
  }
});

// Auto endpoint для удаления компаний
app.post('/api/{index_code}/remove-companies-auto', async (req, res) => {
  try {
    const { symbols } = req.body;
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Symbols array is required' });
    }

    console.log(`🗑️ Auto-removing companies from {Index Name}: ${symbols.join(', ')}`);

    for (const symbol of symbols) {
      const { error } = await supabase
        .from('{table_name}')
        .delete()
        .eq('symbol', symbol);

      if (error) {
        console.error(`❌ Error removing ${symbol}:`, error);
      } else {
        console.log(`✅ Removed ${symbol} from {Index Name}`);
      }
    }

    return res.json({ status: 'completed', message: `Removed ${symbols.length} companies from {Index Name}` });
  } catch (e) {
    console.error('{index_code} remove-companies-auto error:', e);
    return res.status(500).json({ message: 'Failed to remove companies', error: e.message });
  }
});
```

### 4.3 Обновите `listFromTable` для поддержки нового индекса

Проверьте, что функция `listFromTable` в `server/routes.js` поддерживает новую таблицу. Обычно она универсальна и работает с любой таблицей.

---

## Шаг 5: Обновление UI (Frontend)

### 5.1 Добавьте тип в `client-app/src/types/index.ts`

Найдите определение типов и добавьте новый индекс:

```typescript
export type DatasetType = 
  | 'sp500' 
  | 'nasdaq100' 
  | 'dowjones' 
  | 'watchlist'
  | 'ftse100'
  | '{index_code}'; // Добавьте новый индекс
```

### 5.2 Обновите `CompanyTable` component

В `client-app/src/components/company-table.tsx`:

**5.2.1 Добавьте в интерфейс `CompanyTableProps`:**
```typescript
interface CompanyTableProps {
  searchQuery: string;
  dataset:
    | 'sp500' | 'nasdaq100' | 'dowjones' | 'watchlist'
    | 'ftse100' | '{index_code}'; // Добавьте новый индекс
  activeTab:
    | 'sp500' | 'nasdaq100' | 'dowjones' | 'watchlist'
    | 'ftse100' | '{index_code}'; // Добавьте новый индекс
  watchlistId?: number;
}
```

**5.2.2 Добавьте API endpoint mapping:**

Найдите секцию с `apiEndpoint` и добавьте:

```typescript
let apiEndpoint;
switch (dataset) {
  case 'sp500':
    apiEndpoint = `${API_BASE}/api/sp500`;
    break;
  case 'nasdaq100':
    apiEndpoint = `${API_BASE}/api/nasdaq100`;
    break;
  case 'dowjones':
    apiEndpoint = `${API_BASE}/api/dowjones`;
    break;
  case '{index_code}':
    apiEndpoint = `${API_BASE}/api/{index_code}`;
    break;
  // ... остальные
}
```

**5.2.3 Добавьте fallback для прямого запроса к Supabase (если нужно):**

Найдите секцию с FTSE 100 fallback и добавьте аналогичную для нового индекса:

```typescript
// Client-side fallback for {Index Name} while server endpoint may be unavailable
if (url === '/api/{index_code}') {
  // Build Supabase filter and pagination
  const offsetNum = Number(params.get('offset') || 0);
  const limitNum = Number(params.get('limit') || 50);
  let supa = supabase.from('{table_name}').select('*', { count: 'exact' });
  if (search) {
    supa = supa.or(`name.ilike.%${search}%,symbol.ilike.%${search}%`);
  }
  const { data: rows, error: err } = await supabase
    .from('{table_name}')
    .select('*')
    .range(offsetNum, offsetNum + limitNum - 1)
    .or(search ? `name.ilike.%${search}%,symbol.ilike.%${search}%` : undefined as any);
  if (err) throw err;
  // ... mapping и возврат данных
}
```

### 5.3 Добавьте вкладку в навигацию

В `client-app/src/pages/home.tsx`:

**5.3.1 Добавьте кнопку вкладки:**

Найдите секцию с кнопками вкладок и добавьте:

```typescript
<Button
  variant={activeTab === '{index_code}' ? 'secondary' : 'outline'}
  onClick={() => { 
    setActiveTab('{index_code}'); 
    try { 
      (window as any).phCapture?.('dataset_selected', { dataset: '{index_code}' }); 
    } catch {} 
  }}
  className={`font-semibold ${activeTab === '{index_code}' ? 'ring-2 ring-blue-500/50' : ''}`}
>
  {Index Name}
</Button>
```

**5.3.2 Добавьте условный рендеринг таблицы:**

Найдите секцию с `{activeTab === 'ftse100' && ...}` и добавьте:

```typescript
{activeTab === '{index_code}' && (
  <CompanyTable 
    searchQuery={searchQuery} 
    dataset="{index_code}" 
    activeTab={activeTab as any} 
  />
)}
```

### 5.4 Обновите типы в `App.tsx` (если нужно)

Если используется типизация для навигации, обновите соответствующие типы.

---

## Шаг 6: Создание скрипта для заполнения данных

### 6.1 Создайте скрипт на основе шаблона

Создайте файл: `server/populate-new-{index_code}-companies.ts`

**Используйте как шаблон:** `server/populate-new-nasdaq100-companies.ts`

**Ключевые изменения:**
1. Обновите `SYMBOLS` массив
2. Замените все `'nasdaq100_companies'` на `'{table_name}'`
3. Замените `schema.nasdaq100Companies` на `schema.{schemaName}`
4. Обновите название функции: `populateNew{IndexCode}Companies`

### 6.2 Создайте скрипт для управления индексом (опционально)

Создайте файл: `call-{index_code}-update.js`

**Используйте как шаблон:** `call-nasdaq100-update.js`

**Ключевые изменения:**
1. Обновите список компаний для добавления/удаления
2. Обновите `index: '{index_code}'` в API вызовах
3. Обновите endpoint URLs

---

## Шаг 7: Обновление системы управления индексами

### 7.1 Добавьте в `server/index-management.ts`

Найдите `INDEX_CONFIG` и добавьте:

```typescript
const INDEX_CONFIG: Record<string, { tableName: string; tableSchema: PgTable<any>; displayName: string }> = {
  // ... существующие индексы
  {index_code}: {
    tableName: '{table_name}',
    tableSchema: schema.{schemaName} as PgTable<any>,
    displayName: '{Index Name}',
  },
};
```

### 7.2 Обновите функцию `addCompaniesToIndex`

Добавьте обработку для нового индекса (если нужна специальная логика).

---

## Шаг 8: Создание daily updater (опционально)

### 8.1 Создайте daily updater скрипт

Создайте файл: `server/{index_code}-daily-updater.ts`

**Используйте как шаблон:** `server/nasdaq100-daily-updater.ts`

**Ключевые изменения:**
1. Замените все `'nasdaq100_companies'` на `'{table_name}'`
2. Замените `schema.nasdaq100Companies` на `schema.{schemaName}`
3. Обновите название функции

### 8.2 Интегрируйте в scheduler

В `server/scheduler.ts` добавьте вызов daily updater для нового индекса.

---

## Шаг 9: Импорт начальных данных

### 9.1 Создайте скрипт импорта

Создайте файл: `server/{index_code}-import.ts`

**Используйте как шаблон:** `server/nasdaq100-import.ts` или `server/ftse100-import.ts`

**Ключевые шаги:**
1. Получите список компаний из FMP API или другого источника
2. Создайте базовые записи в таблице
3. Запустите скрипт заполнения данных для всех компаний

### 9.2 Запустите импорт

```bash
tsx server/{index_code}-import.ts
```

Или создайте API endpoint для импорта (как для FTSE 100).

---

## Шаг 10: Тестирование

### 10.1 Проверьте API endpoint

```bash
curl http://localhost:5002/api/{index_code}
```

Или откройте в браузере: `http://localhost:5002/api/{index_code}?limit=10`

### 10.2 Проверьте UI

1. Запустите frontend: `npm run dev` (в папке `client-app`)
2. Откройте сайт
3. Проверьте, что новая вкладка отображается
4. Проверьте, что данные загружаются
5. Проверьте все layouts (Compounders, Cashflow & Leverage, DuPont ROE и т.д.)

### 10.3 Проверьте заполнение данных

Убедитесь, что все метрики заполняются:
- Base metrics (price, market cap)
- Financial data
- Returns and drawdowns
- DuPont metrics
- ROIC и ROIC history
- FCF margin и history
- DCF metrics

---

## Шаг 11: Документация

### 11.1 Обновите `INDEX_MANAGEMENT_GUIDE.md`

Добавьте новый индекс в список доступных индексов.

### 11.2 Создайте документацию для нового индекса (опционально)

Создайте файл: `{INDEX_NAME}_RECONSTITUTION.md` (если индекс периодически обновляется)

---

## Шаг 12: Деплой

### 12.1 Commit и push изменений

```bash
git add .
git commit -m "Add {Index Name} market support"
git push origin main
```

### 12.2 Проверьте деплой

- Railway автоматически задеплоит backend
- Vercel автоматически задеплоит frontend
- Проверьте логи на ошибки

---

## Чеклист для нового индекса

- [ ] SQL миграция создана и выполнена в Supabase
- [ ] Drizzle schema обновлена
- [ ] API GET endpoint добавлен (`/api/{index_code}`)
- [ ] API POST endpoints добавлены (populate, remove - если нужны)
- [ ] Типы TypeScript обновлены
- [ ] `CompanyTable` component обновлен
- [ ] Вкладка добавлена в навигацию (`home.tsx`)
- [ ] Скрипт заполнения данных создан
- [ ] Скрипт управления индексом создан (если нужен)
- [ ] Daily updater создан (если нужен)
- [ ] Скрипт импорта создан и выполнен
- [ ] `index-management.ts` обновлен
- [ ] Тестирование пройдено
- [ ] Документация обновлена
- [ ] Изменения закоммичены и запушены
- [ ] Деплой проверен

---

## Примеры для конкретных индексов

### S&P 400 Mid Cap

- **Table name:** `sp400_companies`
- **Schema name:** `sp400Companies`
- **API endpoint:** `/api/sp400`
- **UI code:** `sp400`
- **FMP API:** Проверьте наличие endpoint для S&P 400

### CAC 40

- **Table name:** `cac40_companies`
- **Schema name:** `cac40Companies`
- **API endpoint:** `/api/cac40`
- **UI code:** `cac40`
- **FMP API:** Возможно нужен другой источник данных

### DAX 40

- **Table name:** `dax40_companies`
- **Schema name:** `dax40Companies`
- **API endpoint:** `/api/dax40`
- **UI code:** `dax40`
- **FMP API:** Проверьте поддержку немецких компаний

---

## Важные замечания

1. **Naming Convention:** Строго следуйте соглашениям об именовании для консистентности
2. **Тестирование:** Всегда тестируйте локально перед деплоем
3. **Миграции:** Выполняйте SQL миграции в Supabase перед деплоем кода
4. **Документация:** Обновляйте документацию для будущих разработчиков
5. **Обратная совместимость:** Убедитесь, что изменения не ломают существующие индексы

---

## Поддержка

Если возникли проблемы:
1. Проверьте логи Railway для backend ошибок
2. Проверьте консоль браузера для frontend ошибок
3. Проверьте Supabase логи для ошибок БД
4. Убедитесь, что все миграции выполнены
5. Проверьте, что все типы TypeScript корректны

---

## Время выполнения

- **Шаг 1-2 (БД):** ~30 минут
- **Шаг 3 (Schema):** ~15 минут
- **Шаг 4 (API):** ~30 минут
- **Шаг 5 (UI):** ~45 минут
- **Шаг 6-7 (Скрипты):** ~1 час
- **Шаг 8-9 (Updaters/Import):** ~1 час
- **Шаг 10-12 (Тестирование/Деплой):** ~30 минут

**Итого:** ~4 часа для полной интеграции нового индекса

