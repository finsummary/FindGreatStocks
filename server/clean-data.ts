import dotenv from 'dotenv';
dotenv.config();

import { db } from './db';
import { sql } from 'drizzle-orm';
import { companies } from '@shared/schema';

// List of columns that are numeric but stored as text/decimal and might contain empty strings
const numericColumns = [
  'marketCap', 'price', 'dailyChange', 'dailyChangePercent', 'rank', 'employees',
  'peRatio', 'eps', 'beta', 'dividendYield', 'volume', 'avgVolume', 'dayLow', 'dayHigh',
  'yearLow', 'yearHigh', 'revenue', 'grossProfit', 'operatingIncome', 'netIncome',
  'totalAssets', 'totalDebt', 'cashAndEquivalents', 'return3Year', 'return5Year',
  'return10Year', 'maxDrawdown10Year', 'returnDrawdownRatio10Year', 'arMddRatio'
];

async function cleanNumericColumns() {
  console.log("🚀 Starting data cleaning process...");
  let cleanedCount = 0;

  try {
    for (const colName of numericColumns) {
      // Drizzle doesn't directly support dynamic column names in updates with sql fragments.
      // We have to resort to raw SQL for this dynamic operation.
      // Column names are sanitized from our own list, so this is safe.
      const snakeCaseCol = companies[colName as keyof typeof companies].name;
      
      console.log(`🧹 Cleaning column: ${snakeCaseCol}...`);

      // This query is more robust. It sets a column to NULL if it's either:
      // 1. An empty or whitespace-only string (e.g., '', ' ').
      // 2. A string that does NOT match the pattern of a valid number (integer or decimal).
      const query = sql.raw(`
        UPDATE "companies" 
        SET "${snakeCaseCol}" = NULL 
        WHERE 
          "${snakeCaseCol}"::text ~ '^\\s*$' 
          OR 
          "${snakeCaseCol}"::text NOT SIMILAR TO '[-+]?[0-9]*\\.?[0-9]+'
      `);

      const result = await db.execute(query);
      
      if (result.rowCount > 0) {
        console.log(`✅ Found and cleaned ${result.rowCount} empty strings in "${snakeCaseCol}".`);
        cleanedCount += result.rowCount;
      }
    }
    
    console.log("\n🎉 Data cleaning process complete.");
    if (cleanedCount > 0) {
      console.log(`Total empty strings replaced with NULL: ${cleanedCount}`);
    } else {
      console.log("No empty strings found to clean.");
    }

  } catch (error) {
    console.error("❌ An error occurred during the data cleaning process:", error);
  } finally {
    const { client } = await import('./db');
    await client.end();
    console.log("Database connection closed.");
  }
}

cleanNumericColumns();
