"use client"

import * as React from "react"
import { BarChart, Bar, XAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface RevenueSparklineProps {
  revenueData: (number | string | null | undefined)[] // [revenueY1, revenueY2, ..., revenueY10] от новых к старым
}

export function RevenueSparkline({ revenueData }: RevenueSparklineProps) {
  // Преобразуем данные: revenueData идет от Y1 (новый) к Y10 (старый)
  // Но для графика нужно от старых к новым (Y10 → Y1)
  // revenueData идет от Y1 (новый, 2025) к Y10 (старый, 2016): [revenueY1, revenueY2, ..., revenueY10]
  // Нужно отобразить Y10 (старый, 2016) слева, Y1 (новый, 2025) справа
  const chartData = revenueData
    .map((value, index) => {
      // index 0 -> revenueY1 (новый, 2025) -> yearIndex должен быть 1 (Y1)
      // index 9 -> revenueY10 (старый, 2016) -> yearIndex должен быть 10 (Y10)
      const yearIndex = index + 1; // Y1, Y2, ..., Y10 (соответствует revenueY1, revenueY2, ..., revenueY10)
      const numValue = value !== null && value !== undefined ? Number(value) : null;
      // Используем год, который на 2 года меньше текущего, так как большинство компаний
      // публикуют годовые отчеты за предыдущий календарный год в начале следующего года
      // Например, в начале 2026 года последний доступный отчет обычно за 2024 год
      // Это предотвращает переключение на новый год до публикации отчетов
      const baseYear = new Date().getFullYear() - 2;
      // yearLabel: для Y1 (index 0) это базовый год (обычно предыдущий календарный год), для Y10 (index 9) это 10 лет назад
      return {
        year: `Y${yearIndex}`,
        yearLabel: `${baseYear - yearIndex + 1}`, // Y1 = базовый год, Y10 = 10 лет назад
        revenue: numValue,
      };
    })
    .filter(item => item.revenue !== null)
    .reverse() // Переворачиваем: Y10 (старый, 2016) слева → Y1 (новый, 2025) справа
    .map((item, index, array) => {
      // Определяем цвет на основе сравнения с предыдущим годом
      // После reverse: array[0] = Y10 (самый старый), array[array.length-1] = Y1 (самый новый)
      let fillColor = "hsl(38, 92%, 50%)"; // yellow-500 по умолчанию
      
      if (index > 0) {
        // Сравниваем с предыдущим годом (более старым)
        const prevRevenue = array[index - 1].revenue;
        const currentRevenue = item.revenue;
        
        if (prevRevenue !== null && currentRevenue !== null && prevRevenue > 0) {
          const changePercent = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
          
          // Зеленый для роста, желтый для падения
          if (changePercent > 0) {
            fillColor = "hsl(142, 76%, 36%)"; // green-600 - рост
          } else {
            fillColor = "hsl(38, 92%, 50%)"; // yellow-500 - падение
          }
        }
      } else {
        // Для первого года (самого старого) используем нейтральный цвет или сравниваем со следующим
        if (array.length > 1) {
          const nextRevenue = array[1].revenue;
          const currentRevenue = item.revenue;
          
          if (nextRevenue !== null && currentRevenue !== null && currentRevenue > 0) {
            const changePercent = ((nextRevenue - currentRevenue) / currentRevenue) * 100;
            
            if (changePercent > 0) {
              fillColor = "hsl(142, 76%, 36%)"; // green-600 - следующий год больше
            } else {
              fillColor = "hsl(38, 92%, 50%)"; // yellow-500 - следующий год меньше
            }
          }
        }
      }
      
      return {
        ...item,
        fill: fillColor,
      };
    });

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[40px]">
        <span className="text-muted-foreground text-xs">N/A</span>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(d => d.revenue!));
  const minValue = Math.min(...chartData.map(d => d.revenue!));

  return (
    <div className="w-full h-[40px] flex items-center">
      <ChartContainer
        config={{
          revenue: {
            label: "Revenue",
            color: "hsl(var(--chart-1))",
          },
        }}
        className="h-full w-full"
      >
        <BarChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
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
              const revenueValue = data.revenue;
              if (revenueValue == null) return null;
              
              // Форматируем revenue в миллиарды или миллионы
              const formatRevenue = (val: number): string => {
                if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
                if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
                return `$${val.toLocaleString()}`;
              };
              
              return (
                <div className="rounded-lg border border-border bg-amber-50 dark:bg-amber-950 p-2.5 shadow-lg">
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-medium text-foreground">{data.yearLabel}</span>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {formatRevenue(revenueValue)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey="revenue"
            radius={[2, 2, 0, 0]}
            fill="#8884d8"
            shape={(props: any) => {
              const { payload, ...rest } = props;
              return <rect {...rest} fill={payload.fill} />;
            }}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

