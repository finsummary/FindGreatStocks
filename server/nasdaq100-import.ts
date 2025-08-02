#!/usr/bin/env tsx

import { db } from "./db";
import { nasdaq100Companies } from "@shared/schema";
import type { InsertNasdaq100Company } from "@shared/schema";

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const FMP_API_KEY = process.env.FMP_API_KEY;

// Nasdaq 100 companies list (as of 2024)
const NASDAQ_100_SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "TSLA", "META", "AVGO", "COST",
  "NFLX", "ADBE", "PEP", "TMUS", "CSCO", "QCOM", "TXN", "CMCSA", "INTU", "AMD",
  "HON", "AMGN", "SBUX", "ISRG", "BKNG", "GILD", "VRTX", "ADP", "MDLZ", "LRCX",
  "INTC", "ADI", "REGN", "ASML", "AMAT", "CDNS", "KLAC", "SNPS", "PYPL", "ABNB",
  "MRVL", "ORLY", "CTAS", "CHTR", "DXCM", "FTNT", "TEAM", "PCAR", "NXPI", "MELI",
  "CRWD", "ADSK", "PANW", "MNST", "AEP", "ROST", "WDAY", "FAST", "ODFL", "EXC",
  "KDP", "VRSK", "LULU", "DDOG", "CTSH", "XEL", "BIIB", "CCEP", "ZS", "ANSS",
  "IDXX", "TTWO", "ON", "FANG", "CSGP", "ILMN", "MDB", "WBD", "GFS", "ARM",
  "DLTR", "MRNA", "WBA", "CDW", "ZM", "GEHC", "ALGN", "MCHP", "SMCI", "BKR",
  "EBAY", "LCID", "ENPH", "RIVN", "SIRI", "JD", "PDD", "NTES", "WIX", "DOCU"
];

async function makeRequest(endpoint: string): Promise<any> {
  if (!FMP_API_KEY) {
    throw new Error("FMP_API_KEY is not configured");
  }

  const url = `${FMP_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${FMP_API_KEY}`;
  console.log(`Fetching: ${endpoint}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 429) {
      console.log(`Rate limited, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return null;
    }
    console.log(`Error response: ${response.status} ${response.statusText}`);
    return null;
  }
  
  return response.json();
}

async function fetchCompanyData(symbol: string): Promise<any> {
  try {
    // Get basic company profile
    const profile = await makeRequest(`/profile/${symbol}`);
    if (!profile || !Array.isArray(profile) || profile.length === 0) {
      return null;
    }
    
    return profile[0];
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
}

async function fetchFinancialData(symbol: string): Promise<any> {
  try {
    // Get key metrics
    const keyMetrics = await makeRequest(`/key-metrics-ttm/${symbol}`);
    return keyMetrics && Array.isArray(keyMetrics) && keyMetrics.length > 0 ? keyMetrics[0] : {};
  } catch (error) {
    console.error(`Error fetching financial data for ${symbol}:`, error);
    return {};
  }
}

function convertToNasdaq100Schema(companyData: any, financialData: any, rank: number): InsertNasdaq100Company {
  const getCountryCode = (country: string, exchange: string): string => {
    if (country === 'US' || exchange === 'NASDAQ' || exchange === 'NYSE') return 'us';
    return 'us'; // Default to US for Nasdaq 100
  };

  return {
    rank,
    symbol: companyData.symbol,
    name: companyData.companyName || companyData.name,
    marketCap: companyData.mktCap?.toString() || "0",
    price: companyData.price?.toString() || "0",
    dailyChange: companyData.changes?.toString() || "0",
    dailyChangePercent: companyData.changesPercentage?.toString() || "0",
    sector: companyData.sector || null,
    industry: companyData.industry || null,
    country: getCountryCode(companyData.country, companyData.exchangeShortName),
    website: companyData.website || null,
    description: companyData.description || null,
    ceo: companyData.ceo || null,
    employees: companyData.fullTimeEmployees || null,
    peRatio: financialData.peRatioTTM?.toString() || companyData.pe?.toString() || null,
    eps: financialData.eps?.toString() || null,
    beta: companyData.beta?.toString() || null,
    dividendYield: financialData.dividendYieldTTM?.toString() || null,
    revenue: financialData.revenueTTM?.toString() || null,
    netIncome: financialData.netIncomeTTM?.toString() || null,
    totalDebt: financialData.totalDebtTTM?.toString() || null,
    totalCash: financialData.cashAndCashEquivalentsTTM?.toString() || null,
    freeCashFlow: financialData.freeCashFlowTTM?.toString() || null,
    lastUpdated: new Date(),
  };
}

async function importNasdaq100Companies() {
  console.log("Starting Nasdaq 100 companies import...");
  
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < NASDAQ_100_SYMBOLS.length; i++) {
    const symbol = NASDAQ_100_SYMBOLS[i];
    
    try {
      console.log(`[${i + 1}/${NASDAQ_100_SYMBOLS.length}] Processing ${symbol}`);
      
      const companyData = await fetchCompanyData(symbol);
      if (!companyData) {
        console.log(`⚠ No data available for ${symbol}`);
        errorCount++;
        continue;
      }
      
      const financialData = await fetchFinancialData(symbol);
      
      const companyRecord = convertToNasdaq100Schema(companyData, financialData, i + 1);
      
      // Insert or update company
      await db
        .insert(nasdaq100Companies)
        .values(companyRecord)
        .onConflictDoUpdate({
          target: nasdaq100Companies.symbol,
          set: {
            ...companyRecord,
            lastUpdated: new Date(),
          },
        });
      
      console.log(`✓ Successfully processed ${symbol} - ${companyData.companyName}`);
      successCount++;
      
      // Rate limiting
      if (i % 10 === 0 && i > 0) {
        console.log(`Processed ${i} companies, pausing for rate limiting...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`Error processing ${symbol}:`, error);
      errorCount++;
    }
  }

  console.log("\nNasdaq 100 import completed!");
  console.log(`Success: ${successCount} companies`);
  console.log(`Errors: ${errorCount} companies`);
}

// Run the script
importNasdaq100Companies()
  .then(() => {
    console.log("Nasdaq 100 import completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Nasdaq 100 import failed:", error);
    process.exit(1);
  });