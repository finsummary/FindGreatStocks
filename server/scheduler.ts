import { CronJob } from 'cron';
import { updateDowJonesPrices } from './dowjones-daily-updater';
import { updateNasdaq100Prices } from './nasdaq100-daily-updater';
import { updateSp500Prices } from './sp500-daily-updater';

export class DataScheduler {
    private job: CronJob;

    constructor() {
        // Schedule to run once every day at a specific time (e.g., 10:00 AM UTC)
        // This timing can be adjusted based on market close or other factors.
        // Cron pattern: second minute hour day-of-month month day-of-week
        this.job = new CronJob('0 0 10 * * *', this.performDailyUpdate, null, true, 'UTC');
    }

    public start() {
        console.log("🚀 Scheduler started. Daily data updates are scheduled.");
        this.job.start();
        // Immediately run an update on startup
        this.performDailyUpdate();
    }

    public stop() {
        this.job.stop();
        console.log("Scheduler stopped.");
    }

    private async performDailyUpdate() {
        console.log("🌅 Performing scheduled daily data update...");
        try {
            await updateDowJonesPrices();
            await updateNasdaq100Prices();
            await updateSp500Prices();
            console.log("✅ All daily data updates completed successfully.");
        } catch (error) {
            console.error("❌ An error occurred during the daily update:", error);
        }
    }
}