# 🚀 Deployment Guide - FindGreatStocks.com

## 📋 **Обзор развертывания**

Этот гайд проведет вас через процесс развертывания FindGreatStocks.com в продакшн.

### **Архитектура:**
- **Frontend:** Vercel (React + Vite)
- **Backend:** Railway (Node.js + Express)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth + Google OAuth
- **Payments:** Stripe
- **Domain:** Namecheap (уже есть)

---

## 🎯 **Шаг 1: Настройка Vercel (Frontend)**

### **1.1 Создание аккаунта Vercel**
1. Перейдите на https://vercel.com
2. Войдите через GitHub
3. Подключите ваш репозиторий FindGreatStocks

### **1.2 Настройка проекта**
1. **Import Project:**
   - Выберите репозиторий FindGreatStocks
   - Framework Preset: `Vite`
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`

2. **Environment Variables:**
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_CLIENT_URL=https://your-domain.com
   ```

3. **Deploy:**
   - Нажмите "Deploy"
   - Дождитесь завершения сборки

### **1.3 Настройка домена**
1. В Vercel Dashboard перейдите в Settings > Domains
2. Добавьте ваш домен: `findgreatstocks.com`
3. Настройте DNS записи в Namecheap:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   
   Type: A
   Name: @
   Value: 76.76.19.61
   ```

---

## 🎯 **Шаг 2: Настройка Railway (Backend)**

### **2.1 Создание аккаунта Railway**
1. Перейдите на https://railway.app
2. Войдите через GitHub
3. Создайте новый проект

### **2.2 Настройка проекта**
1. **Connect Repository:**
   - Выберите репозиторий FindGreatStocks
   - Root Directory: `server`

2. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5002
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   FMP_API_KEY=your_fmp_api_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   CLIENT_URL=https://findgreatstocks.com
   ```

3. **Deploy:**
   - Railway автоматически определит Node.js проект
   - Дождитесь завершения развертывания

### **2.3 Получение URL бэкенда**
- Скопируйте URL вашего Railway приложения
- Обновите `vercel.json` с правильным URL

---

## 🎯 **Шаг 3: Настройка Supabase (Production)**

### **3.1 Создание продакшн проекта**
1. Перейдите на https://supabase.com/dashboard
2. Создайте новый проект: "FindGreatStocks Production"
3. Выберите регион (рекомендуется US East)

### **3.2 Настройка базы данных**
1. **Схема:**
   ```sql
   -- Запустите миграции из development
   npm run db:push
   ```

2. **Данные:**
   ```bash
   # Импортируйте данные
   npm run import:dowjones
   npm run import:sp500
   npm run import:nasdaq100
   npm run enhance:all
   ```

### **3.3 Настройка аутентификации**
1. **Authentication > Settings:**
   - Site URL: `https://findgreatstocks.com`
   - Redirect URLs: `https://findgreatstocks.com/**`

2. **Authentication > Providers:**
   - Включите Google OAuth
   - Обновите redirect URIs в Google Console

---

## 🎯 **Шаг 4: Настройка Stripe (Production)**

### **4.1 Создание продакшн аккаунта**
1. Перейдите на https://dashboard.stripe.com
2. Переключитесь в Live mode
3. Получите Live API ключи

### **4.2 Настройка продуктов и цен**
1. **Products:**
   - Quarterly Plan: $29.99/quarter
   - Annual Plan: $99.99/year

2. **Webhooks:**
   - Endpoint: `https://your-railway-app.railway.app/api/stripe/webhook`
   - Events: `checkout.session.completed`

### **4.3 Обновление переменных окружения**
- Обновите `STRIPE_SECRET_KEY` и `STRIPE_WEBHOOK_SECRET` в Railway

---

## 🎯 **Шаг 5: Финальная настройка**

### **5.1 Обновление конфигурации**
1. **Vercel:**
   - Обновите `vercel.json` с правильным Railway URL
   - Обновите environment variables

2. **Railway:**
   - Обновите `CLIENT_URL` на production домен

### **5.2 Тестирование**
1. **Frontend:** https://findgreatstocks.com
2. **API:** https://your-railway-app.railway.app/api/dowjones
3. **Authentication:** Вход через Google
4. **Payments:** Тестовые платежи

### **5.3 Мониторинг**
1. **Vercel Analytics:** Включите в Vercel Dashboard
2. **Railway Metrics:** Мониторинг в Railway Dashboard
3. **Supabase Logs:** Проверка в Supabase Dashboard

---

## 🔧 **Troubleshooting**

### **Проблемы с доменом:**
- Проверьте DNS записи в Namecheap
- Дождитесь распространения DNS (до 24 часов)

### **Проблемы с API:**
- Проверьте CORS настройки в Railway
- Убедитесь, что environment variables правильно настроены

### **Проблемы с аутентификацией:**
- Проверьте redirect URIs в Google Console
- Обновите Site URL в Supabase

---

## ✅ **Готово!**

После выполнения всех шагов ваш сайт будет доступен по адресу:
**https://findgreatstocks.com**

### **Следующие шаги:**
1. Настройка мониторинга и аналитики
2. SEO оптимизация
3. Маркетинг и привлечение пользователей
4. Масштабирование и оптимизация

---

## 📞 **Поддержка**

Если возникнут проблемы:
1. Проверьте логи в Vercel/Railway/Supabase
2. Убедитесь, что все environment variables настроены
3. Проверьте DNS настройки
4. Обратитесь к документации сервисов
