import dotenv from "dotenv";
dotenv.config();

import { db } from "./db";
import { companies } from "@shared/schema";
import { sql, isNotNull, count } from "drizzle-orm";

async function verifyMetrics() {
  console.log("🔍 Running verification for calculated metrics in S&P 500 table...");

  try {
    const totalCompaniesResult = await db.select({ value: count() }).from(companies);
    const totalCompanies = totalCompaniesResult[0].value;

    if (totalCompanies === 0) {
      console.log("❌ The 'companies' table is empty. Please run the import script first.");
      return;
    }
    
    console.log(`\n--- DATA COMPLETENESS REPORT ---`);
    console.log(`Total companies in DB: ${totalCompanies}`);

    const withMarketCapResult = await db.select({ value: count() }).from(companies).where(isNotNull(companies.marketCap));
    const withRevenueResult = await db.select({ value: count() }).from(companies).where(isNotNull(companies.revenue));
    const withNetIncomeResult = await db.select({ value: count() }).from(companies).where(isNotNull(companies.netIncome));
    
    console.log(`\nSource Data for Calculation:`);
    console.log(`- Companies with Market Cap: ${withMarketCapResult[0].value} / ${totalCompanies}`);
    console.log(`- Companies with Revenue:      ${withRevenueResult[0].value} / ${totalCompanies}`);
    console.log(`- Companies with Net Income:   ${withNetIncomeResult[0].value} / ${totalCompanies}`);

    const withAllSourceDataResult = await db.select({ value: count() }).from(companies).where(
        sql`${companies.marketCap} IS NOT NULL AND ${companies.revenue} IS NOT NULL AND ${companies.netIncome} IS NOT NULL`
    );
    console.log(`- Companies with ALL required source data: ${withAllSourceDataResult[0].value} / ${totalCompanies}`);


    const withPsRatioResult = await db.select({ value: count() }).from(companies).where(isNotNull(companies.priceToSalesRatio));
    const withNpmResult = await db.select({ value: count() }).from(companies).where(isNotNull(companies.netProfitMargin));

    console.log(`\nCalculated Data Status:`);
    console.log(`- Companies with P/S Ratio:      ${withPsRatioResult[0].value} / ${totalCompanies}`);
    console.log(`- Companies with Net Profit Margin: ${withNpmResult[0].value} / ${totalCompanies}`);
    
    console.log(`\n--- END OF REPORT ---`);

  } catch (error) {
    console.error("❌ An error occurred during verification:", error);
  } finally {
    process.exit(0);
  }
}

verifyMetrics();
