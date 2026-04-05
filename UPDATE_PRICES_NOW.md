# Как обновить цены всех компаний прямо сейчас

## Простой способ - через PowerShell

1. Откройте PowerShell (Win + X → "Windows PowerShell" или "Terminal")
2. Выполните команду:

```powershell
Invoke-WebRequest -Uri "https://findgreatstocks-production.up.railway.app/api/prices/update-all" -Method POST
```

Это запустит обновление цен для всех таблиц:
- companies
- sp500_companies
- nasdaq100_companies
- dow_jones_companies

## Альтернативный способ - через онлайн-сервис

1. Откройте https://reqbin.com/
2. Установите:
   - **Method:** POST
   - **URL:** `https://findgreatstocks-production.up.railway.app/api/prices/update-all`
3. Нажмите **"Send"**

## Что происходит при обновлении

Система:
1. Получает все символы из каждой таблицы
2. Запрашивает актуальные цены через FMP API (batch-quote)
3. Обновляет колонки:
   - `price` - текущая цена
   - `market_cap` - рыночная капитализация
   - `daily_change` - изменение за день
   - `daily_change_percent` - процентное изменение за день

## Проверка результата

После запуска обновления проверьте логи Railway:
1. Зайдите на https://railway.app
2. Выберите проект "FindGreatStocks"
3. Перейдите в "Logs"
4. Ищите сообщения об обновлении цен

## Автоматическое обновление

Цены обновляются автоматически:
- **Каждый час** на 15-й минуте (10:15, 11:15, 12:15 UTC и т.д.)
- **Ежедневно** в 05:00 UTC (резерв)
- **Ежедневно** в 06:00 UTC (резерв)

## Если цены не обновляются

Проверьте:
1. Логи Railway на наличие ошибок FMP API
2. Что переменная окружения `FMP_API_KEY` установлена в Railway
3. Что FMP API ключ активен и не превышен лимит запросов
