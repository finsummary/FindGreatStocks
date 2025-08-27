#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config();

import { storage } from "./storage"; // Use the existing storage abstraction

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
  // console.log(`Fetching: ${endpoint}`); // Reduce noise
  
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
      
      // Check for valid PEG ratio in annual data
      if (ratios.priceEarningsToGrowthRatio && 
          ratios.priceEarningsToGrowthRatio > 0 && 
          ratios.priceEarningsToGrowthRatio < 10) { // Filter out unrealistic values
        return parseFloat(ratios.priceEarningsToGrowthRatio);
      }
    }

    // console.log(`No valid PEG ratio found for ${symbol}`); // Reduce noise
    return null;
  } catch (error) {
    console.error(`Error fetching PEG ratio for ${symbol}:`, error);
    return null;
  }
}

async function enhancePEGRatios() {
  console.log("Starting PEG ratio enhancement for all companies...");
  
  // Get all companies using the storage module
  const allCompanies = await storage.getCompanies(1000); // Fetch up to 1000 companies

  console.log(`Found ${allCompanies.length} total companies. Checking which ones need PEG ratio data...`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < allCompanies.length; i++) {
    const company = allCompanies[i];
    
    // Skip if PEG ratio already exists and is valid
    if (company.pegRatio && parseFloat(company.pegRatio) > 0) {
      skippedCount++;
      continue;
    }

    try {
      if ((i + 1) % 25 === 0) { // Log progress
          console.log(`[${i + 1}/${allCompanies.length}] Processing ${company.symbol} (${company.name})`);
      }
      
      const pegRatio = await fetchPEGRatio(company.symbol);
      
      if (pegRatio !== null && pegRatio > 0) {
        // Use the storage module to update the company
        await storage.updateCompany(company.symbol, { pegRatio: pegRatio.toString() });
        
        // console.log(`✓ Updated ${company.symbol} with PEG ratio: ${pegRatio.toFixed(2)}`); // Reduce noise
        successCount++;
      } else {
        // console.log(`⚠ No PEG ratio data available for ${company.symbol}`); // Reduce noise
        errorCount++;
      }

      // Rate limiting: pause between requests
      await new Promise(resolve => setTimeout(resolve, 500)); // 0.5s delay

    } catch (error) {
      console.error(`Error processing ${company.symbol}:`, error);
      errorCount++;
    }
  }

  console.log("\nPEG ratio enhancement completed!");
  console.log(`Success: ${successCount} companies updated`);
  console.log(`Skipped: ${skippedCount} companies already had data`);
  console.log(`Errors/No data: ${errorCount} companies`);
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