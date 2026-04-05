# 🚀 Как вызвать endpoint для заполнения данных новых компаний S&P 500

## Способ 1: Использовать готовый скрипт (рекомендуется)

```bash
# Укажите URL вашего Railway приложения
node call-populate-endpoint.js https://your-railway-app.railway.app

# Или установите переменную окружения
export RAILWAY_URL=https://your-railway-app.railway.app
node call-populate-endpoint.js
```

## Способ 2: Использовать curl (Linux/Mac/Git Bash)

```bash
curl -X POST https://your-railway-app.railway.app/api/sp500/populate-new-companies-auto \
  -H "Content-Type: application/json"
```

## Способ 3: Использовать PowerShell (Windows)

```powershell
Invoke-WebRequest -Uri "https://your-railway-app.railway.app/api/sp500/populate-new-companies-auto" `
  -Method POST `
  -ContentType "application/json"
```

## Способ 4: Использовать Postman

1. Откройте Postman
2. Создайте новый POST запрос
3. URL: `https://your-railway-app.railway.app/api/sp500/populate-new-companies-auto`
4. Headers: `Content-Type: application/json`
5. Нажмите Send

## Способ 5: Использовать браузер (только для GET, но можно через консоль)

Откройте консоль разработчика (F12) и выполните:

```javascript
fetch('https://your-railway-app.railway.app/api/sp500/populate-new-companies-auto', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## 🔍 Как найти URL вашего Railway приложения

1. Зайдите на https://railway.app
2. Выберите ваш проект FindGreatStocks
3. В настройках проекта найдите "Public Domain" или "Deployments"
4. Скопируйте URL (обычно выглядит как `https://your-app-name.railway.app`)

## ✅ Проверка результата

После вызова endpoint:
- Проверьте логи Railway для отслеживания прогресса
- Данные будут заполнены для компаний: CVNA, CHR, FIX
- Процесс может занять несколько минут







