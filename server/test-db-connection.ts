import dotenv from 'dotenv';
dotenv.config();

import { Client } from 'pg';

async function testConnection() {
  console.log('Attempting to connect to the database using standard TCP driver (pg)...');

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env file.');
    return;
  }

  console.log('Found DATABASE_URL. Connecting...');

  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('✅✅✅ Successfully connected to the database! ✅✅✅');
    const result = await client.query('SELECT NOW()');
    console.log('Current time from DB:', result.rows[0]);
    await client.end();
    console.log('Connection closed.');
  } catch (error) {
    console.error('❌❌❌ Failed to connect to the database. ❌❌❌');
    console.error('Please double-check the DATABASE_URL in your .env file. It should be the "Direct connection" string from Supabase.');
    console.error(error);
  }
}

testConnection();
