import express, { Express } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { setupRoutes, setupStripeWebhook } from './routes';
import { DataScheduler } from './scheduler.ts';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Environment check:');
console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
console.log('FMP_API_KEY:', process.env.FMP_API_KEY ? '✅ Set' : '❌ Missing');
console.log('PORT:', process.env.PORT || 'Not set, using default 5002');

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be provided in .env file");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const app: Express = express();
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    'https://find-great-stocks-datr.vercel.app',
    'http://localhost:5173'
  ].filter(Boolean),
  credentials: true,
}));

// Special handling for Stripe webhook, which needs the raw body
setupStripeWebhook(app);

app.use(express.json());

setupRoutes(app, supabase);

const port = process.env.PORT || 5002;

const dataScheduler = new DataScheduler();
dataScheduler.start();

console.log("DataScheduler initialized and running...");


app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
