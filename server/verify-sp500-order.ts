#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from "./db";
import { companies } from "@shared/schema";
import { asc } from 'drizzle-orm';

async function verifyOrder() {
  console.log("🔍 Verifying the order of the first 10 companies in the database...");

  const firstPage = await db
    .select({
      rank: companies.rank,
      name: companies.name,
      symbol: companies.symbol,
    })
    .from(companies)
    .orderBy(asc(companies.rank))
    .limit(10)
    .offset(0);

  console.log("\n--- Page 1 (First 10 companies) ---");
  console.table(firstPage);

  console.log("\n🔍 Verifying the order of companies on page 6 (rows 51-60)...");

  const sixthPage = await db
    .select({
      rank: companies.rank,
      name: companies.name,
      symbol: companies.symbol,
    })
    .from(companies)
    .orderBy(asc(companies.rank))
    .limit(10)
    .offset(50);
    
  console.log("\n--- Page 6 (Companies 51-60) ---");
  console.table(sixthPage);

  if (firstPage[0]?.symbol === sixthPage[0]?.symbol) {
    console.error("\n❌ ERROR: The same companies are being returned for different pages. This points to an issue in the query logic.");
  } else {
    console.log("\n✅ SUCCESS: Database query returns different companies for different pages as expected.");
  }
}

verifyOrder().catch(error => {
    console.error("Verification script failed:", error);
    process.exit(1);
});
