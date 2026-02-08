// Railway entry point - starts server directly
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { setupRoutes, setupStripeWebhook } from './server/routes.js';
import { DataScheduler } from './server/scheduler.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be provided in .env file");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

// Special handling for Stripe webhook, which needs the raw body
setupStripeWebhook(app);

app.use(express.json());

setupRoutes(app, supabase);

const port = process.env.PORT || 5002;
const dataScheduler = new DataScheduler(port);

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  try {
    dataScheduler.start();
    console.log(`📊 Data scheduler started`);
  } catch (e) {
    console.error('Scheduler start error:', e);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  dataScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  dataScheduler.stop();
  process.exit(0);
});
