#!/usr/bin/env tsx
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

async function runMigration() {
  console.log('🚀 Starting shares_outstanding migration...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read SQL migration file
  const migrationPath = join(__dirname, '..', 'migrations', 'add-shares-outstanding.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute`);

  try {
    // Execute each statement using Supabase RPC (if available) or direct query
    // Note: Supabase REST API doesn't support arbitrary SQL execution
    // We'll need to use the PostgreSQL connection string if available
    
    // Try using DATABASE_URL for direct PostgreSQL connection
    const databaseUrl = process.env.DATABASE_URL;
    
    if (databaseUrl) {
      console.log('📡 Using direct PostgreSQL connection...');
      const { Client } = await import('pg');
      const client = new Client({ connectionString: databaseUrl });
      
      await client.connect();
      console.log('✅ Connected to PostgreSQL');

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            console.log(`\n📌 Executing statement ${i + 1}/${statements.length}...`);
            await client.query(statement);
            console.log(`✅ Statement ${i + 1} executed successfully`);
          } catch (error: any) {
            // Ignore "already exists" errors for IF NOT EXISTS statements
            if (error.message.includes('already exists') || error.message.includes('duplicate')) {
              console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
            } else {
              console.error(`❌ Error executing statement ${i + 1}:`, error.message);
              throw error;
            }
          }
        }
      }

      await client.end();
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.error('❌ DATABASE_URL not found. Cannot execute SQL directly.');
      console.error('\n📋 Please execute the migration manually:');
      console.error('   1. Open Supabase Dashboard: https://supabase.com/dashboard');
      console.error('   2. Go to SQL Editor');
      console.error('   3. Copy and paste the SQL from: migrations/add-shares-outstanding.sql');
      console.error('   4. Click "Run"');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📋 Please execute the migration manually:');
    console.error('   1. Open Supabase Dashboard: https://supabase.com/dashboard');
    console.error('   2. Go to SQL Editor');
    console.error('   3. Copy and paste the SQL from: migrations/add-shares-outstanding.sql');
    console.error('   4. Click "Run"');
    process.exit(1);
  }
}

runMigration();
