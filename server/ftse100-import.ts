import dotenv from "dotenv";
dotenv.config();

import { db } from "./db";
import { ftse100Companies } from "@shared/schema";
import type { InsertFtse100Company } from "@shared/schema";

// This script is a direct adaptation of the successful nasdaq100-import.ts

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

async function getFtse100Constituents(): Promise<{ symbol: string; name: string }[]> {
  console.log("Fetching FTSE 100 constituents...");
  // Note: FMP API does not have a dedicated FTSE 100 constituent list.
  // We use the London Stock Exchange symbol list and filter by market cap later.
  // This is an approximation but the best available method.
  const data = await api<{ symbol: string; name: string, exchange: string }[]>("/stock/list");
  if (!data) {
    console.error("Failed to fetch stock list for FTSE 100 approximation.");
    return [];
  }
  // Filter for London Stock Exchange
  return data.filter(c => c.exchange === 'London Stock Exchange');
}


async function fetchCompanyProfile(symbol: string): Promise<any> {
    const profile = await api<any[]>(`/profile/${symbol}`);
    return (profile && profile.length > 0) ? profile[0] : null;
}

function safeToString(value: any): string | undefined {
    if (value === null || typeof value === 'undefined') return undefined;
    return value.toString();
}

function transformToDbSchema(profile: any, rank: number): InsertFtse100Company | null {
    if (!profile || !profile.symbol || !profile.companyName || profile.mktCap === null || profile.price === null || profile.mktCap == 0) {
        return null; // Skip if critical data is missing or market cap is zero
    }

    return {
        rank,
        symbol: profile.symbol,
        name: profile.companyName,
        marketCap: safeToString(profile.mktCap),
        price: safeToString(profile.price),
        dailyChange: safeToString(profile.changes),
        dailyChangePercent: safeToString(profile.changes / (profile.price - profile.changes)),
        country: profile.country,
        countryCode: profile.country,
        logoUrl: profile.image,
        industry: profile.industry,
        sector: profile.sector,
        website: profile.website,
        description: profile.description,
        ceo: profile.ceo,
        employees: profile.fullTimeEmployees ? parseInt(profile.fullTimeEmployees, 10) : undefined,
        peRatio: safeToString(profile.pe),
        eps: safeToString(profile.eps),
        beta: safeToString(profile.beta),
        dividendYield: safeToString(profile.lastDiv / profile.price), // Approximate yield
        volume: safeToString(profile.volume),
        avgVolume: safeToString(profile.avgVolume),
        yearLow: safeToString(profile.range?.split('-')[0]), // FMP API sometimes uses 'range' for 52-week
        yearHigh: safeToString(profile.range?.split('-')[1]),
        revenue: null, // These will be filled by enhancers
        grossProfit: null,
        operatingIncome: null,
        netIncome: null,
        totalAssets: null,
        totalDebt: null,
        cashAndEquivalents: null,
    };
}


async function importFtse100() {
  console.log("🚀 Starting FTSE 100 import...");
  
  // Clear existing data to ensure a fresh import
  await db.delete(ftse100Companies);
  console.log("🗑️ Cleared existing FTSE 100 data.");

  const constituents = await getFtse100Constituents();
  console.log(`📊 Found ${constituents.length} potential LSE companies. Fetching profiles to filter FTSE 100 by market cap...`);

  let successCount = 0;
  let failedCount = 0;
  let companyProfiles = [];

  for (const [index, company] of constituents.entries()) {
    process.stdout.write(`Fetching profile ${index + 1}/${constituents.length} for ${company.symbol}...\r`);
    const profile = await fetchCompanyProfile(company.symbol);
    if (profile && profile.mktCap > 0) { // Only consider companies with a market cap
        companyProfiles.push(profile);
    }
    await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
  }

  // Sort by market cap and take the top 100
  companyProfiles.sort((a, b) => b.mktCap - a.mktCap);
  const top100 = companyProfiles.slice(0, 100);
  console.log(`\n✅ Identified top 100 companies by market cap. Starting import...`);

  for (const [index, profile] of top100.entries()) {
    try {
        const companyForDb = transformToDbSchema(profile, index + 1);
        if (companyForDb) {
            await db.insert(ftse100Companies).values(companyForDb).onConflictDoNothing();
            successCount++;
            console.log(`[${successCount}/${top100.length}] ✅ Imported ${profile.symbol}`);
        } else {
            failedCount++;
        }
    } catch (error) {
      console.error(`❌ Failed to process ${profile.symbol}:`, error);
      failedCount++;
    }
  }
  
  console.log("\n🎉 FTSE 100 import complete:");
  console.log(`✅ Success: ${successCount} companies`);
  console.log(`❌ Failed: ${failedCount} companies`);
}

importFtse100().catch(err => {
    console.error("FTSE 100 import failed fatally:", err);
    process.exit(1);
});