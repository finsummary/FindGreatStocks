import dotenv from "dotenv";
dotenv.config();

import { db } from "./db";
import { companies, nasdaq100Companies } from "@shared/schema";
import { sql, isNotNull, and, eq, or, isNull } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

async function enhanceMetricsForTable(table: PgTable, name: string) {
  console.log(`🚀 Starting calculated metrics enhancement for ${name}...`);

  try {
    const companiesToEnhance = await db
      .select({
        symbol: table.symbol,
        marketCap: table.marketCap,
        revenue: table.revenue,
        netIncome: table.netIncome,
      })
      .from(table)
      .where(
        and(
          isNotNull(table.marketCap),
          isNotNull(table.revenue),
          isNotNull(table.netIncome)
        )
      );

    console.log(`📊 Found ${companiesToEnhance.length} companies in ${name} to enhance by recalculating metrics.`);

    if (companiesToEnhance.length === 0) {
      console.log(`✅ No companies in ${name} have the required source data (Market Cap, Revenue, Net Income) for calculation.`);
      return;
    }

    let successCount = 0;
    let failedCount = 0;

    for (const company of companiesToEnhance) {
      try {
        const marketCap = parseFloat(company.marketCap);
        const revenue = parseFloat(company.revenue);
        const netIncome = parseFloat(company.netIncome);

        if (isNaN(marketCap) || isNaN(revenue) || isNaN(netIncome) || revenue === 0) {
          console.warn(`⚠️ Skipping ${company.symbol} due to invalid or zero revenue data.`);
          failedCount++;
          continue;
        }

        const priceToSalesRatio = marketCap / revenue;
        const netProfitMargin = (netIncome / revenue) * 100; // as a percentage

        await db
          .update(table)
          .set({
            priceToSalesRatio: priceToSalesRatio.toFixed(2),
            netProfitMargin: netProfitMargin.toFixed(2),
          })
          .where(eq(table.symbol, company.symbol));
        
        console.log(`✅ Calculated metrics for ${company.symbol}: P/S=${priceToSalesRatio.toFixed(2)}, NPM=${netProfitMargin.toFixed(2)}%`);
        successCount++;

      } catch (error) {
        console.error(`❌ Failed to process ${company.symbol}:`, error);
        failedCount++;
      }
    }
    
    console.log(`\n🎉 ${name} metrics enhancement complete:`);
    console.log(`✅ Success: ${successCount} companies`);
    console.log(`❌ Failed: ${failedCount} companies`);

  } catch (error) {
    console.error(`❌ Error during ${name} metric enhancement process:`, error);
  }
}

async function main() {
    await enhanceMetricsForTable(companies, "S&P 500");
    await enhanceMetricsForTable(nasdaq100Companies, "Nasdaq 100");
    console.log("\nAll metric enhancements complete.");
    process.exit(0);
}

main().catch(err => {
  console.error("Unhandled error in main execution:", err);
  process.exit(1);
});
