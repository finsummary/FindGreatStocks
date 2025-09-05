import express from "express";
import { setupRoutes } from "./routes";
import { dataScheduler } from "./scheduler";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import http from 'http';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in .env file.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(morgan('tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable CORS for all localhost origins
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

setupRoutes(app, supabase);

// Data scheduler starts automatically on import
console.log("DataScheduler initialized and running...");

const port = parseInt(process.env.PORT || '5001', 10);

server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server listening on port ${port}`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    dataScheduler.stop();
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
