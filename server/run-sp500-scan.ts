// Quick S&P 500 scan script
import { sp500Scanner } from './sp500-scanner';

async function runQuickScan() {
  try {
    console.log("🚀 Starting S&P 500 quick scan...");
    
    // First, let's test the API connection
    const constituents = await sp500Scanner.getSP500Constituents();
    console.log(`✅ Found ${constituents.length} S&P 500 companies`);
    console.log("Top 5 companies:", constituents.slice(0, 5).map(c => `${c.symbol} (${c.name})`));
    
    // Run a quick scan of 10 companies
    const result = await sp500Scanner.quickScan(10);
    console.log(`✅ Scan complete: ${result.success} success, ${result.failed} failed, ${result.total} total`);
    
  } catch (error) {
    console.error("❌ Scan failed:", error);
  }
}

// Run if called directly
if (require.main === module) {
  runQuickScan();
}