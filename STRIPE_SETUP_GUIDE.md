# Детальная инструкция по настройке Stripe подписок

## Шаг 1: Создание продуктов в Stripe Dashboard

### 1.1. Создание Monthly Subscription продукта

1. Зайдите в [Stripe Dashboard](https://dashboard.stripe.com/)
2. Перейдите в раздел **Products** (в левом меню)
3. Нажмите кнопку **"+ Add product"** (или **"+ Product"**)
4. Заполните форму:
   - **Name**: `Monthly Subscription`
   - **Description**: `Monthly premium access to FindGreatStocks`
   - **Pricing model**: Выберите **"Recurring"**
   - **Price**: `9.00`
   - **Currency**: `USD` (United States Dollar)
   - **Billing period**: Выберите **"Monthly"**
   - **Usage is metered**: Оставьте **"No"**
5. Нажмите **"Save product"**
6. После создания продукта, найдите **Price ID** (начинается с `price_...`) - скопируйте его, он понадобится позже

**Важно**: Trial period НЕ настраивается здесь! Он настраивается автоматически в коде при создании checkout session.

### 1.2. Создание Annual Subscription продукта

1. В том же разделе **Products** нажмите **"+ Add product"** снова
2. Заполните форму:
   - **Name**: `Annual Subscription`
   - **Description**: `Annual premium access to FindGreatStocks`
   - **Pricing model**: Выберите **"Recurring"**
   - **Price**: `49.00`
   - **Currency**: `USD` (United States Dollar)
   - **Billing period**: Выберите **"Yearly"** или **"Annual"**
   - **Usage is metered**: Оставьте **"No"**
3. Нажмите **"Save product"**
4. Скопируйте **Price ID** (начинается с `price_...`)

## Шаг 2: Настройка переменных окружения

### 2.1. Backend переменные (server/.env или в настройках хостинга)

Добавьте или обновите следующие переменные:

```env
STRIPE_SECRET_KEY=sk_live_xxxxx  # Ваш Stripe Secret Key (уже должен быть)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Ваш Stripe Webhook Secret (уже должен быть)
STRIPE_MONTHLY_PRICE_ID=price_xxxxx  # Price ID из Monthly Subscription (НОВОЕ)
STRIPE_ANNUAL_PRICE_ID=price_xxxxx   # Price ID из Annual Subscription (ОБНОВИТЬ если был старый)
```

**Где найти Secret Key:**
- Stripe Dashboard → Developers → API keys → Secret key

**Где найти Webhook Secret:**
- Stripe Dashboard → Developers → Webhooks → выберите ваш webhook → Signing secret

### 2.2. Frontend переменные (client-app/.env или в настройках хостинга)

Добавьте или обновите следующие переменные:

```env
VITE_STRIPE_MONTHLY_PRICE_ID=price_xxxxx  # Price ID из Monthly Subscription (НОВОЕ)
VITE_STRIPE_ANNUAL_PRICE_ID=price_xxxxx   # Price ID из Annual Subscription (ОБНОВИТЬ если был старый)
```

**Важно**: 
- Если используете Railway, Vercel, или другой хостинг, добавьте эти переменные в настройках проекта
- После добавления переменных перезапустите сервер/приложение

## Шаг 3: Проверка Webhook настроек

Убедитесь, что ваш Stripe Webhook настроен правильно:

1. Зайдите в Stripe Dashboard → Developers → Webhooks
2. Найдите ваш webhook endpoint (обычно `https://your-domain.com/api/stripe/webhook`)
3. Убедитесь, что включены следующие события:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `charge.refunded` (опционально)

## Шаг 4: Тестирование

### 4.1. Тестовый режим (Test Mode)

1. В Stripe Dashboard переключитесь в **Test mode** (переключатель вверху)
2. Создайте тестовые продукты с теми же настройками
3. Используйте тестовые карты:
   - Успешная оплата: `4242 4242 4242 4242`
   - Любая будущая дата истечения (например, 12/25)
   - Любой CVC (например, 123)
   - Любой почтовый индекс (например, 12345)

### 4.2. Проверка работы

1. Запустите приложение
2. Попробуйте оформить подписку через UI
3. Проверьте, что:
   - Открывается Stripe Checkout
   - Показывается информация о 7-дневном trial
   - После успешной оплаты пользователь получает premium доступ
   - В Stripe Dashboard видна подписка со статусом "trialing"

## Важные замечания

1. **Trial period настраивается в коде**, а не в Stripe Dashboard при создании продукта
2. Код автоматически добавляет `trial_period_days: 7` при создании checkout session
3. Если у пользователя уже есть активная подписка, trial period не применится (только для новых подписок)
4. После trial period Stripe автоматически начнет списывать оплату

## Устранение проблем

Если trial period не работает:
1. Проверьте, что в коде есть `subscription_data: { trial_period_days: 7 }`
2. Убедитесь, что используете правильные Price IDs
3. Проверьте логи сервера на наличие ошибок
4. Убедитесь, что webhook правильно настроен
