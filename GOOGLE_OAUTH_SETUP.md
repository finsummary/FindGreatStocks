# 🔐 Google OAuth Setup для FindGreatStocks

## 📋 Настройка Google OAuth в Supabase

### 1. Создание Google OAuth приложения

1. **Перейдите в Google Cloud Console**
   - Откройте https://console.cloud.google.com/
   - Войдите в свой Google аккаунт

2. **Создайте новый проект или выберите существующий**
   - Нажмите на выпадающий список проектов в верхней части
   - Нажмите "New Project" или выберите существующий

3. **Включите Google+ API**
   - Перейдите в "APIs & Services" > "Library"
   - Найдите "Google+ API" и включите его

4. **Создайте OAuth 2.0 credentials**
   - Перейдите в "APIs & Services" > "Credentials"
   - Нажмите "Create Credentials" > "OAuth 2.0 Client IDs"
   - Выберите "Web application"

5. **Настройте OAuth consent screen**
   - Перейдите в "OAuth consent screen"
   - Выберите "External" (если у вас нет Google Workspace)
   - Заполните обязательные поля:
     - App name: "FindGreatStocks"
     - User support email: ваш email
     - Developer contact information: ваш email

6. **Настройте authorized redirect URIs**
   - В настройках OAuth client добавьте:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
     - `http://localhost:5173/auth/callback` (для разработки)

### 2. Настройка в Supabase Dashboard

1. **Откройте Supabase Dashboard**
   - Перейдите в https://supabase.com/dashboard
   - Выберите ваш проект

2. **Перейдите в Authentication > Providers**
   - В левом меню выберите "Authentication"
   - Перейдите в "Providers"

3. **Включите Google Provider**
   - Найдите "Google" в списке провайдеров
   - Включите переключатель

4. **Добавьте OAuth credentials**
   - Client ID: скопируйте из Google Cloud Console
   - Client Secret: скопируйте из Google Cloud Console

5. **Настройте Site URL**
   - В разделе "URL Configuration"
   - Site URL: `http://localhost:5173` (для разработки)
   - Redirect URLs: `http://localhost:5173/**`

### 3. Обновление переменных окружения

Добавьте в `.env` файл (если нужно):

```env
# Google OAuth (опционально, если нужны дополнительные настройки)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4. Тестирование

1. **Запустите приложение**
   ```bash
   npm run dev:client
   npm run dev:server
   ```

2. **Откройте http://localhost:5173**

3. **Нажмите "Sign In"**

4. **Нажмите "Continue with Google"**

5. **Выберите Google аккаунт и авторизуйтесь**

6. **Проверьте, что вы вошли в систему**

### 5. Для продакшна

При развертывании в продакшн:

1. **Обновите Site URL в Supabase**
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/**`

2. **Обновите Google OAuth settings**
   - Добавьте production redirect URI
   - `https://your-project-ref.supabase.co/auth/v1/callback`

3. **Обновите переменные окружения**
   - Site URL: `https://yourdomain.com`

## 🔧 Troubleshooting

### Проблема: "redirect_uri_mismatch"
- Убедитесь, что redirect URI в Google Console точно совпадает с Supabase callback URL
- Проверьте, что нет лишних пробелов или символов

### Проблема: "invalid_client"
- Проверьте, что Client ID и Client Secret правильно скопированы
- Убедитесь, что OAuth consent screen настроен

### Проблема: "access_denied"
- Проверьте настройки OAuth consent screen
- Убедитесь, что приложение опубликовано (если требуется)

## 📱 Мобильная поддержка

Google OAuth работает на мобильных устройствах через:
- Встроенные браузеры (Safari, Chrome)
- WebView в мобильных приложениях
- PWA (Progressive Web App)

## 🚀 Готово!

После настройки пользователи смогут:
- Входить через Google одним кликом
- Регистрироваться через Google
- Не вводить пароли
- Быстро получать доступ к watchlist и премиум функциям
