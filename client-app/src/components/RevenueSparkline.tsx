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
      const currentYear = new Date().getFullYear();
      // yearLabel: для Y1 (index 0) это текущий год, для Y10 (index 9) это 10 лет назад
      return {
        year: `Y${yearIndex}`,
        yearLabel: `${currentYear - yearIndex + 1}`, // Y1 = текущий год, Y10 = 10 лет назад
        revenue: numValue,
      };
    })
    .filter(item => item.revenue !== null)
    .reverse(); // Переворачиваем: Y10 (старый, 2016) слева → Y1 (новый, 2025) справа

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
            fill="hsl(221, 83%, 53%)"
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

