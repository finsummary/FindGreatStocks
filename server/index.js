// Pure JS bootstrap for Railway
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { setupRoutes, setupStripeWebhook } from './routes.js';
import { DataScheduler } from './scheduler.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Prefer service role key for server-side operations (bypass RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key must be provided');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    'https://find-great-stocks-datr.vercel.app',
    'http://localhost:5173',
  ].filter(Boolean),
  credentials: true,
}));

// Stripe webhook (raw body)
setupStripeWebhook(app);

app.use(express.json());

// API routes
setupRoutes(app, supabase);

const port = process.env.PORT || 5002;
const scheduler = new DataScheduler(port);
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  try {
    scheduler.start();
    console.log('📊 Data scheduler started');
  } catch (e) {
    console.error('Scheduler start error:', e);
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  try { scheduler.stop(); } catch {}
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  try { scheduler.stop(); } catch {}
  process.exit(0);
});
