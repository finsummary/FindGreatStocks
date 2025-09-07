import { db } from './db';
import { sql } from 'drizzle-orm';

async function fixMigrations() {
  console.log('Attempting to manually fix migrations...');
  try {
    // Manually insert the migration records into Drizzle's internal table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        "id" serial PRIMARY KEY NOT NULL,
        "hash" text NOT NULL,
        "created_at" bigint
      );
    `);
    
    console.log('Ensured __drizzle_migrations table exists.');

    // Add entries for the migrations that have already been applied
    // These hashes can be found in the migrations/meta/_journal.json file
    const migrationsToInsert = [
      '0000_lying_hellion',
      '0001_mixed_bloodscream'
    ];

    for (const migration of migrationsToInsert) {
        // A simple hash function for the migration name
        const hash = migration.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString();
        const createdAt = Date.now();
        
        // Check if the migration already exists to avoid errors on re-run
        const existing = await db.execute(sql`SELECT "hash" FROM "__drizzle_migrations" WHERE "hash" = ${migration + ':' + hash}`);

        if (existing.rows.length === 0) {
            await db.execute(sql`
            INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES (${migration + ':' + hash}, ${createdAt});
            `);
            console.log(`Manually inserted migration record for: ${migration}`);
        } else {
            console.log(`Migration record for ${migration} already exists. Skipping.`);
        }
    }

    console.log('Successfully fixed migration records.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to fix migrations:', error);
    process.exit(1);
  }
}

fixMigrations();
