import dotenv from "dotenv";
dotenv.config();

import { sp500Scanner } from './sp500-scanner';
import { storage } from './storage';
import { db } from './db';
import { companies } from '@shared/schema';

async function findAndImportMissingCompanies() {
  console.log("🚀 Starting process to find and import missing S&P 500 companies...");

  try {
    // 1. Get the current list of S&P 500 constituents from the API
    console.log("Fetching current S&P 500 constituents from FMP API...");
    const constituents = await sp500Scanner.getSP500Constituents();
    const constituentSymbols = new Set(constituents.map(c => c.symbol));
    console.log(`📊 Found ${constituentSymbols.size} symbols in the S&P 500 list.`);

    // 2. Get all company symbols currently in the database
    console.log("Fetching existing company symbols from the database...");
    const existingCompanies = await db.select({ symbol: companies.symbol }).from(companies);
    const existingSymbols = new Set(existingCompanies.map(c => c.symbol));
    console.log(`✅ Found ${existingSymbols.size} companies in the database.`);

    // 3. Compare the lists to find missing symbols
    const missingSymbols = new Set([...constituentSymbols].filter(symbol => !existingSymbols.has(symbol)));
    
    if (missingSymbols.size === 0) {
      console.log("🎉 No missing companies found. Your database is up to date!");
      return;
    }

    console.log(`🔍 Found ${missingSymbols.size} missing companies: ${Array.from(missingSymbols).join(', ')}`);
    console.log("--- Starting import for missing companies ---");

    let successCount = 0;
    let failedCount = 0;

    for (const symbol of missingSymbols) {
      try {
        const companyName = constituents.find(c => c.symbol === symbol)?.name;
        const result = await sp500Scanner.quickScan(symbol, companyName || '');
        if (result) {
          console.log(`✅ Successfully imported ${symbol} - ${result.name}`);
          successCount++;
        } else {
          console.error(`❌ Failed to import data for ${symbol}. quickScan returned null.`);
          failedCount++;
        }
      } catch (error: any) {
        console.error(`❌❌ An error occurred while importing ${symbol}:`, error.message);
        failedCount++;
      }
    }

    console.log("\n--- Import of missing companies complete ---");
    console.log(`👍 Successfully imported: ${successCount}`);
    console.log(`👎 Failed to import: ${failedCount}`);

  } catch (error) {
    console.error("❌ An unexpected error occurred during the process:", error);
    process.exit(1);
  }
}

findAndImportMissingCompanies().then(() => {
    console.log("\nScript finished.");
    process.exit(0);
}).catch(error => {
    console.error("Script failed:", error);
    process.exit(1);
});



