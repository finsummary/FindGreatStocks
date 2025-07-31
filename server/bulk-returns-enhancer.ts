import { storage } from './storage';

interface HistoricalPrice {
  date: string;
  close: number;
  adjClose: number;
}

interface CompanyReturns {
  symbol: string;
  return3Year: number | null;
  return5Year: number | null;
  return10Year: number | null;
}

class BulkReturnsEnhancer {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('FMP_API_KEY environment variable is required');
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const url = `https://financialmodelingprep.com/api/v3${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${this.apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FMP API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return response.json();
  }

  // Calculate annualized return between two prices
  private calculateAnnualizedReturn(startPrice: number, endPrice: number, years: number): number {
    if (startPrice <= 0 || endPrice <= 0 || years <= 0) return 0;
    return (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
  }

  // Get historical prices and calculate returns for a company
  async getCompanyReturns(symbol: string): Promise<CompanyReturns | null> {
    try {
      // Get current date and calculate target dates
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);
      
      const threeYearsAgo = new Date(today);
      threeYearsAgo.setFullYear(today.getFullYear() - 3);
      
      const fiveYearsAgo = new Date(today);
      fiveYearsAgo.setFullYear(today.getFullYear() - 5);
      
      const tenYearsAgo = new Date(today);
      tenYearsAgo.setFullYear(today.getFullYear() - 10);

      // Fetch historical prices (last 11 years to ensure we have data)
      const historicalData = await this.makeRequest(`/historical-price-full/${symbol}?from=${tenYearsAgo.toISOString().split('T')[0]}&to=${threeDaysAgo.toISOString().split('T')[0]}`);
      
      if (!historicalData?.historical || !Array.isArray(historicalData.historical)) {
        console.log(`No historical data available for ${symbol}`);
        return null;
      }

      const prices: HistoricalPrice[] = historicalData.historical.sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      if (prices.length === 0) {
        console.log(`No price data found for ${symbol}`);
        return null;
      }

      // Get current price (most recent)
      const currentPrice = prices[prices.length - 1]?.adjClose || prices[prices.length - 1]?.close;
      
      if (!currentPrice || currentPrice <= 0) {
        console.log(`Invalid current price for ${symbol}`);
        return null;
      }

      // Find closest prices to target dates
      const findClosestPrice = (targetDate: Date): number | null => {
        let closestPrice = null;
        let minDiff = Infinity;
        
        for (const price of prices) {
          const priceDate = new Date(price.date);
          const diff = Math.abs(priceDate.getTime() - targetDate.getTime());
          
          if (diff < minDiff) {
            minDiff = diff;
            closestPrice = price.adjClose || price.close;
          }
        }
        
        return closestPrice && closestPrice > 0 ? closestPrice : null;
      };

      const price3YearsAgo = findClosestPrice(threeYearsAgo);
      const price5YearsAgo = findClosestPrice(fiveYearsAgo);
      const price10YearsAgo = findClosestPrice(tenYearsAgo);

      // Calculate annualized returns
      const returns: CompanyReturns = {
        symbol,
        return3Year: price3YearsAgo ? this.calculateAnnualizedReturn(price3YearsAgo, currentPrice, 3) : null,
        return5Year: price5YearsAgo ? this.calculateAnnualizedReturn(price5YearsAgo, currentPrice, 5) : null,
        return10Year: price10YearsAgo ? this.calculateAnnualizedReturn(price10YearsAgo, currentPrice, 10) : null,
      };

      return returns;

    } catch (error) {
      console.error(`Error fetching returns for ${symbol}:`, error);
      return null;
    }
  }

  // Enhanced bulk processing with better error handling and progress tracking
  async enhanceAllCompaniesReturns(): Promise<{ updated: number; errors: number }> {
    console.log("📈 Starting BULK returns enhancement for ALL 503 S&P 500 companies...");
    
    try {
      // Get all companies from database
      const companies = await storage.getCompanies(1000); // Get all companies
      console.log(`📊 Processing returns data for ${companies.length} companies`);
      
      let updated = 0;
      let errors = 0;
      
      // Process companies one by one with progress tracking
      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        
        try {
          console.log(`[${i + 1}/${companies.length}] Processing ${company.symbol}...`);
          
          const returns = await this.getCompanyReturns(company.symbol);
          
          if (returns && (returns.return3Year !== null || returns.return5Year !== null || returns.return10Year !== null)) {
            await storage.updateCompany(company.symbol, {
              return3Year: returns.return3Year?.toString() || null,
              return5Year: returns.return5Year?.toString() || null,
              return10Year: returns.return10Year?.toString() || null,
            });
            updated++;
            console.log(`✅ [${i + 1}/${companies.length}] ${company.symbol}: 3Y=${returns.return3Year?.toFixed(1)}%, 5Y=${returns.return5Year?.toFixed(1)}%, 10Y=${returns.return10Year?.toFixed(1)}%`);
          } else {
            errors++;
            console.log(`❌ [${i + 1}/${companies.length}] ${company.symbol}: No returns data available`);
          }
        } catch (error) {
          errors++;
          console.error(`❌ [${i + 1}/${companies.length}] Error processing ${company.symbol}:`, error);
        }
        
        // Rate limiting - 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Progress update every 25 companies
        if ((i + 1) % 25 === 0) {
          const progress = Math.round(((i + 1) / companies.length) * 100);
          console.log(`🚀 PROGRESS: ${progress}% complete (${updated} updated, ${errors} errors)`);
        }
      }
      
      console.log(`🎉 BULK RETURNS ENHANCEMENT COMPLETE:`);
      console.log(`✅ Updated: ${updated} companies`);
      console.log(`❌ Errors: ${errors} companies`);
      console.log(`📊 Success Rate: ${Math.round((updated / companies.length) * 100)}%`);
      
      return { updated, errors };
      
    } catch (error) {
      console.error("Error in bulk returns enhancement:", error);
      throw error;
    }
  }
}

export const bulkReturnsEnhancer = new BulkReturnsEnhancer();

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  bulkReturnsEnhancer.enhanceAllCompaniesReturns()
    .then(result => {
      console.log("✅ Bulk returns enhancement completed:", result);
      process.exit(0);
    })
    .catch(error => {
      console.error("❌ Bulk returns enhancement failed:", error);
      process.exit(1);
    });
}