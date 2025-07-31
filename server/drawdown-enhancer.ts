import { storage } from './storage';

interface HistoricalPrice {
  date: string;
  close: number;
  adjClose: number;
}

interface DrawdownResult {
  symbol: string;
  maxDrawdown10Year: number | null;
}

class DrawdownEnhancer {
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

  // Calculate maximum drawdown from price series
  private calculateMaxDrawdown(prices: HistoricalPrice[]): number {
    if (prices.length < 2) return 0;
    
    let maxDrawdown = 0;
    let peak = prices[0].adjClose || prices[0].close;
    
    for (const price of prices) {
      const currentPrice = price.adjClose || price.close;
      
      // Update peak if current price is higher
      if (currentPrice > peak) {
        peak = currentPrice;
      }
      
      // Calculate drawdown from peak
      const drawdown = (peak - currentPrice) / peak;
      
      // Update max drawdown if current drawdown is larger
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown * 100; // Convert to percentage
  }

  // Get historical prices and calculate maximum drawdown
  async getCompanyDrawdown(symbol: string): Promise<DrawdownResult | null> {
    try {
      console.log(`Calculating max drawdown for ${symbol}...`);
      
      // Get dates for 10-year period
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);
      
      const tenYearsAgo = new Date(today);
      tenYearsAgo.setFullYear(today.getFullYear() - 10);

      // Fetch 10 years of historical prices
      const historicalData = await this.makeRequest(`/historical-price-full/${symbol}?from=${tenYearsAgo.toISOString().split('T')[0]}&to=${threeDaysAgo.toISOString().split('T')[0]}`);
      
      if (!historicalData?.historical || !Array.isArray(historicalData.historical)) {
        console.log(`No historical data available for ${symbol}`);
        return null;
      }

      const prices: HistoricalPrice[] = historicalData.historical.sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      if (prices.length < 30) { // Need at least 30 data points for meaningful drawdown
        console.log(`Insufficient price data for ${symbol}`);
        return null;
      }

      // Calculate maximum drawdown
      const maxDrawdown = this.calculateMaxDrawdown(prices);

      const result: DrawdownResult = {
        symbol,
        maxDrawdown10Year: maxDrawdown > 0 ? maxDrawdown : null,
      };

      console.log(`✅ Max drawdown for ${symbol}: ${maxDrawdown.toFixed(1)}%`);
      
      return result;

    } catch (error) {
      console.error(`Error calculating drawdown for ${symbol}:`, error);
      return null;
    }
  }

  // Enhance all companies with drawdown data
  async enhanceAllCompaniesDrawdown(): Promise<{ updated: number; errors: number }> {
    console.log("📉 Starting maximum drawdown enhancement for all S&P 500 companies...");
    
    try {
      // Get all companies from database
      const companies = await storage.getCompanies(1000); // Get all companies
      console.log(`📊 Calculating max drawdown for ${companies.length} companies`);
      
      let updated = 0;
      let errors = 0;
      
      // Process companies one by one
      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        
        try {
          console.log(`[${i + 1}/${companies.length}] Processing ${company.symbol}...`);
          
          const drawdownResult = await this.getCompanyDrawdown(company.symbol);
          
          if (drawdownResult && drawdownResult.maxDrawdown10Year !== null) {
            await storage.updateCompany(company.symbol, {
              maxDrawdown10Year: drawdownResult.maxDrawdown10Year.toString(),
            });
            updated++;
            console.log(`✅ [${i + 1}/${companies.length}] ${company.symbol}: Max Drawdown = ${drawdownResult.maxDrawdown10Year.toFixed(1)}%`);
          } else {
            errors++;
            console.log(`❌ [${i + 1}/${companies.length}] ${company.symbol}: No drawdown data available`);
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
          console.log(`🚀 DRAWDOWN PROGRESS: ${progress}% complete (${updated} updated, ${errors} errors)`);
        }
      }
      
      console.log(`🎉 Drawdown enhancement complete:`);
      console.log(`✅ Updated: ${updated} companies`);
      console.log(`❌ Errors: ${errors} companies`);
      
      return { updated, errors };
      
    } catch (error) {
      console.error("Error enhancing drawdown data:", error);
      throw error;
    }
  }

  // Quick enhancement for specific symbols
  async enhanceSpecificCompaniesDrawdown(symbols: string[]): Promise<{ updated: number; errors: number }> {
    console.log(`📉 Enhancing drawdown data for specific companies: ${symbols.join(', ')}`);
    
    let updated = 0;
    let errors = 0;
    
    for (const symbol of symbols) {
      try {
        const drawdownResult = await this.getCompanyDrawdown(symbol);
        
        if (drawdownResult && drawdownResult.maxDrawdown10Year !== null) {
          await storage.updateCompany(symbol, {
            maxDrawdown10Year: drawdownResult.maxDrawdown10Year.toString(),
          });
          updated++;
          console.log(`✅ Enhanced ${symbol} with max drawdown: ${drawdownResult.maxDrawdown10Year.toFixed(1)}%`);
        } else {
          errors++;
          console.log(`❌ Failed to enhance ${symbol}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error enhancing ${symbol}:`, error);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return { updated, errors };
  }
}

export const drawdownEnhancer = new DrawdownEnhancer();

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  drawdownEnhancer.enhanceAllCompaniesDrawdown()
    .then(result => {
      console.log("Drawdown enhancement completed:", result);
      process.exit(0);
    })
    .catch(error => {
      console.error("Drawdown enhancement failed:", error);
      process.exit(1);
    });
}