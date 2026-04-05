#!/usr/bin/env tsx
/**
 * One-shot: set headline `roic` and `roic_y1` from FMP Stable latest annual FY
 * (returnOnInvestedCapital — for most issuers this is the newest filed year, e.g. "2025" performance).
 *
 * Deduplicates symbols across index tables so each ticker = 1 FMP request.
 *
 * Env:
 *   ROIC_UPDATE_DELAY_MS  — pause between symbols (default 5000)
 *   ROIC_MAX_SYMBOLS      — process only first N symbols (smoke test)
 *   ROIC_TABLES           — comma-separated tables (default: all four indices)
 */
import * as dotenv from "dotenv";
dotenv.config();

import { supabase } from "../db";
import { fetchLatestAnnualRoicDecimal } from "../fmp-roic-history";

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

const delayMs = Math.max(
  0,
  parseInt(process.env.ROIC_UPDATE_DELAY_MS || "5000", 10) || 5000
);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const tablesEnv = process.env.ROIC_TABLES;
  const tables = tablesEnv
    ? tablesEnv.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_TABLES;

  const symbolToTables = new Map<string, Set<string>>();

  for (const tableName of tables) {
    const { data, error } = await supabase.from(tableName).select("symbol");
    if (error) {
      console.warn(`Skip ${tableName}: ${error.message}`);
      continue;
    }
    for (const row of data || []) {
      const sym = String((row as { symbol?: string }).symbol || "").trim();
      if (!sym) continue;
      if (!symbolToTables.has(sym)) symbolToTables.set(sym, new Set());
      symbolToTables.get(sym)!.add(tableName);
    }
  }

  let symbols = Array.from(symbolToTables.keys()).sort();
  const maxN = process.env.ROIC_MAX_SYMBOLS
    ? parseInt(process.env.ROIC_MAX_SYMBOLS, 10)
    : undefined;
  if (maxN && maxN > 0) {
    symbols = symbols.slice(0, maxN);
  }

  console.log(
    `Updating latest annual ROIC for ${symbols.length} unique symbols (${delayMs}ms between symbols)…`
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const roic = await fetchLatestAnnualRoicDecimal(symbol, FMP_API_KEY);

    if (roic === null || !Number.isFinite(roic)) {
      console.warn(`[${i + 1}/${symbols.length}] ${symbol}: no ROIC from FMP`);
      skipped++;
    } else {
      const payload = {
        roic: roic.toFixed(4),
        roic_y1: roic,
      };
      const tableSet = symbolToTables.get(symbol)!;
      for (const tableName of tableSet) {
        const { error } = await supabase.from(tableName).update(payload).eq("symbol", symbol);
        if (error) {
          console.error(`  ${tableName}/${symbol}:`, error.message);
          failed++;
        } else {
          ok++;
        }
      }
      console.log(
        `[${i + 1}/${symbols.length}] ${symbol}: ${(roic * 100).toFixed(2)}% → ${[...tableSet].join(", ")}`
      );
    }

    if (i < symbols.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  console.log(`\nDone. Row updates OK: ${ok}, skipped (no data): ${skipped}, errors: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
