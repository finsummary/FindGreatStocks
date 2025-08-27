#!/usr/bin/env tsx

import dotenv from "dotenv";
dotenv.config();

import { db } from "./db";
import { companies } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";

const FMP_API_KEY = process.env.FMP_API_KEY;
if (!FMP_API_KEY) {
  throw new Error("FMP_API_KEY is not defined in your .env file.");
}

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";

async function api<T>(endpoint: string): Promise<T | null> {
  const url = `${FMP_BASE_URL}${endpoint}?apikey=${FMP_API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText} for URL: ${url}`);
      return null;
    }
    return response.json() as Promise<T>;
  } catch (error) {
    console.error(`Fetch failed for ${url}:`, error);
    return null;
  }
}

async function fetchKeyMetrics(symbol: string): Promise<any> {
    const metrics = await api<any[]>(`/key-metrics-ttm/${symbol}`);
    return (metrics && metrics.length > 0) ? metrics[0] : null;
}

async function fixMissingPeRatios() {
  console.log("🚀 Starting to fix missing P/E ratios for S&P 500 companies...");

  const companiesToFix = await db
    .select({
      id: companies.id,
      symbol: companies.symbol,
    })
    .from(companies)
    .where(isNull(companies.peRatio));

  console.log(`📊 Found ${companiesToFix.length} companies with missing P/E ratios.`);

  let successCount = 0;
  let failedCount = 0;

  for (const [index, company] of companiesToFix.entries()) {
    console.log(`[${index + 1}/${companiesToFix.length}] Processing ${company.symbol}...`);
    try {
      const metrics = await fetchKeyMetrics(company.symbol);
      const peRatio = metrics?.peRatioTTM;

      if (peRatio !== null && peRatio !== undefined) {
        await db
          .update(companies)
          .set({ peRatio: String(peRatio) })
          .where(eq(companies.id, company.id));
        console.log(`✅ Updated P/E for ${company.symbol} to ${peRatio}`);
        successCount++;
      } else {
        console.warn(`- No P/E ratio found for ${company.symbol}, skipping.`);
        failedCount++;
      }
    } catch (error: any) {
      console.error(`❌ Failed to process ${company.symbol}. Error: ${error.message}`);
      failedCount++;
    }
  }

  console.log("\n🎉 P/E ratio fix complete:");
  console.log(`✅ Success: ${successCount} companies updated`);
  console.log(`❌ Skipped/Failed: ${failedCount} companies`);
}

fixMissingPeRatios();
