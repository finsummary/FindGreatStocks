import { db } from "./db";
import { companies, nasdaq100Companies, dowJonesCompanies } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const FMP_API_KEY = process.env.FMP_API_KEY;

interface HistoricalPrice {
  date: string;
  close: number;
  adjClose: number;
}

interface CompanyReturns {
  symbol: string;
  return3Year: number | null;
  return5Year: number | null;
  return10Year: number | null;
}

async function getHistoricalPrices(symbol: string, from: string, to: string): Promise<HistoricalPrice[]> {
    if (!FMP_API_KEY) {
        throw new Error("FMP_API_KEY is not configured");
    }
    const url = `${FMP_BASE_URL}/historical-price-full/${symbol}?from=${from}&to=${to}&apikey=${FMP_API_KEY}`;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 429 || response.status >= 500) {
                    const delay = 5000 * Math.pow(2, attempt - 1); // 5s, 10s, 20s
                    console.warn(`[WARN] Attempt ${attempt}/3 for ${symbol} failed with status ${response.status}. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue; // Retry
                }
                console.error(`❌ Failed to fetch historical prices for ${symbol}: ${response.status} ${response.statusText}`);
                try {
                    const errorText = await response.text();
                    console.error(`Error response body for ${symbol}: ${errorText}`);
                } catch (e) {
                    console.error(`Could not read error response body for ${symbol}.`);
                }
                return []; // Don't retry for client errors like 404
            }
            const data = await response.json();
            if (data["Error Message"]) {
                console.error(`❌ API Error for ${symbol}: ${data["Error Message"]}`);
                return [];
            }
            return data.historical || [];
        } catch (error) {
            console.error(`[ATTEMPT ${attempt}/3] Network or fetch error for ${symbol}:`, (error as Error).message);
            if (attempt < 3) {
                const delay = 5000 * Math.pow(2, attempt - 1); // 5s, 10s, 20s
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`❌ All 3 attempts failed for ${symbol}. Giving up.`);
                return [];
            }
        }
    }
    return []; // Should not be reached if retries are configured
}

async function calculateAllAnnualizedReturns(symbol: string): Promise<{ return3Year: string | null; return5Year: string | null; return10Year: string | null; }> {
  const toDate = new Date();
  const fromDate10Y = new Date();
  fromDate10Y.setFullYear(toDate.getFullYear() - 10);
  const fromDateStr = fromDate10Y.toISOString().split('T')[0];
  const toDateStr = toDate.toISOString().split('T')[0];

  const returns = {
    return3Year: null,
    return5Year: null,
    return10Year: null,
  };

  try {
    const historicalData = await getHistoricalPrices(symbol, fromDateStr, toDateStr);

    if (historicalData.length < 2) {
      return returns;
    }
    
    // Data is newest to oldest, reverse for calculations
    const sortedData = historicalData.slice().reverse();

    for (const periodInYears of [3, 5, 10]) {
        const fromDatePeriod = new Date();
        fromDatePeriod.setFullYear(toDate.getFullYear() - periodInYears);

        // Check if the earliest available data point is recenter than our target start date.
        // If it is, we don't have enough data for this period.
        const earliestDataDate = new Date(sortedData[0].date);
        if (earliestDataDate > fromDatePeriod) {
            console.log(`- Skipping ${periodInYears}Y calculation for ${symbol}: not enough historical data (earliest: ${earliestDataDate.toISOString().split('T')[0]}).`);
            continue; // Not enough data for this period
        }

        const startIndex = sortedData.findIndex(d => new Date(d.date) >= fromDatePeriod);
        if (startIndex === -1) continue;

        const relevantData = sortedData.slice(startIndex);
        if(relevantData.length < 2) continue;

        const startPrice = relevantData[0].close;
        const endPrice = relevantData[relevantData.length - 1].close;

        const startDate = new Date(relevantData[0].date);
        const endDate = new Date(relevantData[relevantData.length - 1].date);
        const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        
        if (startPrice === 0 || years <= 0) continue;

        const totalReturn = (endPrice - startPrice) / startPrice;
        const annualizedReturn = (Math.pow(1 + totalReturn, 1 / years) - 1) * 100;
        
        if (!isNaN(annualizedReturn)) {
            if (periodInYears === 3) returns.return3Year = annualizedReturn.toFixed(2);
            if (periodInYears === 5) returns.return5Year = annualizedReturn.toFixed(2);
            if (periodInYears === 10) returns.return10Year = annualizedReturn.toFixed(2);
        }
    }

    return returns;

  } catch (error) {
    console.error(`Error calculating annualized returns for ${symbol}:`, error);
    return returns;
  }
}


async function enhanceReturnsForTable(table: PgTable, name: string) {
  console.log(`🚀 Starting returns enhancement for ${name}...`);
  const companiesToEnhance = await db.select({ symbol: table.symbol }).from(table).where(sql`${table.return10Year} is null`);
  
  if (companiesToEnhance.length === 0) {
    console.log(`🎉 All companies in ${name} already have return data. Nothing to do.`);
    return;
  }

  console.log(`