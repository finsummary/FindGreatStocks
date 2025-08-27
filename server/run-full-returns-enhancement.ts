#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config();

import { storage } from './storage';

interface HistoricalPrice {
  date: string;
  close: number;
  adjClose: number;
}

async function enhanceAllCompaniesReturns() {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    throw new Error('FMP_API_KEY environment variable is required');
  }

  console.log("🚀 Starting complete returns enhancement for ALL 503 S&P 500 companies...");
  
  // Get all companies
  const companies = await storage.getCompanies(1000);
  console.log(`📊 Processing ${companies.length} companies`);
  
  let updated = 0;
  let errors = 0;
  
  // Process companies in small batches
  const batchSize = 1; // One at a time to respect API limits
  
  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    
    try {
      console.log(`[${i + 1}/${companies.length}] Processing ${company.symbol}...`);
      
      // Calculate date ranges
      const today = new Date();
      const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
      const threeYearsAgo = new Date(today.getTime() - 3 * 365.25 * 24 * 60 * 60 * 1000);
      const fiveYearsAgo = new Date(today.getTime() - 5 * 365.25 * 24 * 60 * 60 * 1000);
      const tenYearsAgo = new Date(today.getTime() - 10 * 365.25 * 24 * 60 * 60 * 1000);
      
      // Fetch historical data
      const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${company.symbol}?from=${tenYearsAgo.toISOString().split('T')[0]}&to=${threeDaysAgo.toISOString().split('T')[0]}&apikey=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`❌ API error for ${company.symbol}: ${response.status}`);
        errors++;
        continue;
      }
      
      const data = await response.json();
      
      if (!data?.historical || !Array.isArray(data.historical) || data.historical.length === 0) {
        console.log(`❌ No historical data for ${company.symbol}`);
        errors++;
        continue;
      }
      
      // Sort prices by date
      const prices = data.historical.sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Get current price (most recent)
      const currentPrice = prices[prices.length - 1]?.adjClose || prices[prices.length - 1]?.close;
      
      if (!currentPrice || currentPrice <= 0) {
        console.log(`❌ Invalid current price for ${company.symbol}`);
        errors++;
        continue;
      }
      
      // Find closest prices to target dates
      const findClosestPrice = (targetDate: Date): number | null => {
        let closestPrice = null;
        let minDiff = Infinity;
        
        for (const price of prices) {
          const priceDate = new Date(price.date);
          const diff = Math.abs(priceDate.getTime() - targetDate.getTime());
          
          if (diff < minDiff) {
            minDiff = diff;
            closestPrice = price.adjClose || price.close;
          }
        }
        
        return closestPrice && closestPrice > 0 ? closestPrice : null;
      };
      
      const price3YearsAgo = findClosestPrice(threeYearsAgo);
      const price5YearsAgo = findClosestPrice(fiveYearsAgo);
      const price10YearsAgo = findClosestPrice(tenYearsAgo);
      
      // Calculate annualized returns
      const calculateReturn = (startPrice: number, endPrice: number, years: number): number => {
        return (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
      };
      
      const return3Year = price3YearsAgo ? calculateReturn(price3YearsAgo, currentPrice, 3) : null;
      const return5Year = price5YearsAgo ? calculateReturn(price5YearsAgo, currentPrice, 5) : null;
      const return10Year = price10YearsAgo ? calculateReturn(price10YearsAgo, currentPrice, 10) : null;
      
      // Update database
      await storage.updateCompany(company.symbol, {
        return3Year: return3Year?.toString() || null,
        return5Year: return5Year?.toString() || null,
        return10Year: return10Year?.toString() || null,
      });
      
      updated++;
      console.log(`✅ [${i + 1}/${companies.length}] ${company.symbol}: 3Y=${return3Year?.toFixed(1)}%, 5Y=${return5Year?.toFixed(1)}%, 10Y=${return10Year?.toFixed(1)}%`);
      
    } catch (error) {
      errors++;
      console.error(`❌ [${i + 1}/${companies.length}] Error processing ${company.symbol}:`, error);
    }
    
    // Rate limiting - 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Progress update every 25 companies
    if ((i + 1) % 25 === 0) {
      const progress = Math.round(((i + 1) / companies.length) * 100);
      console.log(`🚀 PROGRESS: ${progress}% complete (${updated} updated, ${errors} errors)`);
    }
  }
  
  console.log(`🎉 ENHANCEMENT COMPLETE:`);
  console.log(`✅ Updated: ${updated} companies`);
  console.log(`❌ Errors: ${errors} companies`);
  console.log(`📊 Success Rate: ${Math.round((updated / companies.length) * 100)}%`);
}

// Run the enhancement
enhanceAllCompaniesReturns()
  .then(() => {
    console.log("✅ All done!");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Enhancement failed:", error);
    process.exit(1);
  });