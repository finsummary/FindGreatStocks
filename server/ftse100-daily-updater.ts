import { supabase } from './db';
import { calculateDerivedMetrics, formatDerivedMetricsForDB } from './utils/derived-metrics';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const API_KEY = process.env.FMP_API_KEY || '';

if (!API_KEY) {
  console.warn('[ftse100-daily-updater] FMP_API_KEY is missing; updater will no-op.');
}

type Quote = {
  symbol: string;
  price?: number;
  change?: number;
  changesPercentage?: number;
  marketCap?: number;
};

async function fetchQuote(symbol: string): Promise<Quote | null> {
  if (!API_KEY) return null;
  try {
    const r = await fetch(`${BASE_URL}/quote/${symbol}?apikey=${API_KEY}`);
    if (!r.ok) return null;
    const arr = await r.json();
    return Array.isArray(arr) && arr[0] ? arr[0] : null;
  } catch {
    return null;
  }
}

export async function updateFTSE100Prices() {
  try {
    const { data, error } = await supabase.from('ftse100_companies').select('symbol');
    if (error) {
      console.error('[ftse100-daily-updater] read symbols error:', error.message);
      return { success: false, updated: 0, failed: 0 };
    }
    const syms = (data || []).map(r => r.symbol).filter(Boolean);
    let updated = 0, failed = 0;
    for (const sym of syms) {
      try {
        const q = await fetchQuote(sym);
        if (!q) { failed++; continue; }
        const patch: any = {};
        if (q.price != null) patch.price = Number(q.price);
        if (q.change != null) patch.daily_change = Number(q.change);
        if (q.changesPercentage != null) patch.daily_change_percent = Number(q.changesPercentage);
        if (q.marketCap != null) patch.market_cap = Number(q.marketCap);
        patch.last_price_update = new Date().toISOString();
        
        // Fetch company data for derived metrics calculation
        const { data: companyData } = await supabase
          .from('ftse100_companies')
          .select('roic_10y_avg, roic_10y_std, latest_fcf, free_cash_flow, revenue')
          .eq('symbol', sym)
          .single();

        // Calculate derived metrics if we have the data
        if (companyData) {
          const derivedMetrics = calculateDerivedMetrics({
            roic10YAvg: companyData.roic_10y_avg,
            roic10YStd: companyData.roic_10y_std,
            latestFcf: companyData.latest_fcf,
            freeCashFlow: companyData.free_cash_flow,
            revenue: companyData.revenue,
          });
          const derivedUpdates = formatDerivedMetricsForDB(derivedMetrics);
          Object.assign(patch, derivedUpdates);
        }
        
        const { error: upErr } = await supabase.from('ftse100_companies').update(patch).eq('symbol', sym);
        if (upErr) { failed++; } else { updated++; }
      } catch {
        failed++;
      }
      // simple rate-limit
      await new Promise(r => setTimeout(r, 80));
    }
    return { success: true, updated, failed, count: syms.length };
  } catch (e) {
    console.error('[ftse100-daily-updater] fatal:', (e as any)?.message || e);
    return { success: false, updated: 0, failed: 0 };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateFTSE100Prices().then(r => { console.log(r); process.exit(r.success ? 0 : 1); })
    .catch(e => { console.error(e); process.exit(1); });
}


