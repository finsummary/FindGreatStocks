/**
 * Latest ROIC-style ratio from Yahoo Finance quoteSummary (no API key).
 * Uses the same unofficial endpoint pattern as yahoo-price-update / fetch-market-cap.
 *
 * Yahoo may expose returnOnInvestedCapital under financialData (not always); structure is often { raw, fmt }.
 * If blocked (401 / crumb), returns null — caller can fall back to FMP.
 */
const YAHOO_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

/** Normalize Yahoo ratio to decimal (e.g. 0.15 for 15%). */
function normalizeYahooRatio(raw: unknown): number | null {
  let v: number | null = null;
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) v = raw;
  else if (typeof raw === "object" && raw !== null && "raw" in raw) {
    const r = (raw as { raw?: unknown }).raw;
    if (typeof r === "number" && Number.isFinite(r)) v = r;
  }
  if (v === null) return null;
  if (Math.abs(v) > 1.5) v = v / 100;
  if (v > 2) v = 2;
  if (v < -2) v = -2;
  return v;
}

/**
 * Best-effort: financialData fields that may represent ROIC or close proxies (we only use explicit ROIC-like keys first).
 */
function extractRoicFromFinancialData(fd: Record<string, unknown>): number | null {
  const directKeys = [
    "returnOnInvestedCapital",
    "returnOnCapital",
    "returnOnCapitalEmployed",
  ];
  for (const k of directKeys) {
    if (k in fd) {
      const n = normalizeYahooRatio(fd[k]);
      if (n !== null) return n;
    }
  }
  for (const key of Object.keys(fd)) {
    const kl = key.toLowerCase();
    if (
      kl.includes("returnoninvested") ||
      (kl.includes("return") && kl.includes("invested") && kl.includes("capital"))
    ) {
      const n = normalizeYahooRatio(fd[key]);
      if (n !== null) return n;
    }
  }
  return null;
}

export async function fetchLatestAnnualRoicFromYahoo(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
      symbol.trim()
    )}?modules=financialData`;
    const r = await fetch(url, { headers: YAHOO_HEADERS });
    if (!r.ok) return null;
    const text = await r.text();
    let j: unknown;
    try {
      j = JSON.parse(text);
    } catch {
      return null;
    }
    const fd = (j as { quoteSummary?: { result?: Array<{ financialData?: Record<string, unknown> }> } })
      ?.quoteSummary?.result?.[0]?.financialData;
    if (!fd || typeof fd !== "object") return null;
    return extractRoicFromFinancialData(fd as Record<string, unknown>);
  } catch {
    return null;
  }
}
