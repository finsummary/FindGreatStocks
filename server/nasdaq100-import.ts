#!/usr/bin/env tsx

import dotenv from "dotenv";
dotenv.config();

import { db } from "./db";
import { nasdaq100Companies } from "@shared/schema";
import type { InsertNasdaq100Company } from "@shared/schema";

const FMP_API_KEY = process.env.FMP_API_KEY;
if (!FMP_API_KEY) {
  throw new Error("FMP_API_KEY is not defined in your .env file.");
}

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";

async function api<T>(endpoint: string): Promise<T | null> {
  const apiKeySeparator = endpoint.includes('?') ? '&' : '?';
  const url = `${FMP_BASE_URL}${endpoint}${apiKeySeparator}apikey=${FMP_API_KEY}`;
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

async function getNasdaq100Constituents(): Promise<{ symbol: string; name: string }[]> {
  console.log("Fetching Nasdaq 100 constituents...");
  const data = await api<{ symbol: string; name: string }[]>("/nasdaq_constituent");
  if (!data) {
    console.error("Failed to fetch Nasdaq 100 constituents.");
    return [];
  }
  return data;
}

async function fetchCompanyProfile(symbol: string): Promise<any> {
  const profile = await api<any[]>(`/profile/${symbol}`);
  return (profile && profile.length > 0) ? profile[0] : null;
}

async function fetchKeyMetrics(symbol: string): Promise<any> {
    const metrics = await api<any[]>(`/key-metrics-ttm/${symbol}`);
    return (metrics && metrics.length > 0) ? metrics[0] : null;
}

async function fetchIncomeStatement(symbol: string): Promise<any> {
    const statement = await api<any[]>(`/income-statement/${symbol}?period=annual&limit=1`);
    return (statement && statement.length > 0) ? statement[0] : null;
}

function safeToString(value: any): string | undefined {
    if (value === null || typeof value === 'undefined') {
        return undefined;
    }
    return value.toString();
}

function transformToDbSchema(profile: any, metrics: any, incomeStatement: any, rank: number): InsertNasdaq100Company | null {
    if (!profile || !profile.symbol || !profile.companyName || profile.mktCap === null || profile.price === null) {
        console.warn(`- Skipping ${profile?.symbol || 'unknown symbol'} due to missing critical data (symbol, name, marketCap, or price).`);
        return null;
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
        countryCode: profile.country, // Assuming country code is same as country for now
        logoUrl: profile.image,
        industry: profile.industry,
        sector: profile.sector,
        website: profile.website,
        description: profile.description,
        ceo: profile.ceo,
        employees: profile.fullTimeEmployees ? parseInt(profile.fullTimeEmployees, 10) : undefined,
        peRatio: safeToString(metrics?.peRatioTTM),
        eps: safeToString(metrics?.epsTTM),
        beta: safeToString(profile.beta),
        dividendYield: safeToString(metrics?.dividendYieldTTM),
        volume: safeToString(profile.volume),
        avgVolume: safeToString(profile.avgVolume),
        dayLow: safeToString(profile.range?.split('-')[0]),
        dayHigh: safeToString(profile.range?.split('-')[1]),
        yearLow: safeToString(profile.yearLow),
        yearHigh: safeToString(profile.yearHigh),
        revenue: safeToString(incomeStatement?.revenue),
        grossProfit: safeToString(incomeStatement?.grossProfit),
        operatingIncome: safeToString(incomeStatement?.operatingIncome),
        netIncome: safeToString(incomeStatement?.netIncome),
        totalAssets: safeToString(metrics?.totalAssetsTTM),
        totalDebt: safeToString(metrics?.totalDebtTTM),
        cashAndEquivalents: safeToString(metrics?.cashAndCashEquivalentsTTM),
    };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function importNasdaq100() {
  console.log("🚀 Starting Nasdaq 100 import...");
  const constituents = await getNasdaq100Constituents();
  console.log(`📊 Found ${constituents.length} Nasdaq 100 companies.`);

  let successCount = 0;
  let failedCount = 0;
  
  for (const [index, company] of constituents.entries()) {
    console.log(`[${index + 1}/${constituents.length}] Processing ${company.symbol}...`);
    try {
      const profile = await fetchCompanyProfile(company.symbol);
      const metrics = await fetchKeyMetrics(company.symbol);
      const incomeStatement = await fetchIncomeStatement(company.symbol);

      if (!profile) {
        console.warn(`- No profile data for ${company.symbol}, skipping.`);
        failedCount++;
        continue;
      }
      
      const companyForDb = transformToDbSchema(profile, metrics || {}, incomeStatement || {}, index + 1);
      
      if (!companyForDb) {
        failedCount++;
        continue;
      }

      await db
        .insert(nasdaq100Companies)
        .values(companyForDb)
        .onConflictDoUpdate({
          target: nasdaq100Companies.symbol,
          set: { ...companyForDb, id: undefined },
        });
        
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed to process ${company.symbol}. Error: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
      failedCount++;
    }
    await sleep(300); // Wait for 300ms to avoid rate limiting
  }
  
  console.log("\n🎉 Nasdaq 100 import complete:");
  console.log(`✅ Success: ${successCount} companies`);
  console.log(`❌ Failed: ${failedCount} companies`);
}


importNasdaq100();