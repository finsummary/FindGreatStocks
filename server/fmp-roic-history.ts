/**
 * ROIC 10Y history from FMP Stable API (annual key-metrics), with NOPAT fallback.
 * Replaces legacy v3 income/balance manual ROIC where Stable returns returnOnInvestedCapital.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const FMP_STABLE = "https://financialmodelingprep.com/stable";

function sortByStatementDateDesc(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...rows].sort(
    (a, b) =>
      new Date(String(b.date || 0)).getTime() - new Date(String(a.date || 0)).getTime()
  );
}

/** FMP returns ROIC as decimal (e.g. 0.63); if value looks like percent (>1.5), divide by 100. */
export function normalizeFmpRoicRatio(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  let v = Number(raw);
  if (!Number.isFinite(v)) return null;
  if (Math.abs(v) > 1.5) v = v / 100;
  if (v > 2) v = 2;
  if (v < -2) v = -2;
  return v;
}

function empty10(): (number | null)[] {
  return Array.from({ length: 10 }, () => null);
}

/**
 * Latest N annual ROIC ratios from FMP Stable `key-metrics` (returnOnInvestedCapital).
 * Many FMP plans cap `limit` at 5 — do not raise without checking subscription.
 */
export async function fetchRoicRecentYearsFromFmpStable(
  symbol: string,
  apiKey: string,
  maxRows: number
): Promise<(number | null)[]> {
  const series: (number | null)[] = [];
  try {
    if (!apiKey || String(apiKey).trim() === "") {
      return series;
    }
    const u = new URL(`${FMP_STABLE}/key-metrics`);
    u.searchParams.set("symbol", symbol);
    u.searchParams.set("period", "annual");
    u.searchParams.set("limit", String(Math.min(maxRows, 5)));
    u.searchParams.set("apikey", apiKey);
    const r = await fetch(u.toString());
    if (!r.ok) return series;
    const text = await r.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return series;
    }
    const rows: Record<string, unknown>[] = Array.isArray(data)
      ? (data as Record<string, unknown>[])
      : data && typeof data === "object" && data !== null && "symbol" in data
        ? [data as Record<string, unknown>]
        : [];
    if (rows.length === 0) return series;
    const sorted = [...rows].sort(
      (a, b) =>
        new Date(String((b as { date?: string }).date || 0)).getTime() -
        new Date(String((a as { date?: string }).date || 0)).getTime()
    );
    for (let i = 0; i < maxRows; i++) {
      const row = sorted[i] as {
        returnOnInvestedCapital?: unknown;
        returnOnCapitalEmployed?: unknown;
      };
      if (!row) {
        series.push(null);
        continue;
      }
      const raw = row.returnOnInvestedCapital ?? row.returnOnCapitalEmployed ?? null;
      series.push(normalizeFmpRoicRatio(raw));
    }
    return series;
  } catch (e) {
    console.warn(`[fmp-roic-history] fetchRecentStable ${symbol}:`, e);
    return series;
  }
}

/** Latest filed annual ROIC (decimal), e.g. most recent FY in FMP — one HTTP GET with limit=1. */
export async function fetchLatestAnnualRoicDecimal(
  symbol: string,
  apiKey: string
): Promise<number | null> {
  const series = await fetchRoicRecentYearsFromFmpStable(symbol, apiKey, 1);
  const v = series[0];
  return v !== null && v !== undefined ? v : null;
}

async function fetchStableJsonArray(url: string): Promise<Record<string, unknown>[]> {
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const j: unknown = await r.json();
    return Array.isArray(j) ? (j as Record<string, unknown>[]) : [];
  } catch {
    return [];
  }
}

/** NOPAT / invested capital from Stable income + balance (annual), same idea as legacy populate scripts. */
export async function fetchRoic10YSeriesFromStatementsFallback(
  symbol: string,
  apiKey: string
): Promise<(number | null)[]> {
  const incomeUrl = new URL(`${FMP_STABLE}/income-statement`);
  incomeUrl.searchParams.set("symbol", symbol);
  incomeUrl.searchParams.set("period", "annual");
  incomeUrl.searchParams.set("limit", "5");
  incomeUrl.searchParams.set("apikey", apiKey);

  const balanceUrl = new URL(`${FMP_STABLE}/balance-sheet-statement`);
  balanceUrl.searchParams.set("symbol", symbol);
  balanceUrl.searchParams.set("period", "annual");
  balanceUrl.searchParams.set("limit", "5");
  balanceUrl.searchParams.set("apikey", apiKey);

  const [incRaw, balRaw] = await Promise.all([
    fetchStableJsonArray(incomeUrl.toString()),
    fetchStableJsonArray(balanceUrl.toString()),
  ]);

  const incomeStatementData = sortByStatementDateDesc(incRaw);
  const balanceSheetData = sortByStatementDateDesc(balRaw);

  const roicSeries: (number | null)[] = [];

  for (let i = 0; i < 10; i++) {
    const inc = incomeStatementData[i] || {};
    const bal = balanceSheetData[i] || {};

    const ebit = Number(inc.ebit ?? inc.operatingIncome ?? 0);
    const preTax = Number(inc.incomeBeforeTax ?? 0);
    const taxExp = Number(inc.incomeTaxExpense ?? 0);
    const taxRate =
      preTax > 0 && taxExp > 0 ? Math.max(0, Math.min(0.5, taxExp / preTax)) : 0.21;
    const nopat = ebit * (1 - taxRate);

    const totalDebt = Number(bal.totalDebt ?? 0);
    const equity = Number(bal.totalStockholdersEquity ?? bal.totalEquity ?? 0);
    const cash = Number(bal.cashAndShortTermInvestments ?? bal.cashAndCashEquivalents ?? 0);

    const investedCapital = totalDebt + equity - cash;

    if (investedCapital > 0 && !Number.isNaN(nopat) && Number.isFinite(nopat)) {
      let roic = nopat / investedCapital;
      if (roic > 2) roic = 2;
      if (roic < -2) roic = -2;
      roicSeries.push(roic);
    } else {
      roicSeries.push(null);
    }
  }

  while (roicSeries.length < 10) roicSeries.push(null);
  return roicSeries;
}

export function computeRoicDerivedFromSeries(roicSeries: (number | null)[]): {
  roic10YAvg: number | null;
  roic10YStd: number | null;
  roicStability: number | null;
  roicStabilityScore: number | null;
} {
  const roicValues = roicSeries.filter((v): v is number => v !== null && v !== undefined).map(Number);
  let roic10YAvg: number | null = null;
  let roic10YStd: number | null = null;
  let roicStability: number | null = null;
  let roicStabilityScore: number | null = null;

  if (roicValues.length >= 1) {
    roic10YAvg = roicValues.reduce((a, b) => a + b, 0) / roicValues.length;

    if (roicValues.length >= 2) {
      const variance =
        roicValues.reduce((acc, v) => acc + Math.pow(v - roic10YAvg!, 2), 0) / roicValues.length;
      roic10YStd = Math.sqrt(variance);

      if (roic10YStd > 0) {
        roicStability = roic10YAvg / roic10YStd;
      }

      if (roic10YStd > 0 && roic10YAvg > 0) {
        const cv = roic10YStd / roic10YAvg;
        roicStabilityScore = Math.max(0, Math.min(100, 100 * (1 - Math.min(cv, 1))));
      }
    }
  }

  return { roic10YAvg, roic10YStd, roicStability, roicStabilityScore };
}

function assignRoicYears(series: (number | null)[]): Record<string, number | null> {
  const obj: Record<string, number | null> = {};
  for (let i = 0; i < 10; i++) {
    const v = series[i];
    obj[`roic_y${i + 1}`] = v !== null && v !== undefined ? Number(v) : null;
  }
  return obj;
}

/**
 * Updates roic_y1..roic_y10, stability fields, and headline `roic` from latest annual point (roic_y1).
 */
export async function updateRoic10YHistoryForSymbol(
  supabase: SupabaseClient,
  tableName: string,
  symbol: string,
  apiKey: string
): Promise<boolean> {
  console.log(`\n📊 ROIC 10Y history (FMP Stable + statements) for ${symbol} → ${tableName}...`);

  const recent5 = await fetchRoicRecentYearsFromFmpStable(symbol, apiKey, 5);
  const fallback10 = await fetchRoic10YSeriesFromStatementsFallback(symbol, apiKey);
  const roicSeries: (number | null)[] = [];
  for (let i = 0; i < 10; i++) {
    const s = recent5[i];
    const f = fallback10[i];
    roicSeries.push(s !== null && s !== undefined ? s : f ?? null);
  }

  const { roic10YAvg, roic10YStd, roicStability, roicStabilityScore } =
    computeRoicDerivedFromSeries(roicSeries);

  const headlineRoic = roicSeries[0];
  const updates: Record<string, unknown> = {
    ...assignRoicYears(roicSeries),
    roic:
      headlineRoic !== null && headlineRoic !== undefined && Number.isFinite(Number(headlineRoic))
        ? Number(headlineRoic).toFixed(4)
        : null,
    roic_10y_avg: roic10YAvg !== null ? roic10YAvg.toFixed(4) : null,
    roic_10y_std: roic10YStd !== null ? roic10YStd.toFixed(4) : null,
    roic_stability: roicStability !== null ? roicStability.toFixed(4) : null,
    roic_stability_score: roicStabilityScore !== null ? roicStabilityScore.toFixed(2) : null,
  };

  const { error } = await supabase.from(tableName).update(updates).eq("symbol", symbol);

  if (error) {
    console.error(`❌ Error updating ROIC history for ${symbol}:`, error);
    return false;
  }

  const yearsWithData = roicSeries.filter((v) => v !== null && v !== undefined).length;
  const sample = roicSeries
    .slice(0, Math.min(3, yearsWithData))
    .map((v) => (v !== null ? `${(Number(v) * 100).toFixed(1)}%` : "null"))
    .join(", ");
  console.log(
    `✅ Updated ROIC history for ${symbol} (${yearsWithData} yrs, latest headline ${headlineRoic !== null && headlineRoic !== undefined ? (Number(headlineRoic) * 100).toFixed(1) + "%" : "N/A"}; sample Y1–Y3: ${sample})`
  );
  return true;
}
