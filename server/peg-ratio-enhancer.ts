#!/usr/bin/env tsx

import { db } from "./db";
import { companies } from "@shared/schema";
import { eq, sql, isNotNull } from "drizzle-orm";

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const FMP_API_KEY = process.env.FMP_API_KEY;

interface FMPRatios {
  priceEarningsToGrowthRatio?: number;
  pegRatio?: number; // Alternative field name
  date: string;
}

async function makeRequest(endpoint: string): Promise<any> {
  if (!FMP_API_KEY) {
    throw new Error("FMP_API_KEY is not configured");
  }

  const url = `${FMP_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${FMP_API_KEY}`;
  console.log(`Fetching: ${endpoint}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    console.log(`Error response: ${response.status} ${response.statusText}`);
    return null;
  }
  
  return response.json();
}

async function fetchPEGRatio(symbol: string): Promise<number | null> {
  try {
    // Try TTM ratios first (most current data)
    const ttmData = await makeRequest(`/ratios-ttm/${symbol}`);
    if (ttmData && Array.isArray(ttmData) && ttmData.length > 0) {
      const ratios = ttmData[0];
      // console.log(`TTM data for ${symbol}:`, JSON.stringify(ratios, null, 2));
      
      // Check for valid PEG ratio in TTM data (correct field name)
      if (ratios.pegRatioTTM && 
          ratios.pegRatioTTM > 0 && 
          ratios.pegRatioTTM < 10) { // Filter out unrealistic values
        return parseFloat(ratios.pegRatioTTM);
      }
    }

    // Fallback to annual ratios
    const annualData = await makeRequest(`/ratios/${symbol}?limit=1`);
    if (annualData && Array.isArray(annualData) && annualData.length > 0) {
      const ratios = annualData[0];
      // console.log(`Annual data for ${symbol}:`, JSON.stringify(ratios, null, 2));
      
      // Check for valid PEG ratio in annual data
      if (ratios.priceEarningsToGrowthRatio && 
          ratios.priceEarningsToGrowthRatio > 0 && 
          ratios.priceEarningsToGrowthRatio < 10) { // Filter out unrealistic values
        return parseFloat(ratios.priceEarningsToGrowthRatio);
      }
    }

    console.log(`No valid PEG ratio found for ${symbol}`);
    return null;
  } catch (error) {
    console.error(`Error fetching PEG ratio for ${symbol}:`, error);
    return null;
  }
}

async function enhancePEGRatios() {
  console.log("Starting PEG ratio enhancement for all companies...");
  
  // Get all companies that don't have PEG ratio yet
  const companiesWithoutPEG = await db
    .select({ symbol: companies.symbol, name: companies.name })
    .from(companies)
    .where(sql`${companies.pegRatio} IS NULL OR ${companies.pegRatio} = 0`);

  console.log(`Found ${companiesWithoutPEG.length} companies without PEG ratio data`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < companiesWithoutPEG.length; i++) {
    const company = companiesWithoutPEG[i];
    
    try {
      console.log(`[${i + 1}/${companiesWithoutPEG.length}] Processing ${company.symbol} (${company.name})`);
      
      const pegRatio = await fetchPEGRatio(company.symbol);
      
      if (pegRatio !== null && pegRatio > 0) {
        await db
          .update(companies)
          .set({ pegRatio: pegRatio.toString() })
          .where(eq(companies.symbol, company.symbol));
        
        console.log(`✓ Updated ${company.symbol} with PEG ratio: ${pegRatio.toFixed(2)}`);
        successCount++;
      } else {
        console.log(`⚠ No PEG ratio data available for ${company.symbol}`);
        errorCount++;
      }

      // Rate limiting: pause between requests
      if (i % 10 === 0 && i > 0) {
        console.log(`Processed ${i} companies, pausing for rate limiting...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`Error processing ${company.symbol}:`, error);
      errorCount++;
    }
  }

  console.log("\nPEG ratio enhancement completed!");
  console.log(`Success: ${successCount} companies updated`);
  console.log(`Errors/No data: ${errorCount} companies`);
  
  // Show some statistics
  const updatedCompanies = await db
    .select({ 
      symbol: companies.symbol, 
      name: companies.name, 
      pegRatio: companies.pegRatio 
    })
    .from(companies)
    .where(isNotNull(companies.pegRatio))
    .limit(10);
    
  console.log("\nSample of companies with PEG ratios:");
  updatedCompanies.forEach(c => {
    console.log(`${c.symbol}: ${parseFloat(c.pegRatio || '0').toFixed(2)}`);
  });
}

// Run the script if executed directly
enhancePEGRatios()
  .then(() => {
    console.log("PEG ratio enhancement script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("PEG ratio enhancement script failed:", error);
    process.exit(1);
  });