"use client"

import * as React from "react"
import { BarChart, Bar, XAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface ROICSparklineProps {
  roicData: (number | string | null)[] // [roicY1, roicY2, ..., roicY10] от новых к старым
}

export function ROICSparkline({ roicData }: ROICSparklineProps) {
  // Преобразуем данные: roicData идет от Y1 (новый) к Y10 (старый)
  // Но для графика нужно от старых к новым (Y10 → Y1)
  const chartData = roicData
    .map((value, index) => {
      const yearIndex = 10 - index; // Y10, Y9, ..., Y1
      const numValue = value !== null && value !== undefined ? Number(value) : null;
      return {
        year: `Y${yearIndex}`,
        yearLabel: `${new Date().getFullYear() - yearIndex + 1}`, // Примерно год
        roic: numValue !== null ? numValue * 100 : null, // Конвертируем в проценты
      };
    })
    .filter(item => item.roic !== null)
    .reverse(); // Переворачиваем для отображения Y10 → Y1 слева направо

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[40px]">
        <span className="text-muted-foreground text-xs">N/A</span>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(d => d.roic!));
  const minValue = Math.min(...chartData.map(d => d.roic!));

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
              const roicValue = data.roic;
              let colorClass = "text-red-600";
              if (roicValue > 15) {
                colorClass = "text-green-600";
              } else if (roicValue > 5) {
                colorClass = "text-yellow-600";
              }
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">{data.year} ({data.yearLabel})</span>
                      <span className={`font-mono text-xs font-medium ${colorClass}`}>
                        {roicValue?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey="roic"
            radius={[2, 2, 0, 0]}
            style={{
              fill: (entry: any) => {
                const value = entry.roic;
                // Цветовая схема: зеленый для отличного, желтый для хорошего, красный для слабого
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

