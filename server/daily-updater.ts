import { db } from "./db";
import { companies, nasdaq100Companies, dowJonesCompanies } from "@shared/schema";
import { eq } from "drizzle-orm";
import 'dotenv/config';
import { PgTable } from "drizzle-orm/pg-core";

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";

interface CompanyProfile {
  symbol: string;
  price: number;
  changes: number;
  mktCap: number;
}

class DailyUpdater {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || '4Qgvpm7J5P2DI9fSxuLPbTqIXDMkrFli';
    if (!this.apiKey) {
      throw new Error("FMP_API_KEY is not set in the environment variables.");
    }
  }

  private async makeRequest<T>(endpoint: string, retries = 3, delay = 10000): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${FMP_BASE_URL}${endpoint}?apikey=${this.apiKey}`);
        if (!response.ok) {
          if (response.status === 429 || response.status >= 500) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
          }
          const errorText = await response.text();
          throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return await response.json() as T;
      } catch (error) {
        if (i < retries - 1) {
          console.warn(`[WARN] Rate limit hit or server error. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // Exponential backoff
        } else {
          throw new Error(`Failed to fetch ${endpoint} after ${retries} attempts.`);
        }
      }
    }
    throw new Error("makeRequest failed unexpectedly.");
  }

  async updateDailyMetricsForTable(table: PgTable, name: string) {
    console.log(`🚀 Starting daily update for ${name} companies...`);
    const allCompanies = await db.select({ symbol: table.symbol }).from(table);
    const symbols = allCompanies.map(c => c.symbol);
    const total = symbols.length;
    console.log(`Found ${total} companies in ${name} to update.`);

    let success = 0;
    let failed = 0;
    
    const batchSize = 100; // FMP profile endpoint can take many symbols
    for (let i = 0; i < total; i += batchSize) {
      const batchSymbols = symbols.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(total/batchSize)} for ${name}...`);
      
      try {
        const profilesData = await this.makeRequest<CompanyProfile[]>(`/profile/${batchSymbols.join(',')}`);
        
        if (!Array.isArray(profilesData)) {
            console.warn(`⚠️  Unexpected response for batch starting with ${batchSymbols[0]}. Skipping batch.`);
            failed += batchSymbols.length;
            continue;
        }

        const updatePromises = profilesData.map(async (profile) => {
          if (!profile || !profile.price) {
            console.warn(`⚠️  No profile data for ${profile.symbol}.`);
            return;
          }

          const price = profile.price || 0;
          const changes = profile.changes || 0;
          const previousPrice = price - changes;
          const dailyChangePercent = previousPrice !== 0 ? (changes / previousPrice) * 100 : 0;

          await db.update(table).set({
            price: price.toFixed(2),
            marketCap: Math.round(profile.mktCap || 0).toString(),
            dailyChange: changes.toString(),
            dailyChangePercent: dailyChangePercent.toFixed(4),
          }).where(eq(table.symbol, profile.symbol));
        });

        await Promise.all(updatePromises);
        success += profilesData.length;
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} for ${name} complete.`);

      } catch (error) {
        console.error(`❌ Failed to process batch for ${name} starting with ${batchSymbols[0]}:`, error);
        failed += batchSymbols.length;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between batches
    }

    console.log(`🎉 Daily update for ${name} complete! Success: ${success}, Failed: ${failed}, Total: ${total}`);
  }
}


async function main() {
    const updater = new DailyUpdater();
    await updater.updateDailyMetricsForTable(companies, 'S&P 500');
    await updater.updateDailyMetricsForTable(nasdaq100Companies, 'Nasdaq 100');
    await updater.updateDailyMetricsForTable(dowJonesCompanies, 'Dow Jones');
    console.log("\nAll daily updates complete.");
    process.exit(0);
}

main().catch(error => {
    console.error("Daily update script failed:", error);
    process.exit(1);
});
