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

export async function fixFTSE100Financials() {
  console.log('🔧 Fixing FTSE 100 financial data...');
  
  try {
    // Get all companies missing revenue data
    const companies = await db
      .select()
      .from(ftse100Companies)
      .orderBy(ftse100Companies.marketCap);
    
    console.log(`📊 Processing ${companies.length} FTSE 100 companies...`);
    
    let updated = 0;
    let failed = 0;
    
    for (const company of companies) {
      try {
        console.log(`📈 Fetching financials for ${company.symbol} (${company.name})...`);
        
        // Get annual income statement (most recent year)
        const incomeUrl = `${BASE_URL}/income-statement/${company.symbol}?period=annual&limit=1&apikey=${API_KEY}`;
        const incomeResponse = await fetch(incomeUrl);
        const incomeData = await incomeResponse.json();
        
        if (incomeData && incomeData.length > 0) {
          const income = incomeData[0];
          
          // Update company with financial data
          await db
            .update(ftse100Companies)
            .set({
              revenue: income.revenue ? income.revenue.toString() : null,
              netIncome: income.netIncome ? income.netIncome.toString() : null,
              lastUpdated: new Date()
            })
            .where(eq(ftse100Companies.id, company.id));
          
          console.log(`✅ Updated ${company.symbol}: Revenue: ${income.revenue ? '$' + (income.revenue / 1e9).toFixed(1) + 'B' : 'N/A'}, Net Income: ${income.netIncome ? '$' + (income.netIncome / 1e9).toFixed(1) + 'B' : 'N/A'}`);
          updated++;
        } else {
          console.log(`⚠️ No financial data found for ${company.symbol}`);
          failed++;
        }
        
        // Rate limiting - be respectful to API
        await delay(250);
        
      } catch (error) {
        console.error(`❌ Error processing ${company.symbol}:`, error);
        failed++;
      }
    }
    
    console.log(`🎉 FTSE 100 financial data fix completed!`);
    console.log(`📊 Results: ${updated} companies updated, ${failed} failed`);
    
    return { updated, failed, total: companies.length };
    
  } catch (error) {
    console.error('❌ Financial data fix failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixFTSE100Financials()
    .then(result => {
      console.log('Final result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}