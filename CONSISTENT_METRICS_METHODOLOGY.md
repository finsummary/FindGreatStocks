# Консистентная методология для всех компаний

## Проблема
Ранее метрики `roic_stability`, `roic_stability_score`, `fcf_margin` вычислялись только динамически в UI для существующих компаний, но сохранялись в БД только для новых компаний. Это создавало непоследовательность.

## Решение
Теперь эти метрики **сохраняются в БД для ВСЕХ компаний** во всех индексах.

## Компоненты системы

### 1. Утилита для вычисления метрик
**Файл:** `server/utils/derived-metrics.ts`

Содержит функции:
- `calculateDerivedMetrics()` - вычисляет метрики из базовых данных
- `formatDerivedMetricsForDB()` - форматирует для сохранения в БД

**Используется в:**
- Daily updaters (ежедневные обновления)
- Population scripts (скрипты заполнения данных)

### 2. Скрипт для заполнения всех компаний
**Файл:** `server/populate-derived-metrics-all.ts`

Заполняет метрики для всех компаний во всех таблицах:
- `sp500_companies`
- `nasdaq100_companies`
- `dow_jones_companies`
- `ftse100_companies`

**Запуск:**
```bash
tsx server/populate-derived-metrics-all.ts
```

**Или через API:**
```bash
POST /api/metrics/populate-derived-all
```

### 3. Обновленные Daily Updaters

Все daily updaters теперь обновляют эти метрики при обновлении цен:
- `server/sp500-daily-updater.ts`
- `server/nasdaq100-daily-updater.ts` (нужно обновить)
- `server/dowjones-daily-updater.ts` (нужно обновить)
- `server/ftse100-daily-updater.ts` (нужно обновить)

## Формулы

### ROIC Stability Ratio
```
roic_stability = roic_10y_avg / roic_10y_std
```

### ROIC Stability Score
```
cv = roic_10y_std / roic_10y_avg  // Coefficient of variation
roic_stability_score = min(100, max(0, 100 * (1 - min(cv, 1))))
```

### FCF Margin
```
fcf_margin = latest_fcf / revenue
// Clamped to range [-2, 2]
```

## Процесс для новых компаний

1. **Добавление новых компаний в индекс:**
   - Используйте `server/populate-new-sp500-companies.ts` (или аналогичный для других индексов)
   - Скрипт автоматически вычисляет и сохраняет все метрики, включая derived metrics

2. **После добавления новых компаний:**
   - Запустите `populate-derived-metrics-all.ts` для обновления всех компаний (опционально, для консистентности)

## Процесс для ежедневных обновлений

Daily updaters автоматически обновляют derived metrics при обновлении цен, если доступны необходимые данные (`roic_10y_avg`, `roic_10y_std`, `latest_fcf`, `revenue`).

## Процесс для периодического обновления

Для обновления всех компаний раз в неделю/месяц:
```bash
POST /api/metrics/populate-derived-all
```

## Преимущества

1. **Консистентность** - все компании имеют метрики в БД
2. **Производительность** - UI использует готовые значения из БД
3. **Масштабируемость** - легко добавлять новые компании и рынки
4. **Единая методология** - одинаковый процесс для всех индексов

## Миграция существующих данных

Для заполнения метрик для всех существующих компаний:

1. **Выполните SQL миграцию** (если еще не выполнено):
   ```sql
   -- migrations/add-roic-stability-fcf-margin-columns.sql
   ```

2. **Запустите скрипт заполнения:**
   ```bash
   tsx server/populate-derived-metrics-all.ts
   ```

   Или через API:
   ```bash
   POST /api/metrics/populate-derived-all
   ```

## Будущие улучшения

1. Автоматическое обновление derived metrics при изменении финансовых данных
2. Добавление метрик в scheduler для периодического обновления
3. Мониторинг и алерты при отсутствии данных

