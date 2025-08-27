import dotenv from 'dotenv';
dotenv.config();

import { db } from './db';
import { sql } from 'drizzle-orm';

async function verifyData() {
  console.log("🔍 Verifying data directly from the database...");
  try {
    const query = sql`
      SELECT 
        symbol, 
        "return_3_year", 
        "return_5_year", 
        "return_10_year", 
        "max_drawdown_10_year",
        "ar_mdd_ratio"
      FROM companies 
      LIMIT 5
    `;
    const result = await db.execute(query);

    if (result.rows.length === 0) {
      console.log("❌ No companies found in the database.");
    } else {
      console.log("✅ Found data for the first 5 companies:");
      console.table(result.rows);
    }
  } catch (error) {
    console.error("❌ An error occurred while verifying data:", error);
  } finally {
    const { client } = await import('./db');
    await client.end();
    console.log("Database connection closed.");
  }
}

verifyData();
