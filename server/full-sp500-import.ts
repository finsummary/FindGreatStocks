import dotenv from "dotenv";
dotenv.config();

import { sp500Scanner } from './sp500-scanner';
import { storage } from './storage';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { db } from './db';
import { client } from './db';

if (!process.env.FMP_API_KEY) {
  throw new Error("FMP_API_KEY is not defined in your .env file. The import script cannot continue without it.");
}

// Helper function to process symbols in chunks with delays
async function processInChunks<T, R>(items: T[], chunkProcessor: (chunk: T[]) => Promise<R[]>, chunkSize: number, delay: number): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    console.log(`Processing chunk ${i / chunkSize + 1} of ${Math.ceil(items.length / chunkSize)}... (${chunk.join(', ')})`);
    const chunkResults = await chunkProcessor(chunk);
    results.push(...chunkResults);
    if (i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return results;
}

export async function importAllSP500() {
  console.log("🚀 Starting FULL S&P 500 import...");
  
  // Clear existing data
  await storage.clearAllCompanies();
  console.log("✅ Cleared existing company data");
  
  try {
    console.log("Fetching S&P 500 constituents...");
    const constituents = await sp500Scanner.getSP500Constituents();
    console.log(`📊 Found ${constituents.length} S&P 500 companies to import`);

    let successCount = 0;
    let failedCount = 0;
    const top10MarketCap: { name: string; symbol: string; marketCap: number }[] = [];

    const processChunk = async (chunk: { symbol: string; name: string }[]) => {
      const scanPromises = chunk.map(async (company) => {
        try {
          // Pass the company name from the constituents list as a fallback
          const result = await sp500Scanner.quickScan(company.symbol, company.name);
          if (result) {
            // The storage.createCompany call is now inside quickScan, 
            // so we just need to handle success/failure counting.
            successCount++;

            // Keep track of top 10 by market cap
            if (top10MarketCap.length < 10 || (result.marketCap && parseFloat(result.marketCap) > top10MarketCap[9].marketCap)) {
              top10MarketCap.push({ name: result.name, symbol: result.symbol, marketCap: parseFloat(result.marketCap) });
              top10MarketCap.sort((a, b) => b.marketCap - a.marketCap);
              if (top10MarketCap.length > 10) {
                top10MarketCap.pop();
              }
            }
          } else {
            // quickScan returned null, indicating a failure to fetch or process.
            failedCount++;
          }
          return { success: !!result };
        } catch (error: any) {
          console.error(`❌ Failed ${company.symbol}:`, error.message || error);
          failedCount++;
          return { success: false };
        }
      });
      return Promise.all(scanPromises);
    };
    
    // Process in chunks of 5 with a 1-second delay between chunks
    await processInChunks(constituents, processChunk, 5, 1000);

    console.log("\n🎉 FULL S&P 500 import complete:");
    console.log(`✅ Success: ${successCount} companies`);
    console.log(`❌ Failed: ${failedCount} companies`);
    console.log(`📊 Total processed: ${constituents.length} companies`);
    const successRate = (successCount / constituents.length) * 100;
    console.log(`📈 Success rate: ${successRate.toFixed(1)}%`);
    
    if (top10MarketCap.length > 0) {
        console.log("\n🏆 Top 10 companies by market cap:");
        top10MarketCap.forEach((company, index) => {
            console.log(`${index + 1}. ${company.name} (${company.symbol}): $${(company.marketCap / 1e9).toFixed(1)}B`);
        });
    }

  } catch (error) {
    console.error("❌ Full import failed:", error);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMainModule) {
  importAllSP500();
}