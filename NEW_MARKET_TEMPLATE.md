# Шаблон для добавления нового рынка

Используйте этот шаблон для быстрого заполнения информации о новом индексе.

## Информация об индексе

- **Название:** [Например: FTSE 100, S&P 400 Mid Cap, CAC 40]
- **Код индекса:** [Например: ftse100, sp400, cac40]
- **Table name:** [Например: ftse100_companies]
- **Schema name:** [Например: ftse100Companies]
- **API endpoint:** [Например: /api/ftse100]
- **UI dataset code:** [Например: ftse100]
- **FMP API endpoint:** [Например: ftse_constituent или N/A]

## Список компаний

[Вставьте список всех компаний индекса с их символами]

## Чеклист выполнения

### База данных
- [ ] SQL миграция создана: `migrations/add-{index_code}-table.sql`
- [ ] Миграция выполнена в Supabase SQL Editor
- [ ] Таблица создана и проверена

### Backend
- [ ] Drizzle schema добавлена в `shared/schema.ts`
- [ ] API GET endpoint добавлен: `/api/{index_code}`
- [ ] API POST endpoints добавлены (populate, remove - если нужны)
- [ ] `index-management.ts` обновлен

### Frontend
- [ ] Типы TypeScript обновлены в `client-app/src/types/index.ts`
- [ ] `CompanyTable` component обновлен
- [ ] Вкладка добавлена в `client-app/src/pages/home.tsx`
- [ ] API endpoint mapping добавлен

### Скрипты
- [ ] Скрипт заполнения данных создан: `server/populate-new-{index_code}-companies.ts`
- [ ] Скрипт управления создан: `call-{index_code}-update.js` (если нужен)
- [ ] Daily updater создан: `server/{index_code}-daily-updater.ts` (если нужен)
- [ ] Скрипт импорта создан: `server/{index_code}-import.ts`

### Тестирование
- [ ] API endpoint протестирован
- [ ] UI вкладка отображается
- [ ] Данные загружаются корректно
- [ ] Все layouts работают
- [ ] Заполнение данных работает

### Деплой
- [ ] Все изменения закоммичены
- [ ] Изменения запушены в GitHub
- [ ] Railway деплой успешен
- [ ] Vercel деплой успешен
- [ ] Production проверен

## Заметки

[Добавьте любые специфичные заметки для этого индекса]

