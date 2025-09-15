import dotenv from "dotenv";
dotenv.config();

import { db } from "./db";
import { companies, nasdaq100Companies, dowJonesCompanies, sp500Companies } from "@shared/schema";
import { eq, isNull, or } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const FMP_API_KEY = process.env.FMP_API_KEY;

interface AnnualIncomeStatement {
  date: string;
  revenue: number;
  netIncome: number;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAnnualIncomeStatements(symbol: string): Promise<AnnualIncomeStatement[]> {
  if (!FMP_API_KEY) {
    throw new Error("FMP_API_KEY is not configured");
  }
  const url = `${FMP_BASE_URL}/income-statement/${symbol}?period=annual&limit=12&apikey=${FMP_API_KEY}`;
  
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
            const delay = 5000 * Math.pow(2, i);
            console.warn(`[WARN] Rate limit hit for ${symbol}. Retrying in ${delay / 1000}s...`);
            await sleep(delay);
            continue;
        }
        console.error(`API error for ${symbol}: ${response.status} ${response.statusText}`);
        return [];
      }
      const data = await response.json();
      return data as AnnualIncomeStatement[];
    } catch (error) {
      if (i < 2) {
        const delay = 5000 * Math.pow(2, i);
        console.warn(`[WARN] Network error for ${symbol}. Retrying in ${delay/1000}s...`);
        await sleep(delay);
      } else {
        console.error(`Failed to fetch income statements for ${symbol}:`, error);
        return [];
      }
    }
  }
  return [];
}

function calculateCAGR(startValue: number, endValue: number, periods: number): number | null {
  if (startValue <= 0 || endValue <= 0 || periods <= 0) {
    return null;
  }
  const cagr = (Math.pow(endValue / startValue, 1 / periods) - 1) * 100;
  return parseFloat(cagr.toFixed(2));
}

async function enhanceRevenueGrowthForTable(table: PgTable, name: string) {
  console.log(`🚀 Starting revenue growth enhancement for ${name}...`);

  try {
    const companiesToEnhance = await db
      .select({
        symbol: table.symbol,
      })
      .from(table)
      .where(
        // Populate where any growth metric is missing
        // @ts-ignore
        or(isNull(table.revenueGrowth3Y), isNull(table.revenueGrowth5Y), isNull(table.revenueGrowth10Y))
      );
    
    if (companiesToEnhance.length === 0) {
        console.log(`🎉 All companies in ${name} already have 3Y/5Y/10Y revenue growth. Nothing to do.`);
        return;
    }

    console.log(`📊 Found ${companiesToEnhance.length} companies in ${name} to enhance.`);
    
    let successCount = 0;
    let failedCount = 0;

    for (const [index, company] of companiesToEnhance.entries()) {
      console.log(`[${index + 1}/${companiesToEnhance.length}] Processing ${company.symbol}...`);
      
      // API rate limiting
      await sleep(300); 

      const statements = await getAnnualIncomeStatements(company.symbol);
      if (statements.length < 2) {
        console.warn(`⚠️ Not enough data for ${company.symbol} (need at least 2 years).`);
        failedCount++;
        continue;
      }
      
      // Newest first
      statements.sort((a, b) => new Date(b.date).getFullYear() - new Date(a.date).getFullYear());
      
      const latestStatement = statements[0];

      const getRevenueByYearAgo = (years: number): number | undefined => statements[years]?.revenue;

      const endRevenue = getRevenueByYearAgo(0);
      if (endRevenue === undefined) {
          console.warn(`⚠️ No recent revenue data for ${company.symbol}.`);
          failedCount++;
          continue;
      }

      const revenue3Y_ago = getRevenueByYearAgo(3);
      const revenue5Y_ago = getRevenueByYearAgo(5);
      const revenue10Y_ago = getRevenueByYearAgo(10);

      const growth3Y = revenue3Y_ago ? calculateCAGR(revenue3Y_ago, endRevenue, 3) : null;
      const growth5Y = revenue5Y_ago ? calculateCAGR(revenue5Y_ago, endRevenue, 5) : null;
      const growth10Y = revenue10Y_ago ? calculateCAGR(revenue10Y_ago, endRevenue, 10) : null;

      const updates: any = {
        revenue: latestStatement.revenue,
        netIncome: latestStatement.netIncome,
      };

      if (growth3Y !== null) {
        updates.revenueGrowth3Y = growth3Y;
      }
      if (growth5Y !== null) {
        updates.revenueGrowth5Y = growth5Y;
      }
      if (growth10Y !== null) {
        updates.revenueGrowth10Y = growth10Y;
      }

      if (Object.keys(updates).length > 0) {
        try {
          await db.update(table).set(updates).where(eq(table.symbol, company.symbol));
          console.log(`✅ ${company.symbol}: 3Y=${growth3Y ?? 'N/A'}, 5Y=${growth5Y ?? 'N/A'}, 10Y=${growth10Y ?? 'N/A'}`);
          successCount++;
        } catch (dbError) {
          console.error(`❌ Failed to update ${company.symbol} in ${name}:`, dbError);
          failedCount++;
        }
      } else {
        console.warn(`⚠️ No growth rates to update for ${company.symbol}.`);
        successCount++;
      }
    }

    console.log(`\n🎉 ${name} revenue growth enhancement complete:`);
    console.log(`✅ Success: ${successCount} companies`);
    console.log(`❌ Failed: ${failedCount} companies`);

  } catch (error) {
    console.error(`❌ Error during ${name} revenue growth enhancement process:`, error);
  }
}

async function main() {
  await enhanceRevenueGrowthForTable(sp500Companies, "S&P 500");
  await enhanceRevenueGrowthForTable(nasdaq100Companies, "Nasdaq 100");
  await enhanceRevenueGrowthForTable(dowJonesCompanies, "Dow Jones");
  console.log("\nAll revenue growth enhancements complete.");
  process.exit(0);
}

main().catch(err => {
  console.error("Unhandled error in main execution:", err);
  process.exit(1);
});
