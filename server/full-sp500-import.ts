import { sp500Scanner } from './sp500-scanner';
import { storage } from './storage';

async function importAllSP500() {
  console.log("🚀 Starting FULL S&P 500 import (all 500+ companies)...");
  
  try {
    // Get S&P 500 constituents count first
    const constituents = await sp500Scanner.getSP500Constituents();
    console.log(`📊 Found ${constituents.length} S&P 500 companies to import`);
    
    // Clear existing data
    await storage.clearAllCompanies();
    console.log("✅ Cleared existing company data");
    
    // Import ALL S&P 500 companies (no limit)
    const result = await sp500Scanner.quickScan(constituents.length);
    
    console.log(`🎉 FULL S&P 500 import complete:`);
    console.log(`✅ Success: ${result.success} companies`);
    console.log(`❌ Failed: ${result.failed} companies`);
    console.log(`📊 Total processed: ${result.total} companies`);
    console.log(`📈 Success rate: ${((result.success / result.total) * 100).toFixed(1)}%`);
    
    // Get final stats
    const companies = await storage.getCompanies(10);
    console.log("\n🏆 Top 10 companies by market cap:");
    companies.forEach((company, index) => {
      const marketCap = company.marketCap ? `$${(parseFloat(company.marketCap) / 1e9).toFixed(1)}B` : 'N/A';
      console.log(`${index + 1}. ${company.name} (${company.symbol}): ${marketCap}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Full import failed:", error);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  importAllSP500();
}

export { importAllSP500 };