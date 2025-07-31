import { storage } from './storage';

interface PriceUpdate {
  symbol: string;
  price: number;
  marketCap: number;
  change: number;
  changesPercentage: number;
}

export class DailyPriceUpdater {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('FMP_API_KEY environment variable is required');
    }
  }

  // Get current prices for all S&P 500 companies
  async getCurrentPrices(): Promise<PriceUpdate[]> {
    try {
      console.log("📈 Fetching current S&P 500 prices...");
      
      // Get all company symbols from database
      const companies = await storage.getCompanies(1000); // Get all companies
      const symbols = companies.map(c => c.symbol);
      
      if (symbols.length === 0) {
        throw new Error("No companies found in database");
      }
      
      console.log(`📊 Updating prices for ${symbols.length} companies`);
      
      // Batch symbols for API call (FMP supports up to 1000 symbols per request)
      const batchSize = 100;
      const priceUpdates: PriceUpdate[] = [];
      
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const symbolsQuery = batch.join(',');
        
        console.log(`Fetching batch ${Math.floor(i/batchSize) + 1}: ${batch.slice(0, 5).join(', ')}...`);
        
        try {
          const response = await fetch(
            `https://financialmodelingprep.com/api/v3/quote/${symbolsQuery}?apikey=${this.apiKey}`
          );
          
          if (!response.ok) {
            console.error(`API error for batch: ${response.status} ${response.statusText}`);
            continue;
          }
          
          const data = await response.json();
          
          if (Array.isArray(data)) {
            const updates = data.map(quote => ({
              symbol: quote.symbol,
              price: quote.price || 0,
              marketCap: quote.marketCap || 0,
              change: quote.change || 0,
              changesPercentage: quote.changesPercentage || 0
            }));
            
            priceUpdates.push(...updates);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`Error fetching batch ${Math.floor(i/batchSize) + 1}:`, error);
        }
      }
      
      console.log(`✅ Fetched price data for ${priceUpdates.length} companies`);
      return priceUpdates;
      
    } catch (error) {
      console.error("Error fetching current prices:", error);
      throw error;
    }
  }

  // Update all company prices in database
  async updateAllPrices(): Promise<{ updated: number; errors: number }> {
    try {
      console.log("🔄 Starting daily price update...");
      const startTime = Date.now();
      
      const priceUpdates = await this.getCurrentPrices();
      
      let updated = 0;
      let errors = 0;
      
      for (const update of priceUpdates) {
        try {
          await storage.updateCompany(update.symbol, {
            price: update.price.toFixed(2),
            marketCap: Math.round(update.marketCap).toString(),
            dailyChange: update.change.toFixed(2),
            dailyChangePercent: update.changesPercentage.toFixed(2)
          });
          updated++;
        } catch (error) {
          console.error(`Error updating ${update.symbol}:`, error);
          errors++;
        }
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Daily price update complete in ${duration}ms`);
      console.log(`📊 Updated: ${updated} companies, Errors: ${errors}`);
      
      return { updated, errors };
      
    } catch (error) {
      console.error("Error in daily price update:", error);
      throw error;
    }
  }

  // Schedule daily updates (called by scheduler)
  async scheduledUpdate(): Promise<void> {
    try {
      const now = new Date();
      console.log(`⏰ Running scheduled price update at ${now.toISOString()}`);
      
      const result = await this.updateAllPrices();
      
      console.log(`📈 Scheduled update completed: ${result.updated} updated, ${result.errors} errors`);
      
    } catch (error) {
      console.error("Error in scheduled price update:", error);
    }
  }
}

export const dailyPriceUpdater = new DailyPriceUpdater();