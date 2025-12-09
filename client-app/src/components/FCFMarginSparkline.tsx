"use client"

import * as React from "react"
import { BarChart, Bar, XAxis, ReferenceLine } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface FCFMarginSparklineProps {
  fcfMarginData: (number | string | null | undefined)[] // [fcfMarginY1, fcfMarginY2, ..., fcfMarginY10] от новых к старым
  fcfMarginMedian10Y?: number | string | null // Median FCF Margin за 10 лет
}

export function FCFMarginSparkline({ fcfMarginData, fcfMarginMedian10Y }: FCFMarginSparklineProps) {
  // Преобразуем данные: fcfMarginData идет от Y1 (новый) к Y10 (старый)
  // Но для графика нужно от старых к новым (Y10 → Y1)
  // fcfMarginData идет от Y1 (новый, 2025) к Y10 (старый, 2016): [fcfMarginY1, fcfMarginY2, ..., fcfMarginY10]
  // Нужно отобразить Y10 (старый, 2016) слева, Y1 (новый, 2025) справа
  const chartData = fcfMarginData
    .map((value, index) => {
      // index 0 -> fcfMarginY1 (новый, 2025) -> yearIndex должен быть 1 (Y1)
      // index 9 -> fcfMarginY10 (старый, 2016) -> yearIndex должен быть 10 (Y10)
      const yearIndex = index + 1; // Y1, Y2, ..., Y10 (соответствует fcfMarginY1, fcfMarginY2, ..., fcfMarginY10)
      const numValue = value !== null && value !== undefined ? Number(value) : null;
      const fcfMarginPercent = numValue !== null ? numValue * 100 : null;
      // Определяем цвет на основе значения (те же пороги, что и для ROIC)
      let fillColor = "hsl(0, 72%, 51%)"; // red-600 по умолчанию
      if (fcfMarginPercent !== null) {
        if (fcfMarginPercent > 15) fillColor = "hsl(142, 76%, 36%)"; // green-600
        else if (fcfMarginPercent > 5) fillColor = "hsl(38, 92%, 50%)"; // yellow-500
        else if (fcfMarginPercent > 0) fillColor = "hsl(0, 84%, 60%)"; // red-500
      }
      const currentYear = new Date().getFullYear();
      // yearLabel: для Y1 (index 0) это текущий год, для Y10 (index 9) это 10 лет назад
      return {
        year: `Y${yearIndex}`,
        yearLabel: `${currentYear - yearIndex + 1}`, // Y1 = текущий год, Y10 = 10 лет назад
        fcfMargin: fcfMarginPercent,
        fill: fillColor,
      };
    })
    .filter(item => item.fcfMargin !== null)
    .reverse(); // Переворачиваем: Y10 (старый, 2016) слева → Y1 (новый, 2025) справа

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[40px]">
        <span className="text-muted-foreground text-xs">N/A</span>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(d => d.fcfMargin!));
  const minValue = Math.min(...chartData.map(d => d.fcfMargin!));

  // Вычисляем медиану в процентах для отображения на графике
  const medianPercent = fcfMarginMedian10Y != null && fcfMarginMedian10Y !== undefined 
    ? Number(fcfMarginMedian10Y) * 100 
    : null;

  return (
    <div className="w-full h-[40px] flex items-center">
      <ChartContainer
        config={{
          fcfMargin: {
            label: "FCF Margin %",
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
              const fcfMarginValue = data.fcfMargin;
              let colorClass = "text-red-600 dark:text-red-400";
              if (fcfMarginValue > 15) {
                colorClass = "text-green-600 dark:text-green-400";
              } else if (fcfMarginValue > 5) {
                colorClass = "text-yellow-600 dark:text-yellow-400";
              }
              return (
                <div className="rounded-lg border border-border bg-amber-50 dark:bg-amber-950 p-2.5 shadow-lg">
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-medium text-foreground">{data.yearLabel}</span>
                      <span className={`font-mono text-xs font-semibold ${colorClass}`}>
                        {fcfMarginValue?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          {medianPercent !== null && (
            <ReferenceLine
              y={medianPercent}
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="0"
            />
          )}
          <Bar
            dataKey="fcfMargin"
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

