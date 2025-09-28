# 🚀 Frontend Setup для FindGreatStocks.com

## 📋 **Создание отдельного репозитория для фронтенда**

### **Шаг 1: Создание нового репозитория**

1. **На GitHub создайте новый репозиторий:**
   - Название: `FindGreatStocks-Frontend`
   - Описание: `Frontend for FindGreatStocks.com`
   - Публичный или приватный (на ваш выбор)

### **Шаг 2: Копирование файлов**

Скопируйте следующие файлы и папки из основного проекта:

```
FindGreatStocks-Frontend/
├── client/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── index.html
├── shared/
│   └── schema.ts
├── .gitignore
├── README.md
└── vercel.json
```

### **Шаг 3: Обновление package.json**

В корне нового репозитория создайте `package.json`:

```json
{
  "name": "findgreatstocks-frontend",
  "version": "1.0.0",
  "description": "Frontend for FindGreatStocks.com",
  "scripts": {
    "dev": "cd client && npm run dev",
    "build": "cd client && npm run build",
    "preview": "cd client && npm run preview",
    "install": "cd client && npm install"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### **Шаг 4: Обновление vercel.json**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "client/dist",
  "devCommand": "npm run dev",
  "installCommand": "npm run install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-railway-app.railway.app/api/$1"
    }
  ]
}
```

### **Шаг 5: Настройка Vercel**

1. **Подключите новый репозиторий к Vercel**
2. **Настройки:**
   - **Root Directory:** пустой
   - **Build Command:** `npm run build`
   - **Output Directory:** `client/dist`
   - **Install Command:** `npm run install`

### **Шаг 6: Environment Variables**

Добавьте в Vercel:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CLIENT_URL=https://findgreatstocks.com
```

### **Шаг 7: Деплой**

1. **Закоммитьте изменения в новый репозиторий**
2. **Vercel автоматически задеплоит**
3. **Получите URL для тестирования**

### **Преимущества отдельного репозитория:**

- ✅ **Чистая изоляция** - только фронтенд код
- ✅ **Быстрая сборка** - нет серверных файлов
- ✅ **Простое управление** - отдельные настройки
- ✅ **Независимое развертывание** - фронтенд и бэкенд отдельно

### **Альтернатива: Исправление текущего репозитория**

Если не хотите создавать отдельный репозиторий, можно исправить текущий:

1. **Удалите все серверные файлы из корня**
2. **Оставьте только папку `client` и `shared`**
3. **Обновите `package.json` и `vercel.json`**

**Рекомендую создать отдельный репозиторий - это проще и надежнее!** 🚀
