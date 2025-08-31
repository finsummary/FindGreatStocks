#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from "./db";
import { sql } from 'drizzle-orm';

async function checkMigrations() {
  console.log("🔍 Checking applied migrations in the database...");

  try {
    // Drizzle Kit uses a table named '__drizzle_migrations' to track history.
    const result = await db.execute(sql`
      SELECT * FROM "__drizzle_migrations";
    `);
    
    console.log("\n--- Applied Migrations ---");
    if (result.length > 0) {
      console.table(result);
    } else {
      console.log("No migrations have been applied yet.");
    }

  } catch (error: any) {
    if (error.message.includes('relation "__drizzle_migrations" does not exist')) {
        console.log("🟠 The '__drizzle_migrations' table does not exist. This means Drizzle has never successfully run a migration.");
    } else {
        console.error("❌ An error occurred while checking migrations:", error);
    }
  }

  process.exit(0);
}

checkMigrations();
