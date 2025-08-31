import { defineConfig } from "drizzle-kit";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

if (!process.env.DRIZZLE_DATABASE_URL) {
  // This is now just a dummy check, we'll use the main URL.
  // In a real project, you'd want these to be properly managed.
  process.env.DRIZZLE_DATABASE_URL = process.env.DATABASE_URL;
}


export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DRIZZLE_DATABASE_URL,
  },
});
