/**
 * Nasdaq 100 Daily Price and Market Cap Updater
 * Automatically updates stock prices and market caps for all Nasdaq 100 companies
 * after market close using Financial Modeling Prep API
 */

import { db } from "./db";
import { nasdaq100Companies } from "@shared/schema";
import { eq } from "drizzle-orm";

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
    if (quoteData.pe && quoteData.pe > 0) updateData.peRatio = quoteData.pe.toString();
    if (quoteData.eps) updateData.eps = quoteData.eps.toString();

    // Update database
    await db
      .update(nasdaq100Companies)
      .set(updateData)
      .where(eq(nasdaq100Companies.symbol, symbol));
    
    console.log(`✅ Updated ${symbol}: $${quoteData.price} (${quoteData.changesPercentage > 0 ? '+' : ''}${quoteData.changesPercentage.toFixed(2)}%)`);

  } catch (error) {
    console.error(`❌ Error updating ${symbol}:`, error);
  }
}

export async function updateNasdaq100Prices() {
  console.log('🚀 Starting Nasdaq 100 daily price update...');
  const startTime = Date.now();
  
  try {
    // Get all Nasdaq 100 companies
    const companies = await db.select().from(nasdaq100Companies);
    console.log(`Found ${companies.length} Nasdaq 100 companies to update`);
    
    let updated = 0;
    let failed = 0;
    
    for (const company of companies) {
      try {
        await updateCompanyPrice(company.symbol);
        updated++;
      } catch (error) {
        console.error(`Failed to update ${company.symbol}:`, error);
        failed++;
      }
      
      // Rate limiting - wait 100ms between requests
      if (updated + failed < companies.length) {
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