import { CronJob } from 'cron';
import { updateDowJonesPrices } from './dowjones-daily-updater';
import { updateNasdaq100Prices } from './nasdaq100-daily-updater';
import { updateSp500Prices } from './sp500-daily-updater';
import { supabase } from './db';

export class DataScheduler {
    private priceJob: CronJob;
    private enhanceJob: CronJob;
    private syncJob: CronJob;

    constructor() {
        // Цены сразу после закрытия рынка США (~21:00 UTC)
        this.priceJob = new CronJob('0 0 21 * * *', this.performDailyPrices, null, true, 'UTC');
        // Обогащение метрик чуть позже, чтобы цены успели обновиться
        this.enhanceJob = new CronJob('0 20 21 * * *', this.performDailyEnhancements, null, true, 'UTC');
        // Ежедневная ресинхронизация составов индексов в 20:30 UTC
        this.syncJob = new CronJob('0 30 20 * * *', this.performDailyIndexRefresh, null, true, 'UTC');
    }

    public start() {
        console.log("🚀 Scheduler started. Daily price and enhancement jobs are scheduled.");
        this.priceJob.start();
        this.enhanceJob.start();
        this.syncJob.start();
        // Не запускаем тяжёлые задачи немедленно при старте, чтобы избежать таймаутов на платформах деплоя
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

    private async performDailyIndexRefresh() {
        console.log("🔁 Running daily index constituents refresh (S&P 500 / Nasdaq 100 / Dow Jones)...");
        try {
            const apiKey = process.env.FMP_API_KEY;
            if (!apiKey) {
                console.warn('FMP_API_KEY missing; skip index refresh.');
                return;
            }
            const refresh = async (table: string, path: string) => {
                const url = `https://financialmodelingprep.com/api/v3/${path}?apikey=${apiKey}`;
                const resp = await fetch(url);
                if (!resp.ok) throw new Error(`${path} failed: ${resp.status}`);
                const list = await resp.json();
                const symbols = new Set((list || []).map((i: any) => i.symbol).filter(Boolean));
                const { data: existing } = await supabase.from(table).select('symbol');
                const existingSet = new Set((existing || []).map((r: any) => r.symbol));

                const toInsert: any[] = [];
                (list || []).forEach((i: any) => {
                    if (i?.symbol && !existingSet.has(i.symbol)) toInsert.push({ symbol: i.symbol, name: i.name || i.symbol });
                });
                const toDelete: string[] = [];
                existingSet.forEach((s: string) => { if (!symbols.has(s)) toDelete.push(s); });

                if (toInsert.length) await supabase.from(table).insert(toInsert);
                for (let i = 0; i < toDelete.length; i += 100) {
                    const chunk = toDelete.slice(i, i + 100);
                    if (chunk.length) await supabase.from(table).delete().in('symbol', chunk);
                }
                console.log(`🔔 ${table}: +${toInsert.length}, -${toDelete.length}, total=${symbols.size}`);
            };

            await refresh('sp500_companies', 'sp500_constituent');
            await refresh('nasdaq100_companies', 'nasdaq_constituent');
            await refresh('dow_jones_companies', 'dowjones_constituent');
        } catch (e) {
            console.error('Index refresh error:', e);
        }
    }
}