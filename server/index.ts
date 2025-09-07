import express, { Express } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js'
import { setupRoutes, setupStripeWebhook } from './routes';
import { dataScheduler } from './scheduler.ts';

const app: Express = express();
app.use(cors());

// Special handling for Stripe webhook, which needs the raw body
setupStripeWebhook(app);

app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

setupRoutes(app, supabase);

const port = process.env.PORT || 5001;

console.log("DataScheduler initialized and running...");


app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
