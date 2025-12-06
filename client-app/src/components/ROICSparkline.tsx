"use client"

import * as React from "react"
import { BarChart, Bar, XAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface ROICSparklineProps {
  roicData: (number | string | null | undefined)[] // [roicY1, roicY2, ..., roicY10] от новых к старым
}

export function ROICSparkline({ roicData }: ROICSparklineProps) {
  // Преобразуем данные: roicData идет от Y1 (новый) к Y10 (старый)
  // Но для графика нужно от старых к новым (Y10 → Y1)
  const chartData = roicData
    .map((value, index) => {
      const yearIndex = 10 - index; // Y10, Y9, ..., Y1
      const numValue = value !== null && value !== undefined ? Number(value) : null;
      const roicPercent = numValue !== null ? numValue * 100 : null;
      // Определяем цвет на основе значения
      let fillColor = "hsl(0, 72%, 51%)"; // red-600 по умолчанию
      if (roicPercent !== null) {
        if (roicPercent > 15) fillColor = "hsl(142, 76%, 36%)"; // green-600
        else if (roicPercent > 5) fillColor = "hsl(38, 92%, 50%)"; // yellow-500
        else if (roicPercent > 0) fillColor = "hsl(0, 84%, 60%)"; // red-500
      }
      return {
        year: `Y${yearIndex}`,
        yearLabel: `${new Date().getFullYear() - yearIndex + 1}`, // Примерно год
        roic: roicPercent,
        fill: fillColor,
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

