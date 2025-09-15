import { db } from './db';
import { dowJonesCompanies, sp500Companies, nasdaq100Companies } from '@shared/schema';
import { sql, eq, isNull, or } from 'drizzle-orm';
import { financialDataService } from './financial-data';
import type { PgTable } from 'drizzle-orm/pg-core';

async function populateFinancialsForTable(table: PgTable, name: string) {
  console.log(`🚀 Starting financial population for ${name}...`);
  // @ts-ignore
  const companiesToUpdate = await db.select({ symbol: table.symbol }).from(table).where(
    // @ts-ignore
    or(isNull(table.freeCashFlow), isNull(table.latestFcf), isNull(table.revenue), isNull(table.netIncome), isNull(table.revenueGrowth10Y))
  );
  
  if (companiesToUpdate.length === 0) {
    console.log(`🎉 All companies in ${name} already have financial data. Nothing to do.`);
    return;
  }

  console.log(`Found ${companiesToUpdate.length} companies in ${name} to populate...`);

  let successCount = 0;
  let failedCount = 0;

  for (const [index, company] of companiesToUpdate.entries()) {
    try {
      console.log(`[${index + 1}/${companiesToUpdate.length}] Processing ${company.symbol}...`);
      
      // @ts-ignore
      const cashFlowData = await financialDataService.fetchCashFlowStatement(company.symbol, 1);
      // @ts-ignore
      const incomeStatementData = await financialDataService.fetchIncomeStatement(company.symbol, 10);

      if (!cashFlowData || cashFlowData.length === 0 || !incomeStatementData || incomeStatementData.length === 0) {
        console.log(`- No financial statements found for ${company.symbol}. Skipping.`);
        failedCount++;
        continue;
      }
      
      const latestFcf = cashFlowData[0].freeCashFlow;
      const revenue = incomeStatementData[0].revenue;
      const netIncome = incomeStatementData[0].netIncome;

      // Simplified CAGR calculation
      const firstYearRevenue = incomeStatementData[incomeStatementData.length - 1]?.revenue;
      const lastYearRevenue = incomeStatementData[0]?.revenue;
      const years = incomeStatementData.length;

      let revenueGrowth10Y: number | null = null;
      if (firstYearRevenue && lastYearRevenue && years > 1) {
        revenueGrowth10Y = (Math.pow(lastYearRevenue / firstYearRevenue, 1 / (years - 1)) - 1) * 100;
      }

      await db
        // @ts-ignore
        .update(table)
        .set({
          latestFcf: latestFcf != null ? String(latestFcf) : null,
          freeCashFlow: latestFcf != null ? String(latestFcf) : null,
          revenue: revenue != null ? String(revenue) : null,
          netIncome: netIncome != null ? String(netIncome) : null,
          revenueGrowth10Y: revenueGrowth10Y != null ? revenueGrowth10Y.toFixed(2) : null,
        })
        // @ts-ignore
        .where(eq(table.symbol, company.symbol));
        
      successCount++;
      console.log(`✅ Populated financials for ${company.symbol}`);

      // Delay to avoid API rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (error) {
      console.error(`❌ Failed to populate financials for ${company.symbol}:`, error);
      failedCount++;
    }
  }

  console.log(`\n---\n📊 ${name} Financial Population Summary:\n✅ ${successCount} companies populated successfully.\n❌ ${failedCount} companies failed.\n---\n`);
}

async function main() {
  await populateFinancialsForTable(sp500Companies, 'S&P 500');
  await populateFinancialsForTable(nasdaq100Companies, 'Nasdaq 100');
  await populateFinancialsForTable(dowJonesCompanies, 'Dow Jones');
  process.exit(0);
}

main().catch(error => {
  console.error("❌ An error occurred during the financial population process:", error);
  process.exit(1);
});
