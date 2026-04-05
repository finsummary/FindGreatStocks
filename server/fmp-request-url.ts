/**
 * FMP deprecated path-style /api/v3/quote/SYM (legacy, gated since Aug 2025).
 * Use Stable API: /stable/quote and /stable/batch-quote.
 * @see https://site.financialmodelingprep.com/developer/docs/stable/quote
 */

const FMP_V3 = "https://financialmodelingprep.com/api/v3";
const FMP_STABLE = "https://financialmodelingprep.com/stable";

/**
 * Build full FMP URL. Pass endpoints as today for v3, e.g. `/quote/AAPL` or `/quote/A,AAPL` or `/income-statement/...`.
 */
export function fmpRequestUrl(endpoint: string, apiKey: string): string {
  if (endpoint.startsWith("/quote/")) {
    const rest = endpoint.slice("/quote/".length);
    if (rest.includes(",")) {
      const u = new URL(`${FMP_STABLE}/batch-quote`);
      u.searchParams.set("apikey", apiKey);
      u.searchParams.set("symbols", rest);
      return u.toString();
    }
    const u = new URL(`${FMP_STABLE}/quote`);
    u.searchParams.set("apikey", apiKey);
    u.searchParams.set("symbol", rest);
    return u.toString();
  }
  const join = endpoint.includes("?") ? "&" : "?";
  return `${FMP_V3}${endpoint}${join}apikey=${encodeURIComponent(apiKey)}`;
}

/** Single-symbol /quote/X may return one object instead of [{...}] on Stable API. */
export function normalizeFmpQuoteJson(endpoint: string, data: unknown): unknown {
  if (!endpoint.startsWith("/quote/")) return data;
  const rest = endpoint.slice("/quote/".length);
  if (rest.includes(",")) return data;
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    "symbol" in (data as object)
  ) {
    return [data];
  }
  return data;
}
