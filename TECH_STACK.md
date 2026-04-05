# 🛠️ Технологический стек FindGreatStocks.com

## 📋 Обзор

FindGreatStocks.com - это платформа для анализа фондового рынка, построенная на современном технологическом стеке с разделением на frontend и backend.

---

## 🎨 Frontend (Клиентская часть)

### **React + TypeScript**
- **React 18.2.0** - основная библиотека для построения пользовательского интерфейса
- **TypeScript** - типизированный JavaScript для надежности кода
- **Vite 5.0.8** - современный сборщик и dev-сервер (быстрее Webpack)

### **React Router DOM 6.21.3**
- Маршрутизация и навигация между страницами
- SPA (Single Page Application) архитектура

### **UI Компоненты**
- **Radix UI** - библиотека доступных UI компонентов:
  - Dialog, Dropdown, Select, Tabs, Toast, Tooltip и др.
  - Без стилей по умолчанию, полный контроль над дизайном
- **Tailwind CSS 3.4.0** - utility-first CSS фреймворк для стилизации
- **Lucide React** - иконки
- **shadcn/ui** - набор переиспользуемых компонентов на базе Radix UI

### **Управление состоянием и данными**
- **TanStack Query (React Query) 5.17.0** - управление серверным состоянием, кэширование, синхронизация данных
- **TanStack Table 8.11.2** - мощная таблица для отображения финансовых данных с сортировкой, фильтрацией, пагинацией

### **Формы**
- **React Hook Form 7.48.2** - управление формами с валидацией

### **Онбординг и туры**
- **Intro.js 8.3.2** - интерактивные туры для новых пользователей
- **React Joyride 2.9.3** - альтернативная библиотека для guided tours

### **Аналитика**
- **PostHog 1.292.0** - аналитика поведения пользователей, A/B тестирование, feature flags

### **Графики**
- **Recharts 2.8.0** - библиотека для построения графиков финансовых данных

---

## ⚙️ Backend (Серверная часть)

### **Node.js + Express**
- **Express 4.18.2** - веб-фреймворк для Node.js
- **TypeScript** - типизация на сервере
- **tsx 4.6.2** - TypeScript executor для разработки

### **База данных**
- **PostgreSQL** - реляционная база данных
- **Drizzle ORM 0.44.5** - современный TypeScript ORM для работы с PostgreSQL
- **pg 8.11.3** - PostgreSQL клиент для Node.js

---

## 🗄️ База данных и аутентификация

### **Supabase**
- **PostgreSQL база данных** - хранение всех данных о компаниях, пользователях, watchlist
- **Supabase Auth** - управление аутентификацией:
  - Email/Password аутентификация
  - **Google OAuth** - вход через Google аккаунт
  - Управление сессиями и токенами
- **Row Level Security (RLS)** - безопасность на уровне строк

---

## 💳 Платежи

### **Stripe**
- **Stripe.js 2.4.0** - клиентская библиотека для обработки платежей
- **Stripe API (сервер)** - создание checkout сессий, обработка webhooks
- Поддержка подписок (subscriptions)
- Обработка успешных и отмененных платежей

---

## 📊 Финансовые данные

### **Financial Modeling Prep (FMP) API**
- Основной источник финансовых данных:
  - Котировки акций
  - Финансовые отчеты (Income Statement, Balance Sheet, Cash Flow)
  - Ключевые метрики (P/E, P/S, Market Cap и др.)
  - Исторические данные (10-летняя история)
  - Данные по дивидендам
- Используется для:
  - Импорта данных о компаниях
  - Обогащения данных (enhancement)
  - Расчетов DCF, ROIC, ROE и других метрик

---

## 🚀 Деплой и хостинг

### **Vercel**
- **Frontend хостинг** - деплой React приложения
- **Edge Functions** - серверные функции на edge
- **CDN** - глобальная доставка контента
- **Автоматические деплои** из GitHub
- **Rewrites** - проксирование API запросов на Railway backend

### **Railway**
- **Backend хостинг** - деплой Node.js/Express сервера
- **Автоматическое определение** Node.js проектов
- **Переменные окружения** для конфигурации
- **Автоматические рестарты** при сбоях

---

## 🔧 Дополнительные инструменты

### **Cron Jobs**
- **cron 3.1.6** - планировщик задач для автоматического обновления данных
- Регулярное обновление финансовых данных

### **CORS**
- **cors 2.8.5** - обработка Cross-Origin Resource Sharing для API

### **SEO и мета-теги**
- **React Helmet Async 2.0.4** - управление head тегами для SEO

### **Обработка ошибок**
- **Sentry** (упоминается в коде) - мониторинг ошибок в продакшне

---

## 📱 Мобильная оптимизация

### **Адаптивный дизайн**
- **Tailwind CSS breakpoints** - responsive дизайн
- **Mobile-first подход**
- **Touch-friendly интерфейсы**
- **Горизонтальная прокрутка** для таблиц на мобильных

---

## 🔐 Безопасность

### **Аутентификация**
- Supabase Auth с JWT токенами
- Google OAuth через Supabase
- Row Level Security в PostgreSQL

### **API Security**
- Middleware для проверки аутентификации
- Service Role Key для серверных операций
- Anon Key для клиентских запросов

---

## 📦 Управление зависимостями

### **npm**
- Package manager для Node.js
- Раздельные package.json для client и server

### **TypeScript**
- Типизация на всем стеке
- Улучшенная поддержка IDE
- Раннее обнаружение ошибок

---

## 🎯 Основные библиотеки по категориям

### **UI/UX**
- Radix UI (компоненты)
- Tailwind CSS (стили)
- Lucide React (иконки)
- Intro.js (онбординг)

### **Данные**
- TanStack Query (серверное состояние)
- TanStack Table (таблицы)
- Recharts (графики)

### **Инфраструктура**
- Vercel (frontend hosting)
- Railway (backend hosting)
- Supabase (database + auth)

### **Интеграции**
- Financial Modeling Prep API (финансовые данные)
- Stripe (платежи)
- Google OAuth (аутентификация)
- PostHog (аналитика)

---

## 🔄 Архитектура приложения

```
┌─────────────────┐
│   Vercel CDN    │  ← Frontend (React + Vite)
│  (Static Files) │
└────────┬────────┘
         │
         │ API Requests
         ▼
┌─────────────────┐
│  Vercel Rewrite │  ← Проксирование API
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Railway Backend│  ← Express API Server
│  (Node.js)      │
└────────┬────────┘
         │
         ├──► Supabase (PostgreSQL + Auth)
         │
         └──► FMP API (Financial Data)
```

---

## 📝 Резюме

**Frontend:** React + TypeScript + Vite + Tailwind CSS  
**Backend:** Node.js + Express + TypeScript  
**Database:** Supabase (PostgreSQL)  
**Auth:** Supabase Auth + Google OAuth  
**Payments:** Stripe  
**Data Source:** Financial Modeling Prep API  
**Hosting:** Vercel (Frontend) + Railway (Backend)  
**Analytics:** PostHog  
**Onboarding:** Intro.js  
**Tables:** TanStack Table  
**State Management:** TanStack Query  

Это современный, масштабируемый стек, оптимизированный для производительности и удобства разработки.







