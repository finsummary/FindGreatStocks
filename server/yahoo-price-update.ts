/**
 * Bulk stock price updates via Yahoo Finance (unofficial API, no API key).
 * Used by POST /api/prices/update-all-yahoo and DataScheduler.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface YahooQuote {
  symbol: string;
  price: number;
  previousClose?: number;
  change: number;
  changesPercentage: number;
  marketCap: number | null;
}

export async function fetchYahooFinanceQuote(symbol: string): Promise<YahooQuote | null> {
  try {
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const chartResponse = await fetch(chartUrl);
    if (!chartResponse.ok) return null;
    const chartData = await chartResponse.json();
    if (!chartData?.chart?.result || chartData.chart.result.length === 0) return null;
    const result = chartData.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    if (!meta || !quote) return null;
    const prices = quote.close || [];
    const lastIndex = prices.length - 1;
    const currentPrice = prices[lastIndex];
    const previousClose = meta.previousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    let marketCap: number | null = null;
    let sharesOutstanding: number | null = null;

    try {
      const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail,defaultKeyStatistics,price`;
      const summaryResponse = await fetch(summaryUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        const summary = summaryData?.quoteSummary?.result?.[0];

        if (summary) {
          const marketCapRaw = summary.defaultKeyStatistics?.marketCap?.raw;
          const marketCapFmt = summary.defaultKeyStatistics?.marketCap;
          const marketCapFromSummary =
            summary.summaryDetail?.marketCap?.raw || summary.summaryDetail?.marketCap;

          marketCap = marketCapRaw ?? marketCapFmt ?? marketCapFromSummary ?? null;

          sharesOutstanding =
            summary.defaultKeyStatistics?.sharesOutstanding?.raw ??
            summary.defaultKeyStatistics?.sharesOutstanding ??
            summary.summaryDetail?.sharesOutstanding?.raw ??
            summary.summaryDetail?.sharesOutstanding ??
            null;

          if ((!marketCap || marketCap === 0) && currentPrice && sharesOutstanding && sharesOutstanding > 0) {
            marketCap = sharesOutstanding * currentPrice;
          }
        }
      }
    } catch {
      /* quoteSummary optional */
    }

    if (!sharesOutstanding && meta.sharesOutstanding) {
      sharesOutstanding = meta.sharesOutstanding;
    }

    if (!marketCap && currentPrice && sharesOutstanding && sharesOutstanding > 0) {
      marketCap = sharesOutstanding * currentPrice;
    }

    if (!marketCap && currentPrice) {
      try {
        const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
        const quoteResponse = await fetch(quoteUrl);
        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json();
          const qr = quoteData?.quoteResponse?.result?.[0];
          if (qr) {
            marketCap = qr.marketCap || qr.regularMarketMarketCap || null;
            if (!marketCap && currentPrice) {
              const so =
                qr.sharesOutstanding || qr.regularMarketSharesOutstanding || null;
              if (so && so > 0) marketCap = so * currentPrice;
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    return {
      symbol: symbol.toUpperCase(),
      price: currentPrice,
      previousClose,
      change,
      changesPercentage: changePercent,
      marketCap,
    };
  } catch (error) {
    console.warn(`[Yahoo Finance] Error fetching ${symbol}:`, (error as Error)?.message);
    return null;
  }
}

function buildUpdates(q: YahooQuote): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  const closePrice =
    q.price !== undefined && q.price !== null
      ? Number(q.price)
      : q.previousClose !== undefined
        ? Number(q.previousClose)
        : undefined;
  if (closePrice !== undefined) updates.price = closePrice;
  if (q.marketCap !== undefined && q.marketCap !== null && q.marketCap !== 0) {
    const marketCapValue = Number(q.marketCap);
    if (!isNaN(marketCapValue) && marketCapValue > 0) updates.market_cap = marketCapValue;
  }
  if (q.change !== undefined && q.change !== null) updates.daily_change = Number(q.change);
  if (q.changesPercentage !== undefined && q.changesPercentage !== null) {
    updates.daily_change_percent = Number(q.changesPercentage);
  }
  updates.last_price_update = new Date().toISOString();
  return updates;
}

const DEFAULT_TABLES = [
  "companies",
  "sp500_companies",
  "nasdaq100_companies",
  "dow_jones_companies",
  "ftse100_companies",
] as const;

/**
 * Fetches Yahoo quotes and updates price / market cap columns for all symbols in the given tables.
 */
export async function runYahooBulkPriceUpdate(
  supabase: SupabaseClient,
  tables: readonly string[] = DEFAULT_TABLES
): Promise<{ totalUpdated: number; totalFailed: number }> {
  let totalUpdated = 0;
  let totalFailed = 0;
  const fmpKey = process.env.FMP_API_KEY;

  for (const table of tables) {
    let tableUpdated = 0;
    let tableFailed = 0;

    try {
      const { data, error } = await supabase.from(table).select("symbol");
      if (error) {
        console.warn("[Yahoo Finance] read symbols error", table, error.message);
        continue;
      }
      const symbols = (data || [])
        .map((r: { symbol?: string }) => (r?.symbol || "").toUpperCase())
        .filter(Boolean);

      console.log(`[Yahoo Finance] Updating ${symbols.length} symbols from ${table}...`);

      for (const sym of symbols) {
        try {
          const { data: existingData } = await supabase
            .from(table)
            .select("market_cap, price")
            .eq("symbol", sym)
            .single();

          let yahooQuote = await fetchYahooFinanceQuote(sym);
          if (yahooQuote) {
            if (!yahooQuote.marketCap && yahooQuote.price) {
              let calculatedMarketCap: number | null = null;

              if (
                existingData?.market_cap &&
                Number(existingData.market_cap) > 0 &&
                existingData?.price &&
                Number(existingData.price) > 0
              ) {
                const sharesOutstanding =
                  Number(existingData.market_cap) / Number(existingData.price);
                if (sharesOutstanding > 0 && isFinite(sharesOutstanding)) {
                  calculatedMarketCap = sharesOutstanding * yahooQuote.price;
                }
              }

              if (!calculatedMarketCap && fmpKey) {
                try {
                  const fmpUrl = `https://financialmodelingprep.com/stable/key-metrics-ttm/${encodeURIComponent(sym)}?apikey=${fmpKey}`;
                  const fmpResponse = await fetch(fmpUrl);
                  if (fmpResponse.ok) {
                    const fmpData = await fmpResponse.json();
                    if (Array.isArray(fmpData) && fmpData.length > 0 && fmpData[0].sharesOutstandingTTM) {
                      const so = fmpData[0].sharesOutstandingTTM;
                      calculatedMarketCap = so * yahooQuote.price;
                    }
                  }
                } catch {
                  /* ignore */
                }
              }

              if (calculatedMarketCap && calculatedMarketCap > 0) {
                yahooQuote = { ...yahooQuote, marketCap: calculatedMarketCap };
              }
            }

            const updates = buildUpdates(yahooQuote);
            if (Object.keys(updates).length > 0) {
              await supabase.from(table).update(updates).eq("symbol", sym);
              tableUpdated++;
              totalUpdated++;
              if (tableUpdated % 50 === 0) {
                console.log(`[Yahoo Finance] ${table}: updated ${tableUpdated} rows...`);
              }
            }
          } else {
            tableFailed++;
            totalFailed++;
          }

          await new Promise((r) => setTimeout(r, 100));
        } catch (e) {
          tableFailed++;
          totalFailed++;
          console.warn(`[Yahoo Finance] Error updating ${sym} in ${table}:`, (e as Error)?.message);
        }
      }

      console.log(`[Yahoo Finance] Completed ${table}: ${tableUpdated} updated, ${tableFailed} failed`);
    } catch (e) {
      console.warn(`[Yahoo Finance] Table update error ${table}:`, (e as Error)?.message);
    }
  }

  console.log(`[Yahoo Finance] Total: ${totalUpdated} updated, ${totalFailed} failed`);
  return { totalUpdated, totalFailed };
}
