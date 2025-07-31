import { storage } from './storage';
import { financialDataService } from './financial-data';

class DataScheduler {
  private updateInterval: NodeJS.Timeout | null = null;
  private isUpdating = false;

  constructor() {
    this.startScheduler();
  }

  private startScheduler() {
    console.log('DataScheduler starting...');
    
    // Schedule updates every 24 hours (86400000 ms)
    // In production, this would check if it's after market close (4 PM ET)
    this.updateInterval = setInterval(() => {
      this.performDailyUpdate();
    }, 24 * 60 * 60 * 1000);

    // Also perform initial update on startup if no data exists
    this.checkInitialData();
  }

  private async checkInitialData() {
    try {
      // Always perform full sync on startup to ensure latest data
      console.log('Performing startup data sync to ensure latest data...');
      // Use immediate async execution
      setImmediate(async () => {
        try {
          await this.performFullSync();
          console.log('Startup data sync completed successfully');
        } catch (error) {
          console.error('Error during startup data sync:', error);
        }
      });
    } catch (error) {
      console.error('Error setting up startup data sync:', error);
    }
  }

  private async performFullSync() {
    if (this.isUpdating) {
      console.log('Update already in progress, skipping...');
      return;
    }

    this.isUpdating = true;
    console.log('Starting full company data sync...');

    try {
      // Clear existing data
      await storage.clearAllCompanies();
      
      // Fetch maximum available companies
      const companies = await financialDataService.fetchTopCompaniesByMarketCap(5000);
      console.log(`Fetched ${companies.length} companies from FMP API`);

      // Store companies without profiles to avoid API key issues
      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        const convertedCompany = financialDataService.convertToCompanySchema(company, i + 1);
        await storage.createCompany(convertedCompany);
      }

      console.log(`Successfully synced ${companies.length} companies`);
    } catch (error) {
      console.error('Error during full sync:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  private async performDailyUpdate() {
    if (this.isUpdating) {
      console.log('Update already in progress, skipping...');
      return;
    }

    // Check if it's after market close (4 PM ET / 9 PM UTC)
    const now = new Date();
    const utcHour = now.getUTCHours();
    
    // Only update between 9 PM UTC (4 PM ET) and 2 AM UTC (9 PM ET)
    if (utcHour < 21 && utcHour > 2) {
      console.log('Market is still open, skipping update...');
      return;
    }

    this.isUpdating = true;
    console.log('Starting daily S&P 500 price update...');

    try {
      // Use the daily price updater for S&P 500 companies
      const { dailyPriceUpdater } = await import('./daily-price-updater');
      const result = await dailyPriceUpdater.updateAllPrices();
      console.log(`Successfully updated prices for ${result.updated} S&P 500 companies (${result.errors} errors)`);
    } catch (error) {
      console.error('Error during daily S&P 500 update:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  public async forceUpdate() {
    await this.performDailyUpdate();
  }

  public async forceFullSync() {
    await this.performFullSync();
  }

  public stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

export const dataScheduler = new DataScheduler();