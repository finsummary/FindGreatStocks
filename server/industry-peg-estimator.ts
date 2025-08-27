#!/usr/bin/env tsx

import { db } from "./db";
import { companies } from "@shared/schema";
import { eq, sql, isNull, and, or } from "drizzle-orm";

// Industry average PEG ratios based on typical ranges
const INDUSTRY_PEG_ESTIMATES: Record<string, number> = {
  'Technology': 1.5,
  'Software': 1.8,
  'Healthcare': 1.2,
  'Financial': 0.8,
  'Consumer Discretionary': 1.3,
  'Consumer Staples': 1.1,
  'Industrial': 1.0,
  'Energy': 0.9,
  'Materials': 1.0,
  'Utilities': 0.8,
  'Real Estate': 1.5,
  'Telecommunications': 1.0
};

async function estimatePEGFromIndustry() {
  console.log("Starting industry-based PEG ratio estimation...");
  
  // Get companies still missing PEG ratios with their P/E ratios
  const companiesWithoutPEG = await db
    .select({ 
      symbol: companies.symbol, 
      name: companies.name, 
      peRatio: companies.peRatio,
      sector: companies.sector
    })
    .from(companies)
    .where(and(
      or(isNull(companies.pegRatio), eq(companies.pegRatio, "0")),
      sql`${companies.peRatio} IS NOT NULL AND ${companies.peRatio} != '0'`
    ));

  console.log(`Found ${companiesWithoutPEG.length} companies that could benefit from industry estimation`);

  let estimatedCount = 0;

  for (const company of companiesWithoutPEG) {
    try {
      const peRatio = parseFloat(company.peRatio || '0');
      
      if (peRatio > 0 && peRatio < 100) { // Reasonable P/E ratio
        // Determine industry growth estimate
        let growthEstimate = 8; // Default 8% growth
        
        if (company.sector?.includes('Technology') || company.sector?.includes('Software')) {
          growthEstimate = 15;
        } else if (company.sector?.includes('Healthcare') || company.sector?.includes('Biotech')) {
          growthEstimate = 12;
        } else if (company.sector?.includes('Consumer')) {
          growthEstimate = 10;
        } else if (company.sector?.includes('Financial') || company.sector?.includes('Utility')) {
          growthEstimate = 6;
        } else if (company.sector?.includes('Energy') || company.sector?.includes('Material')) {
          growthEstimate = 7;
        }
        
        const estimatedPEG = peRatio / growthEstimate;
        
        if (estimatedPEG > 0 && estimatedPEG < 8) { // Reasonable estimated PEG
          await db
            .update(companies)
            .set({ pegRatio: estimatedPEG.toFixed(2) })
            .where(eq(companies.symbol, company.symbol));
          
          console.log(`✓ Estimated ${company.symbol} PEG ratio: ${estimatedPEG.toFixed(2)} (P/E: ${peRatio}, Est. Growth: ${growthEstimate}%)`);
          estimatedCount++;
        }
      }
      
    } catch (error) {
      console.error(`Error estimating PEG for ${company.symbol}:`, error);
    }
  }

  console.log(`\nIndustry estimation completed! Estimated PEG ratios for ${estimatedCount} companies`);
  
  // Final count
  const totalWithPEG = await db
    .select({ count: sql`count(*)` })
    .from(companies)
    .where(and(
      sql`${companies.pegRatio} IS NOT NULL`,
      sql`${companies.pegRatio} != '0'`
    ));
    
  console.log(`Total companies with PEG ratios: ${totalWithPEG[0].count} out of 503`);
}

// Run the script
estimatePEGFromIndustry()
  .then(() => {
    console.log("Industry PEG estimation completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Industry PEG estimation failed:", error);
    process.exit(1);
  });