/**
 * Pure helpers for sorting by columns that are computed from other fields (not a single DB column).
 * Used by CompanyTable queryFn and cell renderers.
 */
export function getComputedMetricValue(row: Record<string, unknown>, colId: string): number | null {
  switch (colId) {
    case "revenueGrowth1Y": {
      const revenueY1 = row.revenueY1 ?? row.revenue_y1;
      const revenueY2 = row.revenueY2 ?? row.revenue_y2;
      if (revenueY1 != null && revenueY2 != null) {
        const rev1 = Number(revenueY1);
        const rev2 = Number(revenueY2);
        if (!isNaN(rev1) && !isNaN(rev2) && rev2 > 0) {
          return ((rev1 - rev2) / rev2) * 100;
        }
      }
      return null;
    }
    case "projectedRevenue5Y": {
      const currentRevenue = row.revenue != null ? Number(row.revenue) : null;
      const growth10Y = row.revenueGrowth10Y != null ? Number(row.revenueGrowth10Y) / 100 : null;
      const growth5Y = row.revenueGrowth5Y != null ? Number(row.revenueGrowth5Y) / 100 : null;
      const growth1Y = (() => {
        const ry1 = row.revenueY1 ?? row.revenue_y1;
        const ry2 = row.revenueY2 ?? row.revenue_y2;
        if (ry1 != null && ry2 != null) {
          const rev1 = Number(ry1);
          const rev2 = Number(ry2);
          if (!isNaN(rev1) && !isNaN(rev2) && rev2 > 0) {
            return (rev1 - rev2) / rev2;
          }
        }
        return null;
      })();
      const growthRate = growth10Y ?? growth5Y ?? growth1Y ?? null;
      if (currentRevenue === null || growthRate === null || !isFinite(currentRevenue) || !isFinite(growthRate)) {
        return null;
      }
      return currentRevenue * Math.pow(1 + growthRate, 5);
    }
    case "projectedRevenue10Y": {
      const currentRevenue = row.revenue != null ? Number(row.revenue) : null;
      const growth10Y = row.revenueGrowth10Y != null ? Number(row.revenueGrowth10Y) / 100 : null;
      const growth5Y = row.revenueGrowth5Y != null ? Number(row.revenueGrowth5Y) / 100 : null;
      const growth1Y = (() => {
        const ry1 = row.revenueY1 ?? row.revenue_y1;
        const ry2 = row.revenueY2 ?? row.revenue_y2;
        if (ry1 != null && ry2 != null) {
          const rev1 = Number(ry1);
          const rev2 = Number(ry2);
          if (!isNaN(rev1) && !isNaN(rev2) && rev2 > 0) {
            return (rev1 - rev2) / rev2;
          }
        }
        return null;
      })();
      const growthRate = growth10Y ?? growth5Y ?? growth1Y ?? null;
      if (currentRevenue === null || growthRate === null || !isFinite(currentRevenue) || !isFinite(growthRate)) {
        return null;
      }
      return currentRevenue * Math.pow(1 + growthRate, 10);
    }
    case "projectedEarnings5Y": {
      const currentRevenue = row.revenue != null ? Number(row.revenue) : null;
      const growth10Y = row.revenueGrowth10Y != null ? Number(row.revenueGrowth10Y) / 100 : null;
      const growth5Y = row.revenueGrowth5Y != null ? Number(row.revenueGrowth5Y) / 100 : null;
      const growth1Y = (() => {
        const ry1 = row.revenueY1 ?? row.revenue_y1;
        const ry2 = row.revenueY2 ?? row.revenue_y2;
        if (ry1 != null && ry2 != null) {
          const rev1 = Number(ry1);
          const rev2 = Number(ry2);
          if (!isNaN(rev1) && !isNaN(rev2) && rev2 > 0) {
            return (rev1 - rev2) / rev2;
          }
        }
        return null;
      })();
      const earningsMargin = row.netProfitMargin != null ? Number(row.netProfitMargin) / 100 : null;
      const growthRate = growth10Y ?? growth5Y ?? growth1Y ?? null;
      if (
        currentRevenue === null ||
        growthRate === null ||
        earningsMargin === null ||
        !isFinite(currentRevenue) ||
        !isFinite(growthRate) ||
        !isFinite(earningsMargin)
      ) {
        return null;
      }
      const projectedRevenue = currentRevenue * Math.pow(1 + growthRate, 5);
      return projectedRevenue * earningsMargin;
    }
    case "projectedEarnings10Y": {
      const currentRevenue = row.revenue != null ? Number(row.revenue) : null;
      const growth10Y = row.revenueGrowth10Y != null ? Number(row.revenueGrowth10Y) / 100 : null;
      const growth5Y = row.revenueGrowth5Y != null ? Number(row.revenueGrowth5Y) / 100 : null;
      const growth1Y = (() => {
        const ry1 = row.revenueY1 ?? row.revenue_y1;
        const ry2 = row.revenueY2 ?? row.revenue_y2;
        if (ry1 != null && ry2 != null) {
          const rev1 = Number(ry1);
          const rev2 = Number(ry2);
          if (!isNaN(rev1) && !isNaN(rev2) && rev2 > 0) {
            return (rev1 - rev2) / rev2;
          }
        }
        return null;
      })();
      const earningsMargin = row.netProfitMargin != null ? Number(row.netProfitMargin) / 100 : null;
      const growthRate = growth10Y ?? growth5Y ?? growth1Y ?? null;
      if (
        currentRevenue === null ||
        growthRate === null ||
        earningsMargin === null ||
        !isFinite(currentRevenue) ||
        !isFinite(growthRate) ||
        !isFinite(earningsMargin)
      ) {
        return null;
      }
      const projectedRevenue = currentRevenue * Math.pow(1 + growthRate, 10);
      return projectedRevenue * earningsMargin;
    }
    case "marketCapToEarnings5Y": {
      const marketCap = row.marketCap != null ? Number(row.marketCap) : null;
      const currentRevenue = row.revenue != null ? Number(row.revenue) : null;
      const growth10Y = row.revenueGrowth10Y != null ? Number(row.revenueGrowth10Y) / 100 : null;
      const growth5Y = row.revenueGrowth5Y != null ? Number(row.revenueGrowth5Y) / 100 : null;
      const growth1Y = (() => {
        const ry1 = row.revenueY1 ?? row.revenue_y1;
        const ry2 = row.revenueY2 ?? row.revenue_y2;
        if (ry1 != null && ry2 != null) {
          const rev1 = Number(ry1);
          const rev2 = Number(ry2);
          if (!isNaN(rev1) && !isNaN(rev2) && rev2 > 0) {
            return (rev1 - rev2) / rev2;
          }
        }
        return null;
      })();
      const earningsMargin = row.netProfitMargin != null ? Number(row.netProfitMargin) / 100 : null;
      const growthRate = growth10Y ?? growth5Y ?? growth1Y ?? null;
      if (
        marketCap === null ||
        currentRevenue === null ||
        growthRate === null ||
        earningsMargin === null ||
        !isFinite(marketCap) ||
        !isFinite(currentRevenue) ||
        !isFinite(growthRate) ||
        !isFinite(earningsMargin) ||
        marketCap <= 0
      ) {
        return null;
      }
      const projectedRevenue = currentRevenue * Math.pow(1 + growthRate, 5);
      const projectedEarnings = projectedRevenue * earningsMargin;
      if (projectedEarnings <= 0) {
        return null;
      }
      return marketCap / projectedEarnings;
    }
    case "marketCapToEarnings10Y": {
      const marketCap = row.marketCap != null ? Number(row.marketCap) : null;
      const currentRevenue = row.revenue != null ? Number(row.revenue) : null;
      const growth10Y = row.revenueGrowth10Y != null ? Number(row.revenueGrowth10Y) / 100 : null;
      const growth5Y = row.revenueGrowth5Y != null ? Number(row.revenueGrowth5Y) / 100 : null;
      const growth1Y = (() => {
        const ry1 = row.revenueY1 ?? row.revenue_y1;
        const ry2 = row.revenueY2 ?? row.revenue_y2;
        if (ry1 != null && ry2 != null) {
          const rev1 = Number(ry1);
          const rev2 = Number(ry2);
          if (!isNaN(rev1) && !isNaN(rev2) && rev2 > 0) {
            return (rev1 - rev2) / rev2;
          }
        }
        return null;
      })();
      const earningsMargin = row.netProfitMargin != null ? Number(row.netProfitMargin) / 100 : null;
      const growthRate = growth10Y ?? growth5Y ?? growth1Y ?? null;
      if (
        marketCap === null ||
        currentRevenue === null ||
        growthRate === null ||
        earningsMargin === null ||
        !isFinite(marketCap) ||
        !isFinite(currentRevenue) ||
        !isFinite(growthRate) ||
        !isFinite(earningsMargin) ||
        marketCap <= 0
      ) {
        return null;
      }
      const projectedRevenue = currentRevenue * Math.pow(1 + growthRate, 10);
      const projectedEarnings = projectedRevenue * earningsMargin;
      if (projectedEarnings <= 0) {
        return null;
      }
      return marketCap / projectedEarnings;
    }
    default:
      return null;
  }
}

export const COMPUTED_SORT_COLUMN_IDS = [
  "revenueGrowth1Y",
  "projectedRevenue5Y",
  "projectedRevenue10Y",
  "projectedEarnings5Y",
  "projectedEarnings10Y",
  "marketCapToEarnings5Y",
  "marketCapToEarnings10Y",
] as const;

export const DERIVED_METRIC_SORT_KEYS = ["roicStability", "roicStabilityScore", "fcfMargin"] as const;

export function needsFullIndexClientSort(sortKey: string): boolean {
  return (
    (DERIVED_METRIC_SORT_KEYS as readonly string[]).includes(sortKey) ||
    (COMPUTED_SORT_COLUMN_IDS as readonly string[]).includes(sortKey)
  );
}
