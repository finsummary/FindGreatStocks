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

class ReturnsEnhancer {
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

  // Get historical prices and calculate returns
  async getCompanyReturns(symbol: string): Promise<CompanyReturns | null> {
    try {
      console.log(`Fetching historical data for ${symbol}...`);
      
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

      console.log(`✅ Calculated returns for ${symbol}: 3Y=${returns.return3Year?.toFixed(1)}%, 5Y=${returns.return5Year?.toFixed(1)}%, 10Y=${returns.return10Year?.toFixed(1)}%`);
      
      return returns;

    } catch (error) {
      console.error(`Error fetching returns for ${symbol}:`, error);
      return null;
    }
  }

  // Enhance all companies with return data
  async enhanceAllCompaniesReturns(): Promise<{ updated: number; errors: number }> {
    console.log("📈 Starting returns enhancement for all S&P 500 companies...");
    
    try {
      // Get all companies from database
      const companies = await storage.getCompanies(1000); // Get all companies
      console.log(`📊 Enhancing returns data for ${companies.length} companies`);
      
      let updated = 0;
      let errors = 0;
      
      // Process companies in smaller batches to respect API limits
      const batchSize = 3; // Very small batch size for historical data requests
      
      for (let i = 0; i < companies.length; i += batchSize) {
        const batch = companies.slice(i, i + batchSize);
        
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(companies.length/batchSize)}: ${batch.map(c => c.symbol).join(', ')}`);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (company) => {
          try {
            const returns = await this.getCompanyReturns(company.symbol);
            
            if (returns) {
              await storage.updateCompany(company.symbol, {
                return3Year: returns.return3Year?.toString() || null,
                return5Year: returns.return5Year?.toString() || null,
                return10Year: returns.return10Year?.toString() || null,
              });
              updated++;
              console.log(`✅ Updated ${company.symbol} with returns data`);
            } else {
              errors++;
              console.log(`❌ Failed to get returns data for ${company.symbol}`);
            }
          } catch (error) {
            errors++;
            console.error(`❌ Error processing ${company.symbol}:`, error);
          }
        });
        
        await Promise.allSettled(batchPromises);
        
        // Longer rate limiting between batches for historical data
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Progress update every 30 companies
        if ((i + batchSize) % 30 === 0) {
          console.log(`📈 Progress: ${updated} companies updated, ${errors} errors so far`);
        }
      }
      
      console.log(`🎉 Returns enhancement complete:`);
      console.log(`✅ Updated: ${updated} companies`);
      console.log(`❌ Errors: ${errors} companies`);
      
      return { updated, errors };
      
    } catch (error) {
      console.error("Error enhancing returns data:", error);
      throw error;
    }
  }

  // Quick enhancement for specific symbols
  async enhanceSpecificCompaniesReturns(symbols: string[]): Promise<{ updated: number; errors: number }> {
    console.log(`📈 Enhancing returns data for specific companies: ${symbols.join(', ')}`);
    
    let updated = 0;
    let errors = 0;
    
    for (const symbol of symbols) {
      try {
        const returns = await this.getCompanyReturns(symbol);
        
        if (returns) {
          await storage.updateCompany(symbol, {
            return3Year: returns.return3Year?.toString() || null,
            return5Year: returns.return5Year?.toString() || null,
            return10Year: returns.return10Year?.toString() || null,
          });
          updated++;
          console.log(`✅ Enhanced ${symbol} with returns data`);
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

export const returnsEnhancer = new ReturnsEnhancer();

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  returnsEnhancer.enhanceAllCompaniesReturns()
    .then(result => {
      console.log("Returns enhancement completed:", result);
      process.exit(0);
    })
    .catch(error => {
      console.error("Returns enhancement failed:", error);
      process.exit(1);
    });
}