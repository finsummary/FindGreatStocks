# Пример: ROIC Historical Sparkline

## Визуальное представление в таблице

```
┌─────────────────────────────────────────────────────────────┐
│ Company │ Market Cap │ Price │ ROIC History (10Y)           │
├─────────┼────────────┼───────┼──────────────────────────────┤
│ AAPL    │ $3.2T     │ $180  │ ▁▃▅▇█▇▆▅▄▃  [Sparkline]     │
│         │           │       │ 10Y: 25% 15% 18% 22% 28%...  │
│         │           │       │ (при hover показывается год) │
├─────────┼────────────┼───────┼──────────────────────────────┤
│ MSFT    │ $2.8T     │ $380  │ ▂▄▆█▇▆▅▄▃▂  [Sparkline]     │
│         │           │       │ 10Y: 12% 15% 18% 25% 22%...  │
└─────────┴────────────┴───────┴──────────────────────────────┘
```

## Пример кода компонента

```tsx
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// Компонент для отображения ROIC sparkline
function ROICSparkline({ roicData }: { roicData: (number | null)[] }) {
  // Преобразуем данные в формат для графика
  // roicData = [roicY1, roicY2, ..., roicY10] (от старых к новым)
  const chartData = roicData
    .map((value, index) => ({
      year: `Y${10 - index}`, // Y10 (самый старый) до Y1 (самый новый)
      roic: value !== null ? Number(value) * 100 : null, // Конвертируем в проценты
    }))
    .filter(item => item.roic !== null)
    .reverse(); // Переворачиваем, чтобы показать от старых к новым слева направо

  if (chartData.length === 0) {
    return <span className="text-muted-foreground text-xs">N/A</span>;
  }

  const maxValue = Math.max(...chartData.map(d => d.roic!));
  const minValue = Math.min(...chartData.map(d => d.roic!));
  const range = maxValue - minValue || 1;

  return (
    <div className="w-full h-[40px] flex items-center">
      <ChartContainer
        config={{
          roic: {
            label: "ROIC %",
            color: "hsl(var(--chart-1))",
          },
        }}
        className="h-full w-full"
      >
        <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis 
            dataKey="year" 
            hide 
            tick={false}
            axisLine={false}
          />
          <ChartTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">Year {data.year}</span>
                      <span className="font-mono text-xs font-medium">
                        {data.roic?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey="roic"
            fill="var(--color-roic)"
            radius={[2, 2, 0, 0]}
            style={{
              fill: (entry: any) => {
                const value = entry.roic;
                // Зеленый для положительных, красный для отрицательных
                if (value > 15) return "hsl(142, 76%, 36%)"; // green-600
                if (value > 5) return "hsl(38, 92%, 50%)"; // yellow-500
                if (value > 0) return "hsl(0, 84%, 60%)"; // red-500
                return "hsl(0, 72%, 51%)"; // red-600 для отрицательных
              },
            }}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
```

## Как это будет выглядеть в ячейке таблицы

### Вариант 1: Компактный (рекомендуемый)
```
┌─────────────────────────────┐
│  ▁▃▅▇█▇▆▅▄▃                │  ← Sparkline (высота 40px)
│  10Y ROIC History           │  ← Подпись (опционально)
└─────────────────────────────┘
```

### Вариант 2: С мини-легендой
```
┌─────────────────────────────┐
│  ▁▃▅▇█▇▆▅▄▃                │
│  Y10→Y1  Avg: 22.5%         │
└─────────────────────────────┘
```

## Пример данных

Для компании с ROIC историей:
- Y10 (2014): 15% → ▁ (низкий столбец)
- Y9 (2015): 18% → ▃
- Y8 (2016): 20% → ▅
- Y7 (2017): 22% → ▆
- Y6 (2018): 25% → ▇
- Y5 (2019): 28% → █ (высокий столбец)
- Y4 (2020): 26% → ▇
- Y3 (2021): 24% → ▆
- Y2 (2022): 22% → ▅
- Y1 (2023): 20% → ▄

## Цветовая схема

- **Зеленый** (≥15%): Отличный ROIC
- **Желтый** (5-15%): Хороший ROIC
- **Оранжевый/Красный** (0-5%): Слабый ROIC
- **Красный** (<0%): Отрицательный ROIC

## Размеры

- **Ширина колонки**: ~150-180px (чтобы поместились 10 столбцов)
- **Высота sparkline**: 40-50px
- **Отступы**: минимальные для компактности

