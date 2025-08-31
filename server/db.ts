import * as dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from '@shared/schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in the .env file');
}

export const client = new Client({
  connectionString,
});

// Top-level await is available in modern ES modules
await client.connect();

export const db = drizzle(client, { schema });