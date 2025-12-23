# Инструкции: Как запустить скрипты

## 1. Заполнение derived metrics для всех существующих компаний

### Вариант A: Локально (для тестирования)

```bash
# Убедитесь, что вы в корневой директории проекта
cd C:\Users\user\Desktop\FindGreatStocks

# Убедитесь, что установлены зависимости
npm install

# Запустите скрипт
npx tsx server/populate-derived-metrics-all.ts
```

### Вариант B: Через API на Railway (рекомендуется для production)

После деплоя изменений на Railway:

1. **Откройте Railway Dashboard:**
   - https://railway.app
   - Выберите ваш проект FindGreatStocks
   - Перейдите в "Deployments" → выберите последний деплой

2. **Вызовите API endpoint:**
   
   **Через curl (в терминале):**
   ```bash
   curl -X POST https://findgreatstocks-production.up.railway.app/api/metrics/populate-derived-all \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```
   
   **Через PowerShell:**
   ```powershell
   Invoke-WebRequest -Uri "https://findgreatstocks-production.up.railway.app/api/metrics/populate-derived-all" `
     -Method POST `
     -ContentType "application/json" `
     -Headers @{ "Authorization" = "Bearer YOUR_ADMIN_TOKEN" }
   ```
   
   **Или создайте файл `call-populate-derived-metrics.js`:**
   ```javascript
   const RAILWAY_URL = 'https://findgreatstocks-production.up.railway.app';
   const ENDPOINT = `${RAILWAY_URL}/api/metrics/populate-derived-all`;

   async function callEndpoint() {
     console.log('🚀 Calling populate derived metrics endpoint...');
     console.log(`📡 URL: ${ENDPOINT}\n`);

     try {
       const response = await fetch(ENDPOINT, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
       });

       if (response.ok) {
         const data = await response.json();
         console.log('✅ Success!');
         console.log('Response:', JSON.stringify(data, null, 2));
         console.log('\n📊 Derived metrics population started for all companies');
         console.log('💡 Check Railway logs for progress...');
       } else {
         const text = await response.text();
         console.error(`❌ Server returned status ${response.status}`);
         console.error('Response:', text);
       }
     } catch (error) {
       console.error('❌ Error calling endpoint:', error.message);
     }
   }

   callEndpoint();
   ```
   
   Затем запустите:
   ```bash
   node call-populate-derived-metrics.js
   ```

3. **Проверьте логи Railway:**
   - В Railway Dashboard → Deployments → Logs
   - Должны появиться сообщения о прогрессе обработки компаний

## 2. Проверка результатов

После завершения скрипта проверьте в Supabase:

```sql
-- Проверьте, что метрики заполнены
SELECT 
  symbol, 
  roic_stability, 
  roic_stability_score, 
  fcf_margin 
FROM sp500_companies 
WHERE roic_stability IS NOT NULL 
LIMIT 10;
```

## 3. Что было обновлено

✅ **Daily Updaters обновлены:**
- `server/sp500-daily-updater.ts` - автоматически обновляет метрики при обновлении цен
- `server/nasdaq100-daily-updater.ts` - автоматически обновляет метрики при обновлении цен
- `server/dowjones-daily-updater.ts` - автоматически обновляет метрики при обновлении цен
- `server/ftse100-daily-updater.ts` - автоматически обновляет метрики при обновлении цен

✅ **UI обновлен:**
- `client-app/src/components/company-table.tsx` - использует значения из БД (если есть), иначе вычисляет динамически

✅ **Скрипт для заполнения всех компаний:**
- `server/populate-derived-metrics-all.ts` - заполняет метрики для всех компаний

✅ **API endpoint:**
- `POST /api/metrics/populate-derived-all` - запускает скрипт через API

## 4. Автоматизация

После первого заполнения, метрики будут автоматически обновляться:
- При ежедневных обновлениях цен (daily updaters)
- При добавлении новых компаний (population scripts)

## 5. Мониторинг

Проверяйте логи Railway для отслеживания:
- Количества обработанных компаний
- Ошибок при обновлении
- Времени выполнения

