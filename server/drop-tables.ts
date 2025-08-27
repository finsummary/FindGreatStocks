import dotenv from 'dotenv';
dotenv.config();

import { db } from './db';
import { sql } from 'drizzle-orm';
import * as schema from '@shared/schema';

async function dropAllTables() {
  const tableNames = Object.keys(schema);
  if (tableNames.length === 0) {
    console.log("No tables found in schema.");
    return;
  }

  console.log("Preparing to drop the following tables:", tableNames.join(", "));

  try {
    // Disable foreign key checks if necessary (specific to some DBs)
    // For PostgreSQL, CASCADE should handle dependencies.
    for (const tableName of tableNames) {
      console.log(`Dropping table: ${tableName}...`);
      // We need to use snake_case for table names in raw SQL
      const snakeCaseTableName = tableName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
      await db.execute(sql.raw(`DROP TABLE IF EXISTS "${snakeCaseTableName}" CASCADE;`));
      console.log(`✅ Dropped table: ${tableName}`);
    }
    console.log("\n🎉 All tables dropped successfully.");
  } catch (error) {
    console.error("❌ Error dropping tables:", error);
  } finally {
    const { client } = await import('./db');
    await client.end();
    console.log("Database connection closed.");
  }
}

dropAllTables();
