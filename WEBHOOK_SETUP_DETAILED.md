# Детальная инструкция по настройке Stripe Webhook

## Что такое Webhook и зачем он нужен?

Webhook - это способ Stripe уведомлять ваш сервер о событиях (например, когда пользователь оплатил подписку, когда подписка обновилась, когда платеж не прошел и т.д.). Без правильно настроенного webhook ваш сервер не будет знать, когда обновлять статус подписки пользователя в базе данных.

## Шаг 3: Настройка Webhook в Stripe Dashboard

### 3.1. Найдите ваш Webhook Endpoint URL

Ваш webhook endpoint должен быть:
```
https://your-domain.com/api/stripe/webhook
```

Замените `your-domain.com` на ваш реальный домен (например, `findgreatstocks.com` или `your-app.vercel.app`).

### 3.2. Создание или обновление Webhook в Stripe

1. **Зайдите в Stripe Dashboard**
   - Откройте https://dashboard.stripe.com/
   - Убедитесь, что вы в правильном режиме (Test mode для тестирования, Live mode для продакшена)

2. **Перейдите в раздел Webhooks**
   - В левом меню найдите **"Developers"** (или **"Разработчики"**)
   - Нажмите на **"Webhooks"** в подменю

3. **Проверьте существующие Webhooks**
   - Если у вас уже есть webhook для вашего домена, нажмите на него
   - Если нет, нажмите кнопку **"+ Add endpoint"** (или **"+ Добавить endpoint"**)

4. **Настройка Endpoint URL**
   - **Endpoint URL**: Вставьте ваш URL: `https://your-domain.com/api/stripe/webhook`
   - **Description** (опционально): `FindGreatStocks webhook handler`

5. **Выберите события для прослушивания**
   
   Нажмите **"Select events"** и выберите следующие события:
   
   **Обязательные события:**
   - ✅ `checkout.session.completed` - когда пользователь успешно завершил checkout
   - ✅ `customer.subscription.updated` - когда подписка обновилась (например, начался trial, закончился trial, изменился план)
   - ✅ `customer.subscription.deleted` - когда подписка была отменена
   - ✅ `invoice.payment_failed` - когда платеж не прошел
   
   **Опциональные события:**
   - ⚪ `charge.refunded` - когда был сделан возврат (если хотите обрабатывать возвраты)
   
   **Как выбрать события:**
   - Можно выбрать **"Select events to listen to"** и вручную выбрать нужные
   - Или выбрать **"Select all events"** (но это не рекомендуется, так как будет много лишних событий)

6. **Сохраните Webhook**
   - Нажмите **"Add endpoint"** (или **"Добавить endpoint"**)

7. **Скопируйте Signing Secret**
   - После создания webhook, Stripe покажет **"Signing secret"** (начинается с `whsec_...`)
   - **ВАЖНО**: Скопируйте этот секрет - он понадобится для переменной окружения `STRIPE_WEBHOOK_SECRET`
   - Если вы не скопировали его сразу, вы можете найти его позже:
     - Webhooks → выберите ваш webhook → в разделе "Signing secret" нажмите "Reveal"

### 3.3. Добавьте Webhook Secret в переменные окружения

Добавьте в Vercel (или ваш хостинг):

**Backend переменная:**
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Вставьте Signing secret из Stripe
```

**Где добавить в Vercel:**
1. Зайдите в ваш проект в Vercel
2. Settings → Environment Variables
3. Добавьте переменную `STRIPE_WEBHOOK_SECRET` со значением из Stripe
4. Убедитесь, что выбрана правильная среда (Production, Preview, Development)

### 3.4. Проверка работы Webhook

1. **В Stripe Dashboard:**
   - Webhooks → выберите ваш webhook
   - В разделе "Recent events" вы должны видеть события
   - Если события показывают статус "Succeeded" (зеленый) - все работает!
   - Если статус "Failed" (красный) - проверьте URL и секрет

2. **Тестирование:**
   - Создайте тестовую подписку через ваше приложение
   - Проверьте в Stripe Dashboard → Webhooks → ваш webhook → Recent events
   - Должно появиться событие `checkout.session.completed` со статусом "Succeeded"

### 3.5. Устранение проблем

**Если webhook не работает:**

1. **Проверьте URL:**
   - Убедитесь, что URL правильный и доступен
   - Попробуйте открыть URL в браузере (должна быть ошибка, но не 404)

2. **Проверьте Signing Secret:**
   - Убедитесь, что `STRIPE_WEBHOOK_SECRET` правильный
   - Проверьте, что нет лишних пробелов при копировании

3. **Проверьте логи:**
   - В Stripe Dashboard → Webhooks → ваш webhook → Recent events
   - Нажмите на событие, чтобы увидеть детали ошибки
   - Проверьте логи вашего сервера (в Vercel это можно сделать в разделе Logs)

4. **Проверьте, что сервер запущен:**
   - Убедитесь, что ваш сервер развернут и работает
   - Проверьте, что endpoint `/api/stripe/webhook` доступен

## Важные замечания

1. **Test mode vs Live mode:**
   - В Test mode и Live mode нужны разные webhooks
   - Убедитесь, что вы создали webhook в правильном режиме
   - Signing secret будет разный для Test и Live режимов

2. **После изменения переменных окружения:**
   - Перезапустите/передеплойте приложение в Vercel
   - Vercel обычно делает это автоматически, но можно сделать вручную через "Redeploy"

3. **Безопасность:**
   - Никогда не публикуйте `STRIPE_WEBHOOK_SECRET` в публичных репозиториях
   - Используйте переменные окружения для хранения секретов
