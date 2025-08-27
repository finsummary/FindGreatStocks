import { db } from "./db";
import { ftse100Companies } from "@shared/schema";
import { eq } from "drizzle-orm";

if (!process.env.FMP_API_KEY) {
  throw new Error('FMP_API_KEY environment variable is required');
}

const API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function calculateAnnualizedReturn(startPrice: number, endPrice: number, years: number): number {
  if (startPrice <= 0 || endPrice <= 0 || years <= 0) return 0;
  return Math.pow(endPrice / startPrice, 1 / years) - 1;
}

function calculateMaxDrawdown(prices: number[]): number {
  if (!prices || prices.length < 2) return 0;
  
  let maxDrawdown = 0;
  let peak = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > peak) {
      peak = prices[i];
    } else {
      const drawdown = (peak - prices[i]) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  }
  
  return maxDrawdown;
}

async function fetchHistoricalReturns(symbol: string): Promise<{
  return3Year: number;
  return5Year: number;
  return10Year: number;
  maxDrawdown3Year: number;
  maxDrawdown5Year: number;
  maxDrawdown10Year: number;
} | null> {
  try {
    console.log(`📊 Fetching historical data for ${symbol}...`);
    
    // Get historical prices for the last 10 years
    const today = new Date();
    const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
    const fiveYearsAgo = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate());
    const threeYearsAgo = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
    
    const toDate = today.toISOString().split('T')[0];
    const fromDate = tenYearsAgo.toISOString().split('T')[0];
    
    const url = `${BASE_URL}/historical-price-full/${symbol}?from=${fromDate}&to=${toDate}&apikey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data?.historical || data.historical.length < 100) {
      console.log(`⚠️ Insufficient historical data for ${symbol}`);
      return null;
    }
    
    // Sort by date (oldest first)
    const historicalData = data.historical.sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const currentPrice = historicalData[historicalData.length - 1]?.close || 0;
    
    // Find prices closest to target dates
    const threeYearPrice = findPriceNearDate(historicalData, threeYearsAgo);
    const fiveYearPrice = findPriceNearDate(historicalData, fiveYearsAgo);
    const tenYearPrice = findPriceNearDate(historicalData, tenYearsAgo);
    
    // Calculate annualized returns
    const return3Year = threeYearPrice ? calculateAnnualizedReturn(threeYearPrice, currentPrice, 3) : 0;
    const return5Year = fiveYearPrice ? calculateAnnualizedReturn(fiveYearPrice, currentPrice, 5) : 0;
    const return10Year = tenYearPrice ? calculateAnnualizedReturn(tenYearPrice, currentPrice, 10) : 0;
    
    // Calculate max drawdowns for different periods
    const prices3Y = getLastNYearsPrices(historicalData, 3);
    const prices5Y = getLastNYearsPrices(historicalData, 5);
    const prices10Y = historicalData.map((d: any) => d.close);
    
    const maxDrawdown3Year = calculateMaxDrawdown(prices3Y);
    const maxDrawdown5Year = calculateMaxDrawdown(prices5Y);
    const maxDrawdown10Year = calculateMaxDrawdown(prices10Y);
    
    return {
      return3Year,
      return5Year,
      return10Year,
      maxDrawdown3Year,
      maxDrawdown5Year,
      maxDrawdown10Year
    };
    
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return null;
  }
}

function findPriceNearDate(historicalData: any[], targetDate: Date): number | null {
  const targetTime = targetDate.getTime();
  let closest = null;
  let minDiff = Infinity;
  
  for (const item of historicalData) {
    const itemTime = new Date(item.date).getTime();
    const diff = Math.abs(itemTime - targetTime);
    
    if (diff < minDiff) {
      minDiff = diff;
      closest = item.close;
    }
  }
  
  return closest;
}

function getLastNYearsPrices(historicalData: any[], years: number): number[] {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - years);
  
  return historicalData
    .filter((item: any) => new Date(item.date) >= cutoffDate)
    .map((item: any) => item.close);
}

export async function enhanceFTSE100Returns() {
  console.log('🚀 Starting FTSE 100 returns enhancement...');
  const startTime = Date.now();
  
  try {
    // Get all companies to enhance returns data
    const companies = await db
      .select()
      .from(ftse100Companies)
      .orderBy(ftse100Companies.marketCap);
    
    console.log(`📈 Enhancing returns data for ${companies.length} companies...`);
    
    let enhanced = 0;
    let failed = 0;
    
    for (const company of companies) {
      try {
        const returnsData = await fetchHistoricalReturns(company.symbol);
        
        if (returnsData) {
          // Calculate AR/MDD ratio (10-year)
          const arMddRatio = returnsData.maxDrawdown10Year > 0 
            ? returnsData.return10Year / returnsData.maxDrawdown10Year 
            : 0;
          
          await db
            .update(ftse100Companies)
            .set({
              return3Year: returnsData.return3Year.toString(),
              return5Year: returnsData.return5Year.toString(),
              return10Year: returnsData.return10Year.toString(),
              maxDrawdown3Year: returnsData.maxDrawdown3Year.toString(),
              maxDrawdown5Year: returnsData.maxDrawdown5Year.toString(),
              maxDrawdown10Year: returnsData.maxDrawdown10Year.toString(),
              returnDrawdownRatio10Year: arMddRatio.toString(),
              lastUpdated: new Date()
            })
            .where(eq(ftse100Companies.id, company.id));
          
          console.log(`✅ Enhanced ${company.symbol}: 3Y: ${(returnsData.return3Year * 100).toFixed(1)}%, 5Y: ${(returnsData.return5Year * 100).toFixed(1)}%, 10Y: ${(returnsData.return10Year * 100).toFixed(1)}%, Max DD: ${(returnsData.maxDrawdown10Year * 100).toFixed(1)}%`);
          enhanced++;
        } else {
          failed++;
        }
        
        // Rate limiting - be respectful to API
        await delay(400);
        
      } catch (error) {
        console.error(`❌ Failed to enhance ${company.symbol}:`, error);
        failed++;
      }
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`🎉 FTSE 100 returns enhancement completed in ${duration}s`);
    console.log(`📊 Results: ${enhanced} companies enhanced, ${failed} failed`);
    
    return {
      success: true,
      enhanced,
      failed,
      total: companies.length,
      duration: parseFloat(duration)
    };
    
  } catch (error) {
    console.error('❌ FTSE 100 returns enhancement failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      enhanced: 0,
      failed: 0,
      total: 0
    };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  enhanceFTSE100Returns()
    .then(result => {
      console.log('Final result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}