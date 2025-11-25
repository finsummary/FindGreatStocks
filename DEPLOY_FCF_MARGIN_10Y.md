# Инструкция: Добавление FCF Margin 10Y Median

## Шаг 1: Добавление колонок в Supabase

### 1.1. Откройте Supabase Dashboard
1. Перейдите на https://supabase.com/dashboard
2. Войдите в свой аккаунт
3. Выберите проект FindGreatStocks (или ваш проект)

### 1.2. Откройте SQL Editor
1. В левом меню найдите раздел **"SQL Editor"** (иконка с символом `</>` или текст "SQL Editor")
2. Нажмите на него

### 1.3. Создайте новый запрос
1. Нажмите кнопку **"New query"** (или "+ New query") вверху
2. В открывшемся редакторе вы увидите пустое поле для SQL

### 1.4. Скопируйте и вставьте SQL скрипт
1. Откройте файл `migrations/add-fcf-margin-10y-columns.sql` в вашем проекте
2. Выделите весь текст (Ctrl+A) и скопируйте (Ctrl+C)
3. Вставьте в SQL Editor в Supabase (Ctrl+V)

### 1.5. Запустите скрипт
1. Нажмите кнопку **"Run"** (или "Execute", или F5) внизу справа
2. Дождитесь завершения выполнения (должно появиться сообщение "Success" или "Query executed successfully")
3. Если появились ошибки — проверьте, что все таблицы существуют

### 1.6. Проверьте результат
1. В левом меню найдите **"Table Editor"**
2. Откройте любую таблицу (например, `companies`)
3. Прокрутите вниз — должны появиться новые колонки:
   - `revenue_y1`, `revenue_y2`, ... `revenue_y10`
   - `fcf_y1`, `fcf_y2`, ... `fcf_y10`
   - `fcf_margin_median_10y`

---

## Шаг 2: Деплой изменений в Git

### 2.1. Закоммитьте изменения
Откройте терминал в папке проекта и выполните:

```bash
git add shared/schema.ts server/routes.js client-app/src/types/index.ts client-app/src/components/company-table.tsx migrations/add-fcf-margin-10y-columns.sql
git commit -m "feat: add FCF Margin 10Y Median column with revenue/fcf history"
git push
```

### 2.2. Дождитесь деплоя
- **Vercel** (фронтенд): автоматически задеплоится после push в `main`
- **Railway** (бэкенд): автоматически задеплоится после push в `main`

Проверьте статус деплоя:
- Vercel: https://vercel.com/dashboard → выберите проект → вкладка "Deployments"
- Railway: https://railway.app/dashboard → выберите проект → вкладка "Deployments"

---

## Шаг 3: Запуск пересчёта данных

### 3.1. Получите Admin Token
1. Откройте Railway Dashboard: https://railway.app/dashboard
2. Выберите ваш проект (backend)
3. Перейдите во вкладку **"Variables"**
4. Найдите переменную `ADMIN_API_TOKEN`
5. Скопируйте значение (нажмите на значок глаза, чтобы показать значение)

**ИЛИ** используйте ваш admin email:
1. Войдите на сайт https://findgreatstocks.com
2. Откройте DevTools (F12)
3. Перейдите во вкладку **"Application"** (или "Storage")
4. В левом меню найдите **"Local Storage"** → `https://findgreatstocks.com`
5. Найдите ключ, начинающийся с `sb-` и заканчивающийся на `-auth-token`
6. Скопируйте значение и откройте его (это JSON)
7. Найдите поле `access_token` и скопируйте его значение

### 3.2. Тестовый пересчёт для нескольких компаний
Откройте терминал (PowerShell или Command Prompt) и выполните:

```powershell
# Замените <YOUR_TOKEN> на токен из шага 3.1
$token = "<YOUR_TOKEN>"
$url = "https://findgreatstocks.com/api/metrics/recompute-fcf-margin-10y?symbols=AAPL,MSFT,GOOGL"
Invoke-RestMethod -Uri $url -Method POST -Headers @{ "Authorization" = "Bearer $token" }
```

**Или через curl** (если установлен):
```bash
curl -X POST "https://findgreatstocks.com/api/metrics/recompute-fcf-margin-10y?symbols=AAPL,MSFT,GOOGL" -H "Authorization: Bearer <YOUR_TOKEN>"
```

**Или через браузер** (если используете admin email):
1. Откройте https://findgreatstocks.com
2. Войдите с admin email
3. Откройте DevTools (F12) → вкладка **"Console"**
4. Вставьте и выполните:

```javascript
(async () => {
  const k = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  const s = JSON.parse(localStorage.getItem(k));
  const t = s?.access_token || s?.currentSession?.access_token;
  const res = await fetch('https://findgreatstocks.com/api/metrics/recompute-fcf-margin-10y?symbols=AAPL,MSFT,GOOGL', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${t}` }
  });
  const json = await res.json();
  console.log('Result:', json);
})();
```

### 3.3. Массовый пересчёт для всех компаний
⚠️ **Внимание**: Это может занять много времени (несколько часов) и сделать много запросов к FMP API.

**Через PowerShell:**
```powershell
$token = "<YOUR_TOKEN>"
$url = "https://findgreatstocks.com/api/metrics/recompute-fcf-margin-10y-all"
Invoke-RestMethod -Uri $url -Method POST -Headers @{ "Authorization" = "Bearer $token" }
```

**Через браузер Console:**
```javascript
(async () => {
  const k = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  const s = JSON.parse(localStorage.getItem(k));
  const t = s?.access_token || s?.currentSession?.access_token;
  const res = await fetch('https://findgreatstocks.com/api/metrics/recompute-fcf-margin-10y-all', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${t}` }
  });
  const json = await res.json();
  console.log('Result:', json);
  // Это долгий процесс, проверяйте статус периодически
})();
```

**Рекомендация**: Запустите массовый пересчёт в фоне или через Railway CLI/API, чтобы не держать браузер открытым.

---

## Шаг 4: Проверка результата

### 4.1. Проверьте в Supabase
1. Откройте Supabase → Table Editor → `companies`
2. Найдите любую компанию (например, AAPL)
3. Прокрутите до колонки `fcf_margin_median_10y`
4. Должно быть число (например, `0.15` = 15%) или `NULL` (если данных нет)

### 4.2. Проверьте на сайте
1. Откройте https://findgreatstocks.com
2. Выберите любой датасет (S&P 500, Dow Jones и т.д.)
3. Нажмите **"Choose Layout"** → выберите **"Compounders (ROIC, FCF)"**
4. Найдите колонку **"FCF Margin 10Y Median %"**
5. Должны отображаться значения (или "N/A" для компаний без данных)

### 4.3. Проверьте сортировку
1. Нажмите на заголовок колонки **"FCF Margin 10Y Median %"**
2. Таблица должна отсортироваться по этой колонке
3. Попробуйте также **"Rank by..."** → выберите **"FCF Margin 10Y Median %"**

---

## Возможные проблемы

### Ошибка "Unauthorized" при запуске пересчёта
- Убедитесь, что используете правильный токен
- Проверьте, что ваш email добавлен в `ADMIN_EMAILS` в Railway Variables
- Или используйте `ADMIN_API_TOKEN` в заголовке `x-admin-token`

### Колонка не появляется на сайте
- Убедитесь, что Vercel задеплоил последние изменения
- Выполните hard refresh: Ctrl+Shift+R (Windows) или Cmd+Shift+R (Mac)
- Очистите кэш браузера

### Данные не заполняются
- Проверьте, что FMP API ключ (`FMP_API_KEY`) установлен в Railway Variables
- Проверьте логи Railway на наличие ошибок
- Убедитесь, что скрипт пересчёта завершился успешно (проверьте ответ в консоли)

### Ошибки в Supabase при выполнении SQL
- Убедитесь, что все таблицы существуют
- Проверьте, что у вас есть права на изменение схемы
- Если колонка уже существует, ошибка будет проигнорирована (благодаря `IF NOT EXISTS`)

---

## Дополнительная информация

- Файл SQL скрипта: `migrations/add-fcf-margin-10y-columns.sql`
- Backend endpoints:
  - `/api/metrics/recompute-fcf-margin-10y?symbols=SYM1,SYM2` — для отдельных символов
  - `/api/metrics/recompute-fcf-margin-10y-all` — для всех символов
- Frontend колонка: `fcfMarginMedian10Y` в Compounders layout

