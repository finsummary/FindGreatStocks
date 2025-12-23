/**
 * Utility functions for calculating derived metrics
 * Used in daily updaters and population scripts
 */

export interface DerivedMetrics {
  roicStability: number | null;
  roicStabilityScore: number | null;
  fcfMargin: number | null;
}

/**
 * Calculate derived metrics from base data
 */
export function calculateDerivedMetrics(data: {
  roic10YAvg: number | string | null;
  roic10YStd: number | string | null;
  latestFcf: number | string | null;
  freeCashFlow: number | string | null;
  revenue: number | string | null;
}): DerivedMetrics {
  const result: DerivedMetrics = {
    roicStability: null,
    roicStabilityScore: null,
    fcfMargin: null,
  };

  // Calculate ROIC Stability metrics
  const roic10YAvg = data.roic10YAvg ? parseFloat(String(data.roic10YAvg)) : null;
  const roic10YStd = data.roic10YStd ? parseFloat(String(data.roic10YStd)) : null;

  if (roic10YAvg !== null && roic10YStd !== null && isFinite(roic10YStd) && roic10YStd > 0) {
    const roicStability = roic10YAvg / roic10YStd;
    const cv = roic10YStd / roic10YAvg; // Coefficient of variation
    const roicStabilityScore = Math.max(0, Math.min(100, 100 * (1 - Math.min(cv, 1))));

    result.roicStability = roicStability;
    result.roicStabilityScore = roicStabilityScore;
  }

  // Calculate FCF Margin
  const latestFcf = data.latestFcf ? parseFloat(String(data.latestFcf)) : 
                   (data.freeCashFlow ? parseFloat(String(data.freeCashFlow)) : null);
  const revenue = data.revenue ? parseFloat(String(data.revenue)) : null;

  if (latestFcf !== null && revenue !== null && revenue > 0) {
    let fcfMargin = latestFcf / revenue;
    // Clamp to reasonable range
    if (fcfMargin > 2) fcfMargin = 2;
    if (fcfMargin < -2) fcfMargin = -2;
    result.fcfMargin = fcfMargin;
  }

  return result;
}

/**
 * Format derived metrics for database update
 */
export function formatDerivedMetricsForDB(metrics: DerivedMetrics): Record<string, string | null> {
  return {
    roic_stability: metrics.roicStability !== null ? metrics.roicStability.toFixed(4) : null,
    roic_stability_score: metrics.roicStabilityScore !== null ? metrics.roicStabilityScore.toFixed(2) : null,
    fcf_margin: metrics.fcfMargin !== null ? metrics.fcfMargin.toFixed(4) : null,
  };
}

