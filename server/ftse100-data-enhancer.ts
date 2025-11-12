import { supabase } from './db';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const API_KEY = process.env.FMP_API_KEY || '';

async function fetchJson(path: string) {
  const r = await fetch(`${BASE_URL}${path}${path.includes('?') ? '&' : '?'}apikey=${API_KEY}`);
  if (!r.ok) throw new Error(`FMP ${path} ${r.status}`);
  return r.json();
}

async function enhanceOne(symbol: string) {
  try {
    if (!API_KEY) return;
    const [income, balance, cash, quote] = await Promise.all([
      fetchJson(`/income-statement/${symbol}?limit=1`).catch(() => null),
      fetchJson(`/balance-sheet-statement/${symbol}?limit=1`).catch(() => null),
      fetchJson(`/cash-flow-statement/${symbol}?limit=1`).catch(() => null),
      fetchJson(`/quote/${symbol}`).catch(() => null),
    ]);
    const i = Array.isArray(income) && income[0] ? income[0] : null;
    const b = Array.isArray(balance) && balance[0] ? balance[0] : null;
    const c = Array.isArray(cash) && cash[0] ? cash[0] : null;
    const q = Array.isArray(quote) && quote[0] ? quote[0] : null;
    const patch: any = {};
    if (i?.revenue != null) patch.revenue = Number(i.revenue);
    if (i?.netIncome != null) patch.net_income = Number(i.netIncome);
    if (i?.grossProfit != null) patch.gross_profit = Number(i.grossProfit);
    if (i?.operatingIncome != null) patch.operating_income = Number(i.operatingIncome);
    if (q?.pe != null) patch.pe_ratio = Number(q.pe);
    if (q?.eps != null) patch.eps = Number(q.eps);
    if (b?.totalAssets != null) patch.total_assets = Number(b.totalAssets);
    if (b?.totalStockholdersEquity != null) patch.total_equity = Number(b.totalStockholdersEquity);
    if (b?.totalDebt != null) patch.total_debt = Number(b.totalDebt);
    if (c?.freeCashFlow != null) patch.free_cash_flow = Number(c.freeCashFlow);
    if (Object.keys(patch).length) {
      await supabase.from('ftse100_companies').update(patch).eq('symbol', symbol);
    }
  } catch (e) {
    // ignore
  }
}

export async function enhanceFTSE100Data() {
  try {
    const { data, error } = await supabase.from('ftse100_companies').select('symbol');
    if (error) throw error;
    const syms = (data || []).map(r => r.symbol).filter(Boolean);
    let enhanced = 0, failed = 0;
    for (const s of syms) {
      try { await enhanceOne(s); enhanced++; } catch { failed++; }
      await new Promise(r => setTimeout(r, 120));
    }
    return { enhanced, failed };
  } catch (e) {
    return { enhanced: 0, failed: 0, error: (e as any)?.message || String(e) };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  enhanceFTSE100Data().then(r => { console.log(r); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}


