import { sp500Scanner } from './sp500-scanner';
import { storage } from './storage';

async function importSP500() {
  console.log("🚀 Starting S&P 500 import process...");
  
  try {
    // Clear existing data
    await storage.clearAllCompanies();
    console.log("✅ Cleared existing company data");
    
    // Import S&P 500 companies
    const result = await sp500Scanner.quickScan(50); // Start with 50 companies
    
    console.log(`🎉 Import complete:`);
    console.log(`✅ Success: ${result.success} companies`);
    console.log(`❌ Failed: ${result.failed} companies`);
    console.log(`📊 Total processed: ${result.total} companies`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

importSP500();