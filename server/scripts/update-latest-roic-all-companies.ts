#!/usr/bin/env tsx
/**
 * One-shot: set headline `roic` and `roic_y1` from latest available ratio.
 *
 * Default: Yahoo Finance quoteSummary (financialData), no API key; optional FMP fallback.
 *
 * Env:
 *   ROIC_SOURCE           — `yahoo` | `fmp` | `yahoo_then_fmp` (default: yahoo_then_fmp)
 *   FMP_API_KEY           — required if ROIC_SOURCE is `fmp` or fallback is used
 *   ROIC_UPDATE_DELAY_MS  — pause between symbols (default 5000)
 *   ROIC_MAX_SYMBOLS      — process only first N symbols (smoke test)
 *   ROIC_TABLES           — comma-separated tables (default: all four indices)
 */
import * as dotenv from "dotenv";
dotenv.config();

import { supabase } from "../db";
import { fetchLatestAnnualRoicDecimal } from "../fmp-roic-history";
import { fetchLatestAnnualRoicFromYahoo } from "../yahoo-roic";

const FMP_API_KEY = process.env.FMP_API_KEY;

const ROIC_SOURCE = (process.env.ROIC_SOURCE || "yahoo_then_fmp").toLowerCase().trim();

if (ROIC_SOURCE === "fmp" && !FMP_API_KEY) {
  console.error("ROIC_SOURCE=fmp requires FMP_API_KEY");
  process.exit(1);
}
if ((ROIC_SOURCE === "yahoo_then_fmp" || ROIC_SOURCE === "") && !FMP_API_KEY) {
  console.warn(
    "No FMP_API_KEY: Yahoo-only attempts will not fall back to FMP when Yahoo returns no ROIC."
  );
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

async function fetchRoicForSymbol(symbol: string): Promise<{ value: number | null; source: string }> {
  if (ROIC_SOURCE === "fmp") {
    if (!FMP_API_KEY) return { value: null, source: "fmp" };
    const v = await fetchLatestAnnualRoicDecimal(symbol, FMP_API_KEY);
    return { value: v, source: "fmp" };
  }
  if (ROIC_SOURCE === "yahoo") {
    const v = await fetchLatestAnnualRoicFromYahoo(symbol);
    return { value: v, source: "yahoo" };
  }
  // yahoo_then_fmp (default)
  const y = await fetchLatestAnnualRoicFromYahoo(symbol);
  if (y !== null && Number.isFinite(y)) {
    return { value: y, source: "yahoo" };
  }
  if (FMP_API_KEY) {
    const f = await fetchLatestAnnualRoicDecimal(symbol, FMP_API_KEY);
    return { value: f, source: "fmp" };
  }
  return { value: null, source: "none" };
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
    `ROIC_SOURCE=${ROIC_SOURCE} | ${symbols.length} unique symbols | ${delayMs}ms between symbols…`
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const { value: roic, source: src } = await fetchRoicForSymbol(symbol);

    if (roic === null || !Number.isFinite(roic)) {
      console.warn(`[${i + 1}/${symbols.length}] ${symbol}: no ROIC (${src})`);
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
        `[${i + 1}/${symbols.length}] ${symbol}: ${(roic * 100).toFixed(2)}% [${src}] → ${[...tableSet].join(", ")}`
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
