import { db } from './db';
import { dowJonesCompanies, sp500Companies, nasdaq100Companies } from '@shared/schema';
import { sql, eq, inArray, isNull, and } from 'drizzle-orm';
import { financialDataService as financialData } from './financial-data';
import type { PgTable } from 'drizzle-orm/pg-core';

// The old script was creating an instance, but the new one exports a singleton instance.
// const financialData = new FinancialData();

// Helper function to calculate annualized return
function calculateAnnualizedReturn(startPrice: number, endPrice: number, years: number): number | null {
  if (startPrice <= 0 || endPrice <= 0 || years <= 0) {
    return null;
  }
  return (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
}

async function calculateAllAnnualizedReturns(symbol: string): Promise<{ return3Year: number | null; return5Year: number | null; return10Year: number | null }> {
  const now = new Date();
  const dateTo = now.toISOString().split('T')[0];
  
  const dateFrom10 = new Date(now);
  dateFrom10.setFullYear(now.getFullYear() - 10);
  const dateFrom10Str = dateFrom10.toISOString().split('T')[0];

  const historicalData = await financialData.fetchHistoricalData(symbol, dateFrom10Str, dateTo);

  if (!historicalData || historicalData.length === 0) {
    console.warn(`[WARN] No historical data found for ${symbol} from ${dateFrom10Str} to ${dateTo}.`);
    return { return3Year: null, return5Year: null, return10Year: null };
  }

  // Ensure chronological order (oldest -> latest)
  historicalData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const findClosestPrice = (targetDate: Date) => {
    let closestDataPoint = null as any;
    let minDiff = Infinity;

    for (const item of historicalData) {
        const itemDate = new Date(item.date);
        const diff = Math.abs(itemDate.getTime() - targetDate.getTime());
        if (diff < minDiff) {
            minDiff = diff;
            closestDataPoint = item;
        }
    }
    return closestDataPoint ? closestDataPoint.close : null;
  };

  const endPrice = historicalData[historicalData.length - 1].close; // latest close

  const date3YearsAgo = new Date(now);
  date3YearsAgo.setFullYear(now.getFullYear() - 3);
  const startPrice3 = findClosestPrice(date3YearsAgo);

  const date5YearsAgo = new Date(now);
  date5YearsAgo.setFullYear(now.getFullYear() - 5);
  const startPrice5 = findClosestPrice(date5YearsAgo);

  const date10YearsAgo = new Date(now);
  date10YearsAgo.setFullYear(now.getFullYear() - 10);
  const startPrice10 = findClosestPrice(date10YearsAgo);

  const return3Year = startPrice3 ? calculateAnnualizedReturn(startPrice3, endPrice, 3) : null;
  const return5Year = startPrice5 ? calculateAnnualizedReturn(startPrice5, endPrice, 5) : null;
  const return10Year = startPrice10 ? calculateAnnualizedReturn(startPrice10, endPrice, 10) : null;

  return { return3Year, return5Year, return10Year };
}


async function enhanceReturnsForTable(table: PgTable, name: string) {
  console.log(`🚀 Starting returns enhancement for ${name}...`);
  // Force recompute for all symbols
  // @ts-ignore
  const companiesToEnhance = await db.select({ symbol: table.symbol }).from(table);
  
  if (companiesToEnhance.length === 0) {
    console.log(`🎉 No companies found in ${name}. Nothing to do.`);
    return;
  }

  console.log(`Found ${companiesToEnhance.length} companies in ${name} to enhance...`);

  let successCount = 0;
  let noDataCount = 0;
  let failedCount = 0;

  for (const [index, company] of companiesToEnhance.entries()) {
    try {
      console.log(`[${index + 1}/${companiesToEnhance.length}] Processing ${company.symbol} in ${name}...`);
      const returns = await calculateAllAnnualizedReturns(company.symbol);
      
      if (returns.return10Year === null && returns.return5Year === null && returns.return3Year === null) {
        console.log(`- No return data could be calculated for ${company.symbol}. Skipping.`);
        noDataCount++;
        continue;
      }

      await db
        // @ts-ignore
        .update(table)
        .set({
          return3Year: returns.return3Year,
          return5Year: returns.return5Year,
          return10Year: returns.return10Year,
        })
        // @ts-ignore
        .where(eq(table.symbol, company.symbol));
      successCount++;
      // Short delay to avoid hitting API rate limits
      await new Promise(resolve => setTimeout(resolve, 250)); 
    } catch (error) {
      console.error(`❌ Failed to enhance returns for ${company.symbol} in ${name}:`, error);
      failedCount++;
    }
  }

  console.log(`
    ---
    📊 ${name} Returns Enhancement Summary:
    ✅ ${successCount} companies enhanced successfully.
    ℹ️ ${noDataCount} companies had no data to calculate returns.
    ❌ ${failedCount} companies failed.
    ---
  `);
}


export async function enhanceAllCompaniesReturns() {
  await enhanceReturnsForTable(dowJonesCompanies, 'Dow Jones');
  await enhanceReturnsForTable(sp500Companies, 'S&P 500');
  await enhanceReturnsForTable(nasdaq100Companies, 'Nasdaq 100');
}

async function main() {
  await enhanceAllCompaniesReturns();
  process.exit(0);
}

main().catch(error => {
  console.error("❌ An error occurred during the main returns enhancement process:", error);
  process.exit(1);
});
