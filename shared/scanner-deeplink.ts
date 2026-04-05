/**
 * Build scanner deep-link URLs for SEO pages.
 * The main app (client-app) reads these params on load and applies filters.
 */

export type ScannerDataset = 'sp500' | 'nasdaq100' | 'dowjones' | 'ftse100' | 'tsx60' | 'asx200' | 'dax40' | 'cac40' | 'ibex35' | 'nikkei225' | 'hangseng' | 'nifty50' | 'ibovespa';

export interface ScannerDeepLinkParams {
  /** Which index/list to show */
  dataset?: ScannerDataset;
  /** Sort column (e.g. roic, marketCap, revenueGrowth5Y, dcfImpliedGrowth) */
  sortBy?: string;
  /** asc | desc */
  sortOrder?: 'asc' | 'desc';
  /** Search query (ticker or company name) */
  search?: string;
  /** Sector filter - applied client-side or via search hint */
  sector?: string;
}

const DEFAULT_SCANNER_PATH = '/';

/**
 * Build full scanner URL with query params for deep-linking from SEO pages.
 * @param baseUrl - e.g. https://findgreatstocks.com or ''
 * @param params - filters to pre-apply in the scanner
 */
export function buildScannerUrl(
  baseUrl: string,
  params: ScannerDeepLinkParams
): string {
  const searchParams = new URLSearchParams();
  if (params.dataset) searchParams.set('dataset', params.dataset);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.search) searchParams.set('search', params.search);
  if (params.sector) searchParams.set('sector', params.sector);
  const qs = searchParams.toString();
  const path = baseUrl.replace(/\/$/, '') + DEFAULT_SCANNER_PATH;
  return qs ? `${path}?${qs}` : path;
}

/**
 * Scanner link for "similar by ROIC" from a company page (same dataset, sort by ROIC).
 */
export function scannerLinkSimilarByRoic(baseUrl: string, dataset: ScannerDataset = 'sp500'): string {
  return buildScannerUrl(baseUrl, { dataset, sortBy: 'roic', sortOrder: 'desc' });
}

/**
 * Scanner link for "similar by revenue growth".
 */
export function scannerLinkSimilarByRevenueGrowth(baseUrl: string, dataset: ScannerDataset = 'sp500'): string {
  return buildScannerUrl(baseUrl, { dataset, sortBy: 'revenueGrowth5Y', sortOrder: 'desc' });
}

/**
 * Scanner link for sector view (opens scanner with sector pre-selected; use search as hint if API doesn't support sector filter yet).
 */
export function scannerLinkForSector(baseUrl: string, sector: string, dataset: ScannerDataset = 'sp500'): string {
  return buildScannerUrl(baseUrl, { dataset, sector });
}

/**
 * Scanner link for strategy (e.g. high ROIC) - opens scanner with sort/filters that match the strategy.
 */
export function scannerLinkForStrategy(
  baseUrl: string,
  strategy: 'compounder-stocks' | 'high-roic-stocks' | 'high-fcf-stocks',
  dataset: ScannerDataset = 'sp500'
): string {
  switch (strategy) {
    case 'high-roic-stocks':
      return buildScannerUrl(baseUrl, { dataset, sortBy: 'roic', sortOrder: 'desc' });
    case 'high-fcf-stocks':
      return buildScannerUrl(baseUrl, { dataset, sortBy: 'freeCashFlow', sortOrder: 'desc' });
    case 'compounder-stocks':
      return buildScannerUrl(baseUrl, { dataset, sortBy: 'revenueGrowth5Y', sortOrder: 'desc' });
    default:
      return buildScannerUrl(baseUrl, { dataset });
  }
}

/**
 * Scanner link for valuation page (e.g. stocks priced for low growth -> sort by dcfImpliedGrowth asc).
 */
export function scannerLinkStocksPricedForLowGrowth(baseUrl: string, dataset: ScannerDataset = 'sp500'): string {
  return buildScannerUrl(baseUrl, { dataset, sortBy: 'dcfImpliedGrowth', sortOrder: 'asc' });
}

/**
 * Scanner link for undervalued by reverse DCF (e.g. margin of safety or implied growth vs historical).
 */
export function scannerLinkUndervaluedByReverseDcf(baseUrl: string, dataset: ScannerDataset = 'sp500'): string {
  return buildScannerUrl(baseUrl, { dataset, sortBy: 'marginOfSafety', sortOrder: 'desc' });
}
