# Проверка актуальных эндпоинтов FMP API

## Текущая проблема

FMP API возвращает ошибку "Legacy Endpoint" для всех запросов к `/api/v3/` и `/api/v4/`. Это означает, что оба формата устарели.

## Что нужно проверить в документации FMP

Зайдите на: **https://site.financialmodelingprep.com/developer/docs**

### 1. Проверьте формат URL для Quote endpoint

**Текущий формат (не работает):**
```
https://financialmodelingprep.com/api/v4/quote/AAPL?apikey=YOUR_KEY
```

**Возможные новые форматы:**
- `https://financialmodelingprep.com/api/quote/AAPL?apikey=YOUR_KEY` (без версии)
- `https://api.financialmodelingprep.com/v1/quote/AAPL?apikey=YOUR_KEY` (другой домен)
- `https://financialmodelingprep.com/v1/quote/AAPL?apikey=YOUR_KEY` (без /api/)
- Другой формат, указанный в документации

### 2. Проверьте формат URL для Profile endpoint

**Текущий формат (не работает):**
```
https://financialmodelingprep.com/api/v4/profile/AAPL?apikey=YOUR_KEY
```

**Возможные новые форматы:**
- `https://financialmodelingprep.com/api/profile/AAPL?apikey=YOUR_KEY`
- `https://api.financialmodelingprep.com/v1/profile/AAPL?apikey=YOUR_KEY`
- Другой формат

### 3. Проверьте аутентификацию

**Текущий формат:**
- API ключ передается как query параметр: `?apikey=YOUR_KEY`

**Возможные изменения:**
- Может быть нужен заголовок: `Authorization: Bearer YOUR_KEY`
- Или другой формат заголовка
- Или другой параметр вместо `apikey`

### 4. Проверьте требования к подписке

- Убедитесь, что ваш тарифный план поддерживает новые эндпоинты
- Возможно, нужен более высокий тарифный план
- Проверьте, не истекла ли подписка

## Как протестировать новый формат

1. **Откройте документацию FMP:**
   https://site.financialmodelingprep.com/developer/docs

2. **Найдите раздел "Quote" или "Stock Quote"**

3. **Скопируйте пример URL из документации**

4. **Протестируйте в браузере или через curl:**
   ```bash
   # Замените на ваш API ключ и формат из документации
   curl "https://financialmodelingprep.com/api/quote/AAPL?apikey=YOUR_KEY"
   ```

5. **Проверьте ответ:**
   - Если получаете данные - формат правильный
   - Если получаете ошибку "Legacy Endpoint" - формат неправильный

## Что делать после проверки

После того, как найдете правильный формат:

1. **Сообщите мне правильный формат URL** - я обновлю код
2. **Или обновите код самостоятельно:**
   - Найдите все вхождения `financialmodelingprep.com/api/v4/` в `server/routes.js`
   - Замените на правильный формат из документации

## Альтернативные варианты (если документация недоступна)

Если документация недоступна, можно попробовать:

1. **Убрать версию из URL:**
   ```javascript
   // Вместо: /api/v4/quote/
   // Попробовать: /api/quote/
   ```

2. **Использовать другой домен:**
   ```javascript
   // Вместо: financialmodelingprep.com
   // Попробовать: api.financialmodelingprep.com
   ```

3. **Связаться с поддержкой FMP:**
   - Напишите в поддержку FMP
   - Спросите про актуальный формат эндпоинтов
   - Уточните, нужна ли миграция на новый план

## Текущий статус

- ❌ `/api/v3/*` - не работает (Legacy)
- ❌ `/api/v4/*` - не работает (Legacy)
- ⏳ Нужно проверить документацию для актуального формата
