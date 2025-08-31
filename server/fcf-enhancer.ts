import dotenv from "dotenv";
dotenv.config();

import { db } from "./db";
import { companies, nasdaq100Companies, dowJonesCompanies } from "@shared/schema";
import { eq, isNull, or } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const FMP_API_KEY = process.env.FMP_API_KEY;

interface CashFlowStatement {
  date: string;
  freeCashFlow: number;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAnnualCashFlow(symbol: string): Promise<CashFlowStatement[]> {
  if (!FMP_API_KEY) {
    throw new Error("FMP_API_KEY is not configured");
  }
  const url = `${FMP_BASE_URL}/cash-flow-statement/${symbol}?period=annual&limit=1&apikey=${FMP_API_KEY}`;
  
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
      return data as CashFlowStatement[];
    } catch (error) {
      if (i < 2) {
        const delay = 5000 * Math.pow(2, i);
        console.warn(`[WARN] Network error for ${symbol}. Retrying in ${delay/1000}s...`);
        await sleep(delay);
      } else {
        console.error(`Failed to fetch cash flow for ${symbol}:`, error);
        return [];
      }
    }
  }
  return [];
}


async function enhanceFcfForTable(table: PgTable, name: string) {
  console.log(`🚀 Starting Free Cash Flow enhancement for ${name}...`);

  try {
    const companiesToEnhance = await db
      .select({
        symbol: table.symbol,
      })
      .from(table)
      .where(isNull(table.freeCashFlow));
    
    if (companiesToEnhance.length === 0) {
        console.log(`🎉 All companies in ${name} already have FCF data. Nothing to do.`);
        return;
    }

    console.log(`📊 Found ${companiesToEnhance.length} companies in ${name} to enhance.`);
    
    let successCount = 0;
    let failedCount = 0;

    for (const [index, company] of companiesToEnhance.entries()) {
      console.log(`[${index + 1}/${companiesToEnhance.length}] Processing ${company.symbol}...`);
      
      await sleep(300); // API rate limiting

      const statements = await getAnnualCashFlow(company.symbol);
      if (statements.length === 0) {
        console.warn(`⚠️ No cash flow data for ${company.symbol}.`);
        failedCount++;
        continue;
      }
      
      const latestStatement = statements[0];

      if (latestStatement.freeCashFlow) {
        try {
          await db.update(table).set({
            freeCashFlow: latestStatement.freeCashFlow.toString()
          }).where(eq(table.symbol, company.symbol));
          console.log(`✅ ${company.symbol}: FCF = ${latestStatement.freeCashFlow}`);
          successCount++;
        } catch (dbError) {
          console.error(`❌ Failed to update ${company.symbol} in ${name}:`, dbError);
          failedCount++;
        }
      } else {
        console.warn(`⚠️ No FCF value to update for ${company.symbol}.`);
        successCount++; // Still count as success if data is just missing
      }
    }

    console.log(`\n🎉 ${name} FCF enhancement complete:`);
    console.log(`✅ Success: ${successCount} companies`);
    console.log(`❌ Failed: ${failedCount} companies`);

  } catch (error) {
    console.error(`❌ Error during ${name} FCF enhancement process:`, error);
  }
}

async function main() {
  await enhanceFcfForTable(companies, "S&P 500");
  await enhanceFcfForTable(nasdaq100Companies, "Nasdaq 100");
  await enhanceFcfForTable(dowJonesCompanies, "Dow Jones");
  console.log("\nAll FCF enhancements complete.");
  process.exit(0);
}

main().catch(err => {
  console.error("Unhandled error in main execution:", err);
  process.exit(1);
});
