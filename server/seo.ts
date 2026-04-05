/**
 * SEO data layer: company/sector/strategy/compare/valuation payloads and page cache.
 */

import { supabase } from './db';
import { storage } from './storage';

const CLIENT_URL = process.env.CLIENT_URL || 'https://findgreatstocks.com';

/** Normalize ticker to slug (e.g. AAPL -> apple) */
export function tickerToSlug(ticker: string): string {
  return (ticker || '').toLowerCase().replace(/\./g, '-');
}

/** Map row from DB to camelCase for API */
function toCompany(row: any): Record<string, unknown> {
  if (!row) return {};
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    marketCap: row.market_cap,
    price: row.price,
    sector: row.sector,
    industry: row.industry,
    country: row.country,
    description: row.description,
    revenue: row.revenue,
    revenueGrowth3Y: row.revenue_growth_3y,
    revenueGrowth5Y: row.revenue_growth_5y,
    revenueGrowth10Y: row.revenue_growth_10y,
    freeCashFlow: row.free_cash_flow,
    roic: row.roic,
    roe: row.roe,
    peRatio: row.pe_ratio,
    dcfImpliedGrowth: row.dcf_implied_growth,
    marginOfSafety: row.margin_of_safety,
    netProfitMargin: row.net_profit_margin,
    debtToEquity: row.debt_to_equity,
  };
}

export async function getCompanyByTicker(ticker: string): Promise<Record<string, unknown> | null> {
  const row = await storage.getCompanyByTickerFromAnyIndex(ticker);
  if (!row) return null;
  return toCompany(row);
}

/** Get companies in sector from S&P 500 (sector name normalized) */
export async function getCompaniesBySector(
  sectorSlug: string,
  limit: number = 50
): Promise<{ companies: Record<string, unknown>[]; sectorName: string }> {
  const sectorName = sectorSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const { data, error } = await supabase
    .from('sp500_companies')
    .select('*')
    .ilike('sector', `%${sectorName}%`)
    .order('market_cap', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('getCompaniesBySector error:', error);
    return { companies: [], sectorName: sectorSlug };
  }
  return {
    companies: (data || []).map(toCompany),
    sectorName: (data && data[0]?.sector) ? data[0].sector : sectorName,
  };
}

/** Strategy slug -> definition and company list (from S&P 500 for Phase 1) */
const STRATEGIES: Record<string, { name: string; sortBy: string; sortOrder: 'asc' | 'desc'; description: string }> = {
  'compounder-stocks': {
    name: 'Compounder Stocks',
    sortBy: 'revenue_growth_5y',
    sortOrder: 'desc',
    description: 'Companies with strong multi-year revenue growth, often reinvesting profits for growth.',
  },
  'high-roic-stocks': {
    name: 'High ROIC Stocks',
    sortBy: 'roic',
    sortOrder: 'desc',
    description: 'Companies with high return on invested capital, indicating efficient use of capital.',
  },
  'high-fcf-stocks': {
    name: 'High Free Cash Flow Stocks',
    sortBy: 'free_cash_flow',
    sortOrder: 'desc',
    description: 'Companies generating strong free cash flow, supporting dividends and buybacks.',
  },
};

export function getStrategyDefinition(slug: string) {
  return STRATEGIES[slug] || null;
}

export async function getStrategyCompanies(
  slug: string,
  limit: number = 50
): Promise<{ strategy: typeof STRATEGIES[string]; companies: Record<string, unknown>[] } | null> {
  const strategy = STRATEGIES[slug];
  if (!strategy) return null;
  const { data, error } = await supabase
    .from('sp500_companies')
    .select('*')
    .order(strategy.sortBy, { ascending: strategy.sortOrder === 'asc' })
    .not(strategy.sortBy, 'is', null)
    .limit(limit);
  if (error) {
    console.error('getStrategyCompanies error:', error);
    return { strategy, companies: [] };
  }
  return {
    strategy,
    companies: (data || []).map(toCompany),
  };
}

/** Comparison: two companies by ticker */
export async function getComparison(tickerA: string, tickerB: string): Promise<{
  companyA: Record<string, unknown> | null;
  companyB: Record<string, unknown> | null;
} | null> {
  const [companyA, companyB] = await Promise.all([
    getCompanyByTicker(tickerA),
    getCompanyByTicker(tickerB),
  ]);
  if (!companyA || !companyB) return null;
  return { companyA, companyB };
}

/** Valuation page: stocks priced for low growth (low implied DCF growth) */
export async function getStocksPricedForLowGrowth(limit: number = 30): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from('sp500_companies')
    .select('*')
    .not('dcf_implied_growth', 'is', null)
    .order('dcf_implied_growth', { ascending: true })
    .limit(limit);
  if (error) {
    console.error('getStocksPricedForLowGrowth error:', error);
    return [];
  }
  return (data || []).map(toCompany);
}

/** Valuation page: undervalued by reverse DCF (high margin of safety) */
export async function getStocksUndervaluedByReverseDcf(limit: number = 30): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from('sp500_companies')
    .select('*')
    .not('margin_of_safety', 'is', null)
    .order('margin_of_safety', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('getStocksUndervaluedByReverseDcf error:', error);
    return [];
  }
  return (data || []).map(toCompany);
}

// --- Page cache (Supabase table page_cache) ---

export async function getPageCache(pageType: string, pageSlug: string): Promise<{
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  aiSummary: string | null;
  aiJson: unknown;
  lastGeneratedAt: string | null;
} | null> {
  const { data, error } = await supabase
    .from('page_cache')
    .select('title, meta_description, h1, ai_summary, ai_json, last_generated_at')
    .eq('page_type', pageType)
    .eq('page_slug', pageSlug)
    .maybeSingle();
  if (error || !data) return null;
  return {
    title: data.title ?? null,
    metaDescription: data.meta_description ?? null,
    h1: data.h1 ?? null,
    aiSummary: data.ai_summary ?? null,
    aiJson: data.ai_json ?? null,
    lastGeneratedAt: data.last_generated_at ?? null,
  };
}

export async function setPageCache(params: {
  pageType: string;
  pageSlug: string;
  entityKey: string;
  title?: string | null;
  metaDescription?: string | null;
  h1?: string | null;
  aiSummary?: string | null;
  aiJson?: unknown;
  versionHash?: string | null;
}): Promise<void> {
  const row = {
    page_type: params.pageType,
    page_slug: params.pageSlug,
    entity_key: params.entityKey,
    title: params.title ?? null,
    meta_description: params.metaDescription ?? null,
    h1: params.h1 ?? null,
    ai_summary: params.aiSummary ?? null,
    ai_json: params.aiJson ?? null,
    version_hash: params.versionHash ?? null,
    last_generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('page_cache').upsert(row, {
    onConflict: 'page_type,page_slug',
    ignoreDuplicates: false,
  });
  if (error) console.error('setPageCache error:', error);
}

export function getClientUrl(): string {
  return CLIENT_URL.replace(/\/$/, '');
}
