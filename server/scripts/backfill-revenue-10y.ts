import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { financialDataService } from '../financial-data';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function calcCagr(start: number, end: number, years: number): number | null {
  if (!start || !end || start <= 0 || end <= 0 || years <= 0) return null;
  const cagr = (Math.pow(end / start, 1 / years) - 1) * 100;
  return Math.round(cagr * 100) / 100; // 2 dp
}

async function processTable(tableName: string) {
  console.log(`\n➡️  Processing table: ${tableName}`);
  const { data: rows, error } = await supabase.from(tableName).select('symbol');
  if (error) {
    console.warn(`Skip ${tableName}: ${error.message}`);
    return;
  }
  const symbols: string[] = (rows || []).map((r: any) => r.symbol).filter(Boolean);
  console.log(`Found ${symbols.length} symbols in ${tableName}`);
  let updated = 0;
  let nulled = 0;
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    try {
      // Rate limit safety
      await new Promise((r) => setTimeout(r, 150));
      const stmts = await financialDataService.fetchIncomeStatement(sym, 12);
      if (!Array.isArray(stmts) || stmts.length < 11) {
        // Not enough annual points: force NULL
        const { error: upErr } = await supabase.from(tableName).update({ revenue_growth_10y: null }).eq('symbol', sym);
        if (!upErr) {
          nulled++;
          console.log(`  [${i + 1}/${symbols.length}] ${sym}: set revenue_growth_10y = NULL (insufficient history: ${stmts?.length || 0})`);
        } else {
          console.warn(`  ${sym}: update error -> ${upErr.message}`);
        }
        continue;
      }
      const latest = Number(stmts[0]?.revenue || 0);
      const tenAgo = Number(stmts[10]?.revenue || 0);
      const cagr = calcCagr(tenAgo, latest, 10);
      if (cagr === null) {
        const { error: upErr } = await supabase.from(tableName).update({ revenue_growth_10y: null }).eq('symbol', sym);
        if (!upErr) {
          nulled++;
          console.log(`  [${i + 1}/${symbols.length}] ${sym}: set revenue_growth_10y = NULL (bad values)`);
        } else {
          console.warn(`  ${sym}: update error -> ${upErr.message}`);
        }
      } else {
        const { error: upErr } = await supabase.from(tableName).update({ revenue_growth_10y: cagr }).eq('symbol', sym);
        if (!upErr) {
          updated++;
          console.log(`  [${i + 1}/${symbols.length}] ${sym}: revenue_growth_10y = ${cagr}%`);
        } else {
          console.warn(`  ${sym}: update error -> ${upErr.message}`);
        }
      }
    } catch (e: any) {
      console.warn(`  ${sym}: fetch/calc failed -> ${e?.message || e}`);
    }
  }
  console.log(`✅ ${tableName}: updated=${updated}, nulled=${nulled}`);
}

async function main() {
  await processTable('sp500_companies');
  await processTable('nasdaq100_companies');
  await processTable('dow_jones_companies');
  // Optional: FTSE 100 if exists in this project
  try {
    const { error } = await supabase.from('ftse100_companies').select('symbol').limit(1);
    if (!error) await processTable('ftse100_companies');
  } catch {}
  console.log('\nDone.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Backfill error:', e);
  process.exit(1);
});


