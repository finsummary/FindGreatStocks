# Инструкция по выполнению миграции базы данных

## Проблема
В таблице `sp500_companies` отсутствуют колонки:
- `roic_stability` (NUMERIC(10, 4))
- `roic_stability_score` (NUMERIC(10, 2))
- `fcf_margin` (NUMERIC(10, 4))

## Решение

### Шаг 1: Выполнить SQL миграцию в Supabase

1. Откройте Supabase Dashboard: https://supabase.com/dashboard
2. Выберите ваш проект (production)
3. Перейдите в **SQL Editor**
4. Скопируйте и выполните SQL из файла `migrations/add-roic-stability-fcf-margin-columns.sql`:

```sql
-- Add columns to sp500_companies table
ALTER TABLE sp500_companies
ADD COLUMN IF NOT EXISTS roic_stability NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS roic_stability_score NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS fcf_margin NUMERIC(10, 4);

-- Add columns to companies table (for consistency)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS roic_stability NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS roic_stability_score NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS fcf_margin NUMERIC(10, 4);

-- Add columns to nasdaq100_companies table (for consistency)
ALTER TABLE nasdaq100_companies
ADD COLUMN IF NOT EXISTS roic_stability NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS roic_stability_score NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS fcf_margin NUMERIC(10, 4);

-- Add columns to dow_jones_companies table (for consistency)
ALTER TABLE dow_jones_companies
ADD COLUMN IF NOT EXISTS roic_stability NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS roic_stability_score NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS fcf_margin NUMERIC(10, 4);

-- Add columns to ftse100_companies table (for consistency)
ALTER TABLE ftse100_companies
ADD COLUMN IF NOT EXISTS roic_stability NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS roic_stability_score NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS fcf_margin NUMERIC(10, 4);
```

5. Нажмите **Run** или **Execute**

### Шаг 2: Перезапустить скрипт заполнения данных

После выполнения миграции, скрипт заполнения данных можно перезапустить через API endpoint.






