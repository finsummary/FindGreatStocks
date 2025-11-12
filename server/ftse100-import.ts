import 'dotenv/config';
import { supabase } from './db';

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = process.env.FMP_API_KEY;

type Constituent = { symbol: string; name: string };

async function fetchFromFmp(): Promise<Constituent[] | null> {
  try {
    if (!FMP_API_KEY) return null;
    // Try generic index constituents endpoint for FTSE 100 (^FTSE or ^UKX).
    const candidates = ['%5EFTSE', '%5EUKX'];
    for (const idx of candidates) {
      const url = `${FMP_BASE_URL}/index-constituent/${idx}?apikey=${FMP_API_KEY}`;
      const r = await fetch(url);
      if (!r.ok) continue;
      const arr = await r.json();
      if (Array.isArray(arr) && arr.length) {
        // FMP returns array with symbol/name
        return arr.map((x: any) => ({
          symbol: String(x?.symbol || '').toUpperCase(),
          name: String(x?.name || x?.companyName || '').trim(),
        }));
      }
    }
    // Some accounts have regional endpoints
    const urlAlt = `${FMP_BASE_URL}/ftse_constituent?apikey=${FMP_API_KEY}`;
    const alt = await fetch(urlAlt);
    if (alt.ok) {
      const arr = await alt.json();
      if (Array.isArray(arr) && arr.length) {
        return arr.map((x: any) => ({
          symbol: String(x?.symbol || '').toUpperCase(),
          name: String(x?.name || x?.companyName || '').trim(),
        }));
      }
    }
  } catch (e) {
    console.warn('[ftse100-import] FMP fetch failed:', (e as any)?.message || e);
  }
  return null;
}

async function fetchFromWikipedia(): Promise<Constituent[]> {
  try {
    const url = 'https://en.wikipedia.org/wiki/FTSE_100_Index';
    const r = await fetch(url, { headers: { 'user-agent': 'FindGreatStocksBot/1.0 (+https://findgreatstocks.com)' } });
    if (!r.ok) throw new Error(`wiki ${r.status}`);
    const html = await r.text();
    // Very light-weight parse: find table rows under Constituents section
    // We look for patterns: <table class="wikitable"> ... rows with <td>Company</td> <td>Ticker</td> etc.
    const rows: Constituent[] = [];
    const tableMatch = html.match(/<table[^>]*class=\"wikitable[^>]*\">[\\s\\S]*?<\\/table>/gi);
    if (tableMatch) {
      for (const tbl of tableMatch) {
        // Find rows
        const trMatches = tbl.match(/<tr[\\s\\S]*?<\\/tr>/gi) || [];
        for (const tr of trMatches) {
          // Try to capture two cells: company name and EPIC/ticker
          const tds = Array.from(tr.matchAll(/<td[\\s\\S]*?>([\\s\\S]*?)<\\/td>/gi)).map(m => m[1]);
          if (tds.length < 2) continue;
          const cellText = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\\s+/g, ' ').trim();
          const company = cellText(tds[0]);
          // EPIC/ticker often in the 2nd or 3rd cell depending on table variant
          const epicRaw = cellText(tds[1] || '');
          if (!company || !epicRaw) continue;
          // Normalise LSE symbol to FMP format: add .L if absent; uppercase
          let symbol = epicRaw.toUpperCase();
          if (!symbol.endsWith('.L')) symbol = `${symbol}.L`;
          rows.push({ symbol, name: company });
        }
      }
    }
    // Deduplicate by symbol
    const uniq = new Map<string, Constituent>();
    for (const r2 of rows) {
      if (!uniq.has(r2.symbol)) uniq.set(r2.symbol, r2);
    }
    const out = Array.from(uniq.values());
    // Filter out obvious non-constituents like ETFs if present
    return out.filter(c => !/ETF|UCITS|FUND/i.test(c.name));
  } catch (e) {
    console.warn('[ftse100-import] Wikipedia fetch failed:', (e as any)?.message || e);
    return [];
  }
}

export async function importFTSE100Companies() {
  console.log('🚀 FTSE 100 import started');
  const fromFmp = await fetchFromFmp();
  const list = (fromFmp && fromFmp.length) ? fromFmp : await fetchFromWikipedia();
  console.log(`[ftse100-import] Got ${list.length} constituents`);
  if (!list.length) {
    return { imported: 0, failed: 0 };
  }
  let imported = 0;
  let failed = 0;
  for (const c of list) {
    try {
      // Upsert into Supabase table ftse100_companies with minimal fields
      const payload: any = { symbol: c.symbol, name: c.name };
      const { error } = await supabase
        .from('ftse100_companies')
        .upsert(payload, { onConflict: 'symbol' });
      if (error) { failed++; console.warn('upsert error', c.symbol, error.message); }
      else imported++;
    } catch (e) {
      failed++;
      console.warn('upsert ex', c.symbol, (e as any)?.message || e);
    }
  }
  console.log(`✅ FTSE 100 import finished: imported=${imported}, failed=${failed}`);
  return { imported, failed };
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importFTSE100Companies().then(r => {
    console.log('Done:', r);
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}


