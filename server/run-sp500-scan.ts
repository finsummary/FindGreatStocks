import dotenv from 'dotenv';
dotenv.config();

// Quick S&P 500 scan script
import { sp500Scanner } from './sp500-scanner';

async function runFullScanAndImport() {
  try {
    console.log("🚀 Starting S&P 500 FULL scan and import...");
    
    // This is the correct function to call, it handles everything.
    const result = await sp500Scanner.scanAndImportSP500();
    
    console.log(`✅ Scan complete: ${result.success} success, ${result.failed} failed, ${result.total} total`);
    
  } catch (error) {
    console.error("❌ Scan failed:", error);
  }
}

// Run if called directly
runFullScanAndImport();