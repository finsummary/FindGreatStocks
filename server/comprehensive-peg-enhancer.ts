#!/usr/bin/env tsx

import { db } from "./db";
import { companies } from "@shared/schema";
import { eq, sql, isNull, and, or } from "drizzle-orm";

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const FMP_API_KEY = process.env.FMP_API_KEY;

interface GrowthMetrics {
  epsGrowth?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
}

async function makeRequest(endpoint: string): Promise<any> {
  if (!FMP_API_KEY) {
    throw new Error("FMP_API_KEY is not configured");
  }

  const url = `${FMP_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${FMP_API_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 429) {
      console.log(`Rate limited for ${endpoint}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return null;
    }
    console.log(`Error response: ${response.status} ${response.statusText}`);
    return null;
  }
  
  return response.json();
}

async function fetchEarningsGrowth(symbol: string): Promise<number | null> {
  try {
    // Get earnings growth from financial statements
    const incomeData = await makeRequest(`/income-statement/${symbol}?limit=3`);
    
    if (incomeData && Array.isArray(incomeData) && incomeData.length >= 2) {
      const recent = incomeData[0];
      const previous = incomeData[1];
      
      if (recent.netIncome && previous.netIncome && 
          recent.netIncome > 0 && previous.netIncome > 0) {
        const growthRate = ((recent.netIncome - previous.netIncome) / previous.netIncome) * 100;
        return Math.max(0, Math.min(growthRate, 100)); // Cap growth at 100%
      }
    }
    
    // Fallback to key metrics for EPS growth
    const keyMetrics = await makeRequest(`/key-metrics/${symbol}?limit=3`);
    if (keyMetrics && Array.isArray(keyMetrics) && keyMetrics.length >= 2) {
      const recent = keyMetrics[0];
      const previous = keyMetrics[1];
      
      if (recent.eps && previous.eps && recent.eps > 0 && previous.eps > 0) {
        const epsGrowth = ((recent.eps - previous.eps) / previous.eps) * 100;
        return Math.max(0, Math.min(epsGrowth, 100)); // Cap growth at 100%
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching growth for ${symbol}:`, error);
    return null;
  }
}

async function calculatePEGFromGrowth(peRatio: number, symbol: string): Promise<number | null> {
  const growthRate = await fetchEarningsGrowth(symbol);
  
  if (growthRate && growthRate > 0) {
    const pegRatio = peRatio / growthRate;
    
    // Only return reasonable PEG ratios
    if (pegRatio > 0 && pegRatio < 10) {
      return pegRatio;
    }
  }
  
  return null;
}

async function fetchDirectPEGRatio(symbol: string): Promise<number | null> {
  try {
    // Try TTM ratios first
    const ttmData = await makeRequest(`/ratios-ttm/${symbol}`);
    if (ttmData && Array.isArray(ttmData) && ttmData.length > 0) {
      const ratios = ttmData[0];
      
      if (ratios.pegRatioTTM && ratios.pegRatioTTM > 0 && ratios.pegRatioTTM < 10) {
        return parseFloat(ratios.pegRatioTTM);
      }
    }

    // Fallback to annual ratios
    const annualData = await makeRequest(`/ratios/${symbol}?limit=1`);
    if (annualData && Array.isArray(annualData) && annualData.length > 0) {
      const ratios = annualData[0];
      
      if (ratios.priceEarningsToGrowthRatio && 
          ratios.priceEarningsToGrowthRatio > 0 && 
          ratios.priceEarningsToGrowthRatio < 10) {
        return parseFloat(ratios.priceEarningsToGrowthRatio);
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching direct PEG ratio for ${symbol}:`, error);
    return null;
  }
}

async function enhanceAllPEGRatios() {
  console.log("Starting comprehensive PEG ratio enhancement...");
  
  // Get all companies without PEG ratio
  const companiesWithoutPEG = await db
    .select({ 
      symbol: companies.symbol, 
      name: companies.name, 
      peRatio: companies.peRatio 
    })
    .from(companies)
    .where(or(
      isNull(companies.pegRatio),
      eq(companies.pegRatio, "0")
    ));

  console.log(`Found ${companiesWithoutPEG.length} companies without PEG ratio data`);

  let directSuccess = 0;
  let calculatedSuccess = 0;
  let errorCount = 0;

  for (let i = 0; i < companiesWithoutPEG.length; i++) {
    const company = companiesWithoutPEG[i];
    
    try {
      console.log(`[${i + 1}/${companiesWithoutPEG.length}] Processing ${company.symbol} (${company.name})`);
      
      // Strategy 1: Try to get PEG ratio directly from API
      let pegRatio = await fetchDirectPEGRatio(company.symbol);
      let source = "direct";
      
      // Strategy 2: Calculate PEG from P/E ratio and growth data
      if (!pegRatio && company.peRatio && parseFloat(company.peRatio) > 0) {
        pegRatio = await calculatePEGFromGrowth(parseFloat(company.peRatio), company.symbol);
        source = "calculated";
      }
      
      if (pegRatio !== null && pegRatio > 0) {
        await db
          .update(companies)
          .set({ pegRatio: pegRatio.toFixed(2) })
          .where(eq(companies.symbol, company.symbol));
        
        console.log(`✓ Updated ${company.symbol} with ${source} PEG ratio: ${pegRatio.toFixed(2)}`);
        
        if (source === "direct") {
          directSuccess++;
        } else {
          calculatedSuccess++;
        }
      } else {
        console.log(`⚠ No PEG ratio data available for ${company.symbol}`);
        errorCount++;
      }

      // Rate limiting: pause between requests
      if (i % 5 === 0 && i > 0) {
        console.log(`Processed ${i} companies, pausing for rate limiting...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`Error processing ${company.symbol}:`, error);
      errorCount++;
    }
  }

  console.log("\nComprehensive PEG ratio enhancement completed!");
  console.log(`Direct API success: ${directSuccess} companies`);
  console.log(`Calculated success: ${calculatedSuccess} companies`);
  console.log(`Errors/No data: ${errorCount} companies`);
  
  // Final statistics
  const totalWithPEG = await db
    .select({ count: sql`count(*)` })
    .from(companies)
    .where(and(
      sql`${companies.pegRatio} IS NOT NULL`,
      sql`${companies.pegRatio} != '0'`
    ));
    
  console.log(`\nTotal companies with PEG ratios: ${totalWithPEG[0].count} out of 503`);
  
  // Show some examples
  const examples = await db
    .select({ 
      symbol: companies.symbol, 
      name: companies.name, 
      pegRatio: companies.pegRatio 
    })
    .from(companies)
    .where(and(
      sql`${companies.pegRatio} IS NOT NULL`,
      sql`${companies.pegRatio} != '0'`
    ))
    .limit(10);
    
  console.log("\nSample companies with PEG ratios:");
  examples.forEach(c => {
    console.log(`${c.symbol}: ${parseFloat(c.pegRatio || '0').toFixed(2)}`);
  });
}

// Run the script
enhanceAllPEGRatios()
  .then(() => {
    console.log("Comprehensive PEG ratio enhancement completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Comprehensive PEG ratio enhancement failed:", error);
    process.exit(1);
  });