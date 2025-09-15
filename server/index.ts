import express, { Express } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { setupRoutes, setupStripeWebhook } from './routes';
import { DataScheduler } from './scheduler.ts';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be provided in .env file");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const app: Express = express();
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

// Special handling for Stripe webhook, which needs the raw body
setupStripeWebhook(app);

app.use(express.json());

setupRoutes(app, supabase);

const port = 5002;

const dataScheduler = new DataScheduler();
dataScheduler.start();

console.log("DataScheduler initialized and running...");


app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
