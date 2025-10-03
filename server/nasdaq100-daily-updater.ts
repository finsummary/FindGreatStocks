/**
 * Nasdaq 100 Daily Price and Market Cap Updater
 * Automatically updates stock prices and market caps for all Nasdaq 100 companies
 * after market close using Financial Modeling Prep API
 */

import { db, supabase } from "./db";
import { nasdaq100Companies } from "@shared/schema";
import { eq } from "drizzle-orm";
import { batcher } from "./utils/batcher";
import { FinancialDataService } from "./financial-data.ts";
import { updateDcfMetricsForCompany } from "./dcf-daily-updater"; // Import the new function

const BATCH_SIZE = 100;

if (!process.env.FMP_API_KEY) {
  throw new Error('FMP_API_KEY environment variable is required');
}

const API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  pe: number;
  eps: number;
  timestamp: number;
}

async function fetchQuoteData(symbol: string): Promise<QuoteData | null> {
  try {
    const response = await fetch(`${BASE_URL}/quote/${symbol}?apikey=${API_KEY}`);
    
    if (!response.ok) {
      console.log(`Quote API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data?.[0] || null;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

async function updateCompanyPrice(symbol: string) {
  console.log(`Updating price data for ${symbol}...`);
  
  try {
    const quoteData = await fetchQuoteData(symbol);
    
    if (!quoteData) {
      console.log(`⚠️ No quote data available for ${symbol}`);
      return;
    }

    // Prepare update data
    const updateData: any = {
      lastUpdated: new Date()
    };
    
    if (quoteData.price) updateData.price = quoteData.price.toString();
    if (quoteData.change) updateData.dailyChange = quoteData.change.toString();
    if (quoteData.changesPercentage) updateData.dailyChangePercent = quoteData.changesPercentage.toString();
    if (quoteData.marketCap) updateData.marketCap = quoteData.marketCap.toString();
    // Do not overwrite EPS daily

    // Some FMP responses include yield as 'yield' or 'dividendYield'
    const anyYield: any = (quoteData as any);
    if (anyYield?.yield !== undefined) updateData.dividendYield = String(anyYield.yield);
    if (anyYield?.dividendYield !== undefined) updateData.dividendYield = String(anyYield.dividendYield);

    // Fallback to ratios-ttm dividend yield (TTM)
    if (false && !updateData.dividendYield) {
      try {
        const ttm = await fetch(`${BASE_URL}/ratios-ttm/${symbol}?apikey=${API_KEY}`).then(r => r.ok ? r.json() : null);
        const raw = Array.isArray(ttm) && ttm.length ? (ttm as any[])[0] : null;
        const dy = raw && (raw.dividendYieldTTM ?? raw.dividendYielTTM);
        if (dy !== null && dy !== undefined) {
          updateData.dividendYield = String(Number(dy) * 100);
        }
      } catch {}
    }

    // Update database
    await db
      .update(nasdaq100Companies)
      .set(updateData)
      .where(eq(nasdaq100Companies.symbol, symbol));
    
    console.log(`✅ Updated ${symbol}: $${quoteData.price} (${quoteData.changesPercentage > 0 ? '+' : ''}${quoteData.changesPercentage.toFixed(2)}%)`);

    // DCF metrics update temporarily disabled
    // if (quoteData.marketCap) {
    //   try {
    //     const { updateDcfMetricsForCompany } = await import('./dcf-daily-updater');
    //     await updateDcfMetricsForCompany(nasdaq100Companies as any, symbol, quoteData.marketCap);
    //   } catch (e) {
    //     console.warn(`[${symbol}] DCF update skipped:`, e);
    //   }
    // }

  } catch (error) {
    console.error(`❌ Error updating ${symbol}:`, error);
  }
}

export async function updateNasdaq100Prices() {
  console.log('🚀 Starting Nasdaq 100 daily price update...');
  const startTime = Date.now();
  
  try {
    // Get all Nasdaq 100 companies
    const { data: companies, error } = await supabase
      .from('nasdaq100_companies')
      .select('symbol');
    
    if (error) {
      console.error('Error fetching Nasdaq 100 companies:', error);
      return { success: false, error: error.message, updated: 0, failed: 0 };
    }
    
    console.log(`Found ${(companies || []).length} Nasdaq 100 companies to update`);
    
    let updated = 0;
    let failed = 0;
    
    for (const company of (companies || [])) {
      try {
        await updateCompanyPrice(company.symbol);
        updated++;
      } catch (error) {
        console.error(`Failed to update ${company.symbol}:`, error);
        failed++;
      }
      
      // Rate limiting - wait 100ms between requests
      if (updated + failed < (companies || []).length) {
        await delay(100);
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Nasdaq 100 price update completed in ${duration}s`);
    console.log(`📊 Results: ${updated} updated, ${failed} failed`);
    
    return {
      success: true,
      updated,
      failed,
      duration: parseFloat(duration)
    };
    
  } catch (error) {
    console.error('❌ Nasdaq 100 price update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      updated: 0,
      failed: 0
    };
  }
}

// Manual execution for testing
import.meta.url === `file://${process.argv[1]}` && 
  updateNasdaq100Prices().then(result => {
    console.log('\n🎉 Update completed:', result);
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });