#!/usr/bin/env tsx

import { db } from './db';
import { companies } from '@shared/schema';
import { eq, isNull, or } from 'drizzle-orm';

const FMP_API_KEY = process.env.FMP_API_KEY;

if (!FMP_API_KEY) {
  console.error('❌ FMP_API_KEY environment variable is required');
  process.exit(1);
}

interface HistoricalPrice {
  date: string;
  close: number;
}

async function fetchHistoricalPrices(symbol: string, years: number = 10): Promise<HistoricalPrice[]> {
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - years);
  const toDate = new Date();
  
  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${fromDate.toISOString().split('T')[0]}&to=${toDate.toISOString().split('T')[0]}&apikey=${FMP_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.historical || !Array.isArray(data.historical)) {
      throw new Error('Invalid data format');
    }
    
    return data.historical
      .map((item: any) => ({
        date: item.date,
        close: parseFloat(item.close)
      }))
      .filter((item: HistoricalPrice) => !isNaN(item.close))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error(`Failed to fetch data for ${symbol}:`, error);
    return [];
  }
}

function calculateAnnualizedReturn(startPrice: number, endPrice: number, years: number): number {
  if (startPrice <= 0 || endPrice <= 0 || years <= 0) return 0;
  return (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
}

function calculateMaxDrawdown(prices: HistoricalPrice[]): number {
  if (prices.length < 2) return 0;
  
  let maxDrawdown = 0;
  let peak = prices[0].close;
  
  for (const price of prices) {
    if (price.close > peak) {
      peak = price.close;
    }
    
    const drawdown = ((peak - price.close) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

function getReturnForPeriod(prices: HistoricalPrice[], years: number): number {
  if (prices.length < 2) return 0;
  
  const targetDate = new Date();
  targetDate.setFullYear(targetDate.getFullYear() - years);
  
  // Find the closest price to the target date
  let startPrice = prices[0];
  for (const price of prices) {
    const priceDate = new Date(price.date);
    if (priceDate <= targetDate) {
      startPrice = price;
    } else {
      break;
    }
  }
  
  const endPrice = prices[prices.length - 1];
  return calculateAnnualizedReturn(startPrice.close, endPrice.close, years);
}

async function enhanceCompanyData(symbol: string): Promise<boolean> {
  try {
    console.log(`📊 Processing ${symbol}...`);
    
    // Fetch 10+ years of historical data
    const historicalPrices = await fetchHistoricalPrices(symbol, 12);
    
    if (historicalPrices.length < 100) {
      console.log(`⚠️ Insufficient data for ${symbol} (${historicalPrices.length} data points)`);
      return false;
    }
    
    // Calculate returns for different periods
    const return3Year = getReturnForPeriod(historicalPrices, 3);
    const return5Year = getReturnForPeriod(historicalPrices, 5);
    const return10Year = getReturnForPeriod(historicalPrices, 10);
    
    // Calculate maximum drawdown
    const maxDrawdown = calculateMaxDrawdown(historicalPrices);
    
    // Calculate AR/MDD ratio
    const arMddRatio = return10Year !== 0 && maxDrawdown > 0 ? return10Year / maxDrawdown : null;
    
    // Update database
    await db.update(companies)
      .set({
        return3Year: return3Year.toFixed(2),
        return5Year: return5Year.toFixed(2),
        return10Year: return10Year.toFixed(2),
        maxDrawdown10Year: maxDrawdown.toFixed(2),
        returnDrawdownRatio10Year: arMddRatio ? arMddRatio.toFixed(2) : null
      })
      .where(eq(companies.symbol, symbol));
    
    console.log(`✅ ${symbol}: 3Y=${return3Year.toFixed(1)}%, 5Y=${return5Year.toFixed(1)}%, 10Y=${return10Year.toFixed(1)}%, MDD=${maxDrawdown.toFixed(1)}%, AR/MDD=${arMddRatio?.toFixed(2) || 'N/A'}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${symbol}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting complete data enhancement for all S&P 500 companies...');
  
  // Get all companies that need enhancement
  const companiesToEnhance = await db.select()
    .from(companies)
    .where(
      or(
        isNull(companies.return3Year),
        isNull(companies.return5Year),
        isNull(companies.return10Year),
        isNull(companies.maxDrawdown10Year),
        isNull(companies.returnDrawdownRatio10Year)
      )
    )
    .orderBy(companies.rank);
  
  console.log(`📈 Found ${companiesToEnhance.length} companies needing enhancement`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < companiesToEnhance.length; i++) {
    const company = companiesToEnhance[i];
    console.log(`\n[${i + 1}/${companiesToEnhance.length}] Enhancing ${company.symbol}...`);
    
    const success = await enhanceCompanyData(company.symbol);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Rate limiting - wait 200ms between requests
    if (i < companiesToEnhance.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`\n🎉 Complete data enhancement finished!`);
  console.log(`✅ Successfully enhanced: ${successCount} companies`);
  console.log(`❌ Failed to enhance: ${failureCount} companies`);
  console.log(`📊 Success rate: ${((successCount / (successCount + failureCount)) * 100).toFixed(1)}%`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { enhanceCompanyData };