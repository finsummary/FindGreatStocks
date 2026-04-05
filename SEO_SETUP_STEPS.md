# Пошаговая настройка SEO (Phase 1)

Следуйте шагам по порядку.

---

## Шаг 1: Применить миграцию базы данных

Нужно создать в вашей базе (Supabase) две таблицы: `page_cache` и `internal_links`.

**Вариант A — через Supabase Dashboard**

1. Откройте [Supabase](https://supabase.com) → ваш проект → **SQL Editor**.
2. Откройте файл в проекте: `migrations/add-seo-page-cache-and-internal-links.sql`.
3. Скопируйте весь текст из этого файла в редактор SQL в Supabase.
4. Нажмите **Run** (или Execute).

**Вариант B — через командную строку (если есть `psql`)**

```bash
# Подставьте свою строку подключения из Supabase (Settings → Database → Connection string)
psql "ВАША_СТРОКА_ПОДКЛЮЧЕНИЯ" -f migrations/add-seo-page-cache-and-internal-links.sql
```

После выполнения ошибок быть не должно. Таблицы `page_cache` и `internal_links` появятся в базе.

---

## Шаг 2: Настроить переменные окружения сервера (Express API)

Файл: **`.env`** в **корне** проекта FindGreatStocks (рядом с `package.json`).

Добавьте (или проверьте) строки:

```env
# Уже должны быть:
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ваш-ключ
CLIENT_URL=https://findgreatstocks.com
# или для локальной разработки:
# CLIENT_URL=http://localhost:5173

# Добавьте для генерации AI-текстов (обязательно для generate-summary):
GROQ_API_KEY=ваш-groq-api-key

# По желанию (по умолчанию уже заданы):
# GROQ_MODEL=llama-3.1-8b-instant
# GROQ_API_URL=https://api.groq.com/openai/v1
```

**Где взять GROQ_API_KEY:**  
Зарегистрируйтесь на [console.groq.com](https://console.groq.com), создайте API Key и вставьте его в `GROQ_API_KEY`.

Если ключ Groq не добавить, сайт и API будут работать, но вызов «сгенерировать текст» (шаг 6) будет выдавать ошибку — это нормально.

---

## Шаг 3: Запустить основной API (сервер)

В корне проекта выполните:

```bash
npm install
npm run start
```

Или для разработки с автоперезапуском:

```bash
cd server
npm run dev
```

Должно появиться что-то вроде: `Server listening on port 5002`.  
Проверка: откройте в браузере `http://localhost:5002/api/health` — должен вернуться JSON с `"status":"ok"`.

---

## Шаг 4: Установить зависимости и запустить SEO-приложение (Next.js)

В **новом** терминале (основной сервер пусть продолжает работать):

```bash
cd seo-app
npm install
```

Создайте файл **`seo-app/.env.local`** с содержимым:

```env
# Адрес вашего Express API (на локальной машине — так)
SEO_API_BASE=http://localhost:5002

# Для продакшена подставьте свой домен, например:
# SEO_API_BASE=https://api.findgreatstocks.com

# URL самого SEO-сайта (для sitemap и ссылок)
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Куда ведёт кнопка «Open in Scanner» (основное приложение)
NEXT_PUBLIC_CLIENT_URL=http://localhost:5173
```

Затем запустите SEO-приложение:

```bash
npm run dev
```

Должно появиться: `Ready on http://localhost:3001`.

---

## Шаг 5: Проверить, что всё работает

1. **API компании**  
   В браузере: `http://localhost:5002/api/seo/company/aapl`  
   Должен вернуться JSON с данными компании Apple.

2. **SEO-страница компании**  
   В браузере: `http://localhost:3001/stocks/aapl`  
   Должна открыться страница с данными Apple и кнопкой «Open in Scanner».

3. **Другие типы страниц**  
   - Стратегия: `http://localhost:3001/strategy/high-roic-stocks`  
   - Сектор: `http://localhost:3001/sector/software`  
   - Сравнение: `http://localhost:3001/compare/apple-vs-microsoft`  
   - Оценка: `http://localhost:3001/valuation/stocks-priced-for-low-growth`

4. **Ссылка в сканер**  
   Запустите основное клиентское приложение (Vite), откройте в браузере:  
   `http://localhost:5173/?dataset=sp500&sortBy=roic&sortOrder=desc`  
   Должен открыться сканер с выбранным S&P 500 и сортировкой по ROIC.

Если всё так и есть — базовая настройка завершена.

---

## Шаг 6 (по желанию): Сгенерировать AI-тексты для страниц

AI-тексты не генерируются при каждом заходе. Их нужно один раз (или по необходимости) запросить через API.

**Пример: сгенерировать текст для страницы компании Apple**

В терминале (или Postman / Insomnia):

```bash
curl -X POST http://localhost:5002/api/seo/generate-summary \
  -H "Content-Type: application/json" \
  -d "{\"pageType\":\"company\",\"pageSlug\":\"aapl\",\"entityKey\":\"aapl\",\"payload\":{\"name\":\"Apple Inc.\",\"sector\":\"Technology\",\"industry\":\"Consumer Electronics\",\"marketCap\":\"3T\",\"revenueGrowth3Y\":\"0.08\",\"revenueGrowth5Y\":\"0.10\",\"roic\":\"0.55\",\"dcfImpliedGrowth\":\"0.05\"}}"
```

Или сначала получите актуальные данные компании и подставьте их в `payload`:

1. Откройте `http://localhost:5002/api/seo/company/aapl`.
2. Скопируйте объект `company` из ответа.
3. Отправьте POST на `http://localhost:5002/api/seo/generate-summary` с телом:

```json
{
  "pageType": "company",
  "pageSlug": "aapl",
  "entityKey": "aapl",
  "payload": <вставьте сюда объект company>
}
```

После успешного ответа обновите страницу `http://localhost:3001/stocks/aapl` — должен появиться AI-текст (summary).

Аналогично можно вызывать `generate-summary` для других типов страниц (`strategy`, `sector`, `compare`, `valuation`), подставляя нужные `pageType`, `pageSlug`, `entityKey` и `payload` (формат описан в `server/prompts.ts` и в `SEO_README.md`).

---

## Краткая сводка

| Шаг | Действие | Где |
|-----|----------|-----|
| 1 | Выполнить SQL миграцию | Supabase SQL Editor или `psql` |
| 2 | Добавить `GROQ_API_KEY` (и при необходимости другие переменные) | Корень проекта, файл `.env` |
| 3 | Запустить API | В корне: `npm run start` или в `server`: `npm run dev` |
| 4 | Установить зависимости и создать `.env.local`, запустить SEO-приложение | В папке `seo-app`: `npm install`, затем `npm run dev` |
| 5 | Проверить API, SEO-страницы и ссылку в сканер | Браузер: порты 5002, 3001, 5173 |
| 6 | По желанию сгенерировать AI-тексты | POST на `/api/seo/generate-summary` |

Если на каком-то шаге появится ошибка — пришлите текст ошибки и номер шага, разберём точечно.
