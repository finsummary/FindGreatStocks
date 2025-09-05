import { Client } from 'pg';
import 'dotenv/config';

const MIGRATION_TABLE = '__drizzle_migrations';
const MIGRATION_FILE_TO_SKIP = '0000_lying_hellion.sql';

async function fixMigrations() {
  console.log('Connecting to the database to fix migration state...');
  const connectionString = `${process.env.POSTGRES_URL}?sslmode=require`;
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();
    console.log('Connection successful.');

    // Check if the entry already exists
    const res = await client.query(`SELECT hash FROM "${MIGRATION_TABLE}" WHERE hash = $1`, [MIGRATION_FILE_TO_SKIP]);
    
    if (res.rows.length > 0) {
      console.log(`Migration "${MIGRATION_FILE_TO_SKIP}" already marked as applied.`);
    } else {
      // Insert the record to skip the first migration
      await client.query(`INSERT INTO "${MIGRATION_TABLE}" (hash, created_at) VALUES ($1, $2)`, [MIGRATION_FILE_TO_SKIP, Date.now()]);
      console.log(`Successfully marked migration "${MIGRATION_FILE_TO_SKIP}" as applied.`);
    }
  } catch (error) {
    // If the table doesn't exist, we can ignore, the migrator will create it
    // @ts-ignore
    if (error.code === '42P01') { 
        console.log(`Migration table "${MIGRATION_TABLE}" does not exist, assuming fresh start.`);
    } else {
      console.error('Failed to fix migration state:', error);
      process.exit(1);
    }
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
  process.exit(0);
}

fixMigrations();
