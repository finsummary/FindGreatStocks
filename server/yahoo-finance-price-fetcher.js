/**
 * Yahoo Finance price fetcher as fallback when FMP API fails
 * Uses unofficial Yahoo Finance API endpoint
 */

export async function fetchYahooFinanceQuote(symbol) {
  try {
    // Yahoo Finance unofficial API endpoint
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data?.chart?.result || data.chart.result.length === 0) {
      return null;
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    
    if (!meta || !quote) {
      return null;
    }
    
    // Get the latest price data
    const prices = quote.close || [];
    const volumes = quote.volume || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const opens = quote.open || [];
    
    const lastIndex = prices.length - 1;
    const currentPrice = prices[lastIndex];
    const previousClose = meta.previousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;
    
    // Calculate market cap if available
    const sharesOutstanding = meta.sharesOutstanding;
    const marketCap = sharesOutstanding && currentPrice ? sharesOutstanding * currentPrice : null;
    
    return {
      symbol: symbol.toUpperCase(),
      price: currentPrice,
      previousClose: previousClose,
      change: change,
      changesPercentage: changePercent,
      marketCap: marketCap,
      volume: volumes[lastIndex] || null,
      high: highs[lastIndex] || null,
      low: lows[lastIndex] || null,
      open: opens[lastIndex] || null,
    };
  } catch (error) {
    console.error(`[Yahoo Finance] Error fetching ${symbol}:`, error.message);
    return null;
  }
}

export async function fetchYahooFinanceQuotesBatch(symbols) {
  const results = new Map();
  
  // Yahoo Finance doesn't support batch requests, so we fetch one by one
  // But we can do it in parallel with rate limiting
  const batchSize = 10; // Process 10 symbols at a time
  const delay = 100; // 100ms delay between batches
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    const promises = batch.map(async (symbol) => {
      const quote = await fetchYahooFinanceQuote(symbol);
      if (quote) {
        results.set(symbol.toUpperCase(), quote);
      }
      return quote;
    });
    
    await Promise.all(promises);
    
    // Rate limiting - wait between batches
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}
