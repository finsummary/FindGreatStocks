#!/usr/bin/env tsx
/**
 * Backfill ROIC Y1–Y10 from FMP Stable annual key-metrics (latest FY, incl. 2025-era filings).
 *
 * Usage:
 *   npx tsx server/scripts/update-all-roic-history-fmp.ts
 *   ROIC_TABLES=sp500_companies,nasdaq100_companies npx tsx server/scripts/update-all-roic-history-fmp.ts
 *   ROIC_MAX_SYMBOLS=50 npx tsx ...   (smoke test)
 */
import * as dotenv from "dotenv";
dotenv.config();

import { supabase } from "../db";
import { updateRoic10YHistoryForSymbol } from "../fmp-roic-history";

const FMP_API_KEY = process.env.FMP_API_KEY;
if (!FMP_API_KEY) {
  console.error("FMP_API_KEY is required");
  process.exit(1);
}

const DEFAULT_TABLES = [
  "sp500_companies",
  "nasdaq100_companies",
  "dow_jones_companies",
  "ftse100_companies",
];

const DELAY_MS = 280;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const tablesEnv = process.env.ROIC_TABLES;
  const tables = tablesEnv
    ? tablesEnv.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_TABLES;

  const maxSymbols = process.env.ROIC_MAX_SYMBOLS
    ? parseInt(process.env.ROIC_MAX_SYMBOLS, 10)
    : undefined;

  let totalOk = 0;
  let totalFail = 0;

  for (const tableName of tables) {
    console.log(`\n━━━ ${tableName} ━━━`);
    const { data: rows, error } = await supabase.from(tableName).select("symbol").order("symbol");
    if (error) {
      console.error(`Skip ${tableName}:`, error.message);
      continue;
    }
    let symbols = (rows || []).map((r: { symbol: string }) => r.symbol).filter(Boolean);
    if (maxSymbols && maxSymbols > 0) {
      symbols = symbols.slice(0, maxSymbols);
    }
    console.log(`Processing ${symbols.length} symbols...`);

    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      const ok = await updateRoic10YHistoryForSymbol(supabase, tableName, sym, FMP_API_KEY);
      if (ok) totalOk++;
      else totalFail++;
      if (i < symbols.length - 1) await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone. OK: ${totalOk}, failed: ${totalFail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
