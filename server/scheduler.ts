import { CronJob } from 'cron';
import { updateDowJonesPrices } from './dowjones-daily-updater';
import { updateNasdaq100Prices } from './nasdaq100-daily-updater';
import { updateSp500Prices } from './sp500-daily-updater';

export class DataScheduler {
    private priceJob: CronJob;
    private enhanceJob: CronJob;

    constructor() {
        // Цены сразу после закрытия рынка США (~21:00 UTC)
        this.priceJob = new CronJob('0 0 21 * * *', this.performDailyPrices, null, true, 'UTC');
        // Обогащение метрик чуть позже, чтобы цены успели обновиться
        this.enhanceJob = new CronJob('0 20 21 * * *', this.performDailyEnhancements, null, true, 'UTC');
    }

    public start() {
        console.log("🚀 Scheduler started. Daily price and enhancement jobs are scheduled.");
        this.priceJob.start();
        this.enhanceJob.start();
        // Выполним мягкий прогон на старте (без ожидания расписания)
        this.performDailyPrices().finally(() => this.performDailyEnhancements());
    }

    public stop() {
        this.priceJob.stop();
        this.enhanceJob.stop();
        console.log("Scheduler stopped.");
    }

    private async performDailyPrices() {
        console.log("📈 Running daily price updates (DJI, NDX, S&P 500)...");
        try {
            await updateDowJonesPrices();
            await updateNasdaq100Prices();
            await updateSp500Prices();
            console.log("✅ Price updates completed.");
        } catch (error) {
            console.error("❌ Error during price updates:", error);
        }
    }

    private async performDailyEnhancements() {
        console.log("🧠 Running daily enhancements (financials, returns, drawdowns)...");
        try {
            const { financialDataEnhancer } = await import('./financial-data-enhancer');
            const { returnsEnhancer } = await import('./returns-enhancer');
            const { drawdownEnhancer } = await import('./drawdown-enhancer');

            await financialDataEnhancer.enhanceAllCompaniesFinancialData();
            await returnsEnhancer.enhanceAllCompaniesReturns();
            await drawdownEnhancer.enhanceAllCompaniesDrawdown();
            console.log("✅ Enhancements completed.");
        } catch (error) {
            console.error("❌ Error during enhancements:", error);
        }
    }
}