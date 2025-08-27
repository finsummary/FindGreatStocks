import { storage } from './storage';

interface SP500Constituent {
  symbol: string;
  name: string;
  sector: string;
  subSector: string;
  headQuarter: string;
  dateFirstAdded: string;
  cik: string;
  founded: string;
}

interface CompanyQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

class CompleteSP500Importer {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('FMP_API_KEY environment variable is required');
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const url = `https://financialmodelingprep.com/api/v3${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${this.apiKey}`;
    console.log(`Making request to: ${endpoint}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FMP API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return response.json();
  }

  // Get ALL S&P 500 constituents
  async getAllSP500Constituents(): Promise<SP500Constituent[]> {
    try {
      console.log("🔍 Fetching complete S&P 500 constituent list from FMP...");
      const constituents = await this.makeRequest('/sp500_constituent');
      
      if (!Array.isArray(constituents)) {
        throw new Error('Invalid API response format for S&P 500 constituents');
      }
      
      console.log(`✅ Retrieved ${constituents.length} S&P 500 companies from FMP API`);
      
      // Show some sample companies
      if (constituents.length > 0) {
        console.log("Sample companies:", constituents.slice(0, 10).map(c => `${c.symbol} (${c.name})`));
      }
      
      return constituents;
    } catch (error) {
      console.error('Error fetching S&P 500 constituents:', error);
      throw error;
    }
  }

  // Get real-time quotes for all S&P 500 companies
  async getBatchQuotes(symbols: string[]): Promise<CompanyQuote[]> {
    try {
      // FMP allows up to 1000 symbols per request
      const batchSize = 100; // Conservative batch size to avoid errors
      const allQuotes: CompanyQuote[] = [];
      
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const symbolsQuery = batch.join(',');
        
        console.log(`Fetching quotes batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(symbols.length/batchSize)}: ${batch.slice(0, 5).join(', ')}...`);
        
        try {
          const quotes = await this.makeRequest(`/quote/${symbolsQuery}`);
          
          if (Array.isArray(quotes)) {
            allQuotes.push(...quotes);
          }
          
          // Rate limiting - wait between batches
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.error(`Error fetching batch ${Math.floor(i/batchSize) + 1}:`, error);
          // Continue with next batch on error
        }
      }
      
      console.log(`✅ Retrieved quotes for ${allQuotes.length} companies`);
      return allQuotes;
      
    } catch (error) {
      console.error('Error fetching batch quotes:', error);
      throw error;
    }
  }

  // Import ALL S&P 500 companies
  async importAllSP500Companies(): Promise<{ success: number; failed: number; total: number }> {
    console.log("🚀 Starting COMPLETE S&P 500 import...");
    
    try {
      // Step 1: Get all S&P 500 constituents
      const constituents = await this.getAllSP500Constituents();
      const symbols = constituents.map(c => c.symbol);
      
      console.log(`📊 Found ${constituents.length} S&P 500 companies to import`);
      
      // Step 2: Clear existing data
      await storage.clearAllCompanies();
      console.log("✅ Cleared existing company data");
      
      // Step 3: Get real-time quotes for all companies
      const quotes = await this.getBatchQuotes(symbols);
      const quoteMap = new Map(quotes.map(q => [q.symbol, q]));
      
      // Step 4: Import all companies
      let success = 0;
      let failed = 0;
      
      console.log(`📦 Importing ${constituents.length} S&P 500 companies...`);
      
      for (const [index, constituent] of constituents.entries()) {
        try {
          const quote = quoteMap.get(constituent.symbol);
          
          if (!quote) {
            console.log(`⚠️ No quote data for ${constituent.symbol}, skipping`);
            failed++;
            continue;
          }
          
          const companyData = {
            name: quote.name || constituent.name,
            symbol: constituent.symbol,
            rank: index + 1,
            marketCap: (quote.marketCap || 0).toString(),
            price: (quote.price || 0).toFixed(2),
            dailyChange: (quote.change || 0).toFixed(2),
            dailyChangePercent: (quote.changesPercentage || 0).toFixed(2),
            country: "United States",
            countryCode: "US",
            logoUrl: `https://financialmodelingprep.com/image-stock/${constituent.symbol}.png`,
            sector: constituent.sector || "Unknown",
            industry: constituent.subSector || "Unknown",
            exchange: quote.exchange || "NASDAQ",
            currency: "USD",
            peRatio: quote.pe?.toString() || null,
            eps: quote.eps?.toString() || null,
            beta: null,
            dividendYield: null,
            volume: quote.volume ? Math.round(quote.volume) : null,
            avgVolume: quote.avgVolume ? Math.round(quote.avgVolume) : null,
            dayLow: quote.dayLow?.toString() || null,
            dayHigh: quote.dayHigh?.toString() || null,
            yearLow: quote.yearLow?.toString() || null,
            yearHigh: quote.yearHigh?.toString() || null,
            revenue: null,
            grossProfit: null,
            operatingIncome: null,
            netIncome: null,
            totalAssets: null,
            totalDebt: null,
            employees: null,
            description: null,
            website: null,
            ceo: null
          };
          
          await storage.createCompany(companyData);
          success++;
          
          if (success % 50 === 0) {
            console.log(`✅ Imported ${success} companies so far...`);
          }
          
        } catch (error) {
          console.error(`❌ Failed to import ${constituent.symbol}:`, error);
          failed++;
        }
      }
      
      const total = constituents.length;
      console.log(`🎉 COMPLETE S&P 500 import finished:`);
      console.log(`✅ Success: ${success} companies`);
      console.log(`❌ Failed: ${failed} companies`);
      console.log(`📊 Total: ${total} companies`);
      console.log(`📈 Success rate: ${((success / total) * 100).toFixed(1)}%`);
      
      return { success, failed, total };
      
    } catch (error) {
      console.error("❌ Complete S&P 500 import failed:", error);
      throw error;
    }
  }
}

export const completeSP500Importer = new CompleteSP500Importer();

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  completeSP500Importer.importAllSP500Companies()
    .then(result => {
      console.log("Import completed successfully:", result);
      process.exit(0);
    })
    .catch(error => {
      console.error("Import failed:", error);
      process.exit(1);
    });
}