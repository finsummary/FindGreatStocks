import { storage } from './storage';
import { financialDataService } from './financial-data';
import { updateNasdaq100Prices } from './nasdaq100-daily-updater';
import { updateDowJonesPrices } from './dowjones-daily-updater';

export class DataScheduler {
  private updateInterval: NodeJS.Timeout | null = null;
  private isUpdating = false;

  constructor() {}

  public start() {
    console.log('DataScheduler starting...');
    
    // Schedule updates every 15 minutes for development
    this.updateInterval = setInterval(() => {
      this.performDailyUpdate();
    }, 15 * 60 * 1000); // 15 minutes

    // Also perform an initial update on startup
    setImmediate(() => this.performDailyUpdate());
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
    const now = new Date();
    if (this.isUpdating) {
      console.log('Update already in progress, skipping...');
      return;
    }

    this.isUpdating = true;
    console.log(`🕒 Starting market data update at ${now.toISOString()}...`);

    try {
      // Update S&P 500 companies
      console.log('📊 Updating S&P 500 companies...');
      const { dailyPriceUpdater } = await import('./daily-price-updater');
      const sp500Result = await dailyPriceUpdater.updateAllPrices();
      console.log(`✅ S&P 500 update completed: ${sp500Result.updated} companies updated (${sp500Result.errors} errors)`);
      
      // Update Nasdaq 100 companies
      console.log('📊 Updating Nasdaq 100 companies...');
      const nasdaq100Result = await updateNasdaq100Prices();
      console.log(`✅ Nasdaq 100 update completed: ${nasdaq100Result.updated} companies updated (${nasdaq100Result.failed} errors)`);
      
      // Update Dow Jones companies
      console.log('📊 Updating Dow Jones companies...');
      const dowJonesResult = await updateDowJonesPrices();
      console.log(`✅ Dow Jones update completed: ${dowJonesResult.updated} companies updated (${dowJonesResult.failed} errors)`);

      console.log(`📊 Daily market update completed. Next update scheduled in 15 minutes.`);
    } catch (error) {
      console.error('❌ Error during daily market update:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  public async forceUpdate() {
    // This method is not fully implemented in the original file,
    // but the edit hint implies its existence.
    // For now, we'll just log a placeholder message.
    console.log('forceUpdate method called. This functionality is not fully implemented yet.');
  }
}