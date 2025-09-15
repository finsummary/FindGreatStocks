import { db } from "./db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";
import { batcher } from "./utils/batcher";
import { FinancialDataService } from "./financial-data.ts";
import { updateDcfMetricsForCompany } from "./dcf-daily-updater";

const BATCH_SIZE = 100; // FMP API is more stable with batches of 100

/**
 * Fetches the latest price and market cap for all S&P 500 companies
 * and updates the database. Also triggers DCF metric recalculation.
 */
export async function updateSp500Prices() {
    console.log("🚀 Starting daily price update for S&P 500...");
    const financialDataService = new FinancialDataService();

    try {
        const companies = await db.select({ symbol: schema.sp500Companies.symbol }).from(schema.sp500Companies);
        const symbols = companies.map(c => c.symbol).filter((s): s is string => s !== null);

        if (symbols.length === 0) {
            console.log("No S&P 500 companies found in the database. Skipping update.");
            return;
        }

        console.log(`📊 Found ${symbols.length} S&P 500 companies to update.`);

        const symbolBatches = batcher(symbols, BATCH_SIZE);
        let updatedCount = 0;
        let failedCount = 0;

        for (const batch of symbolBatches) {
            try {
                const symbolsString = batch.join(',');
                const quotes = await (financialDataService as any).makeRequest(`/quote/${symbolsString}`);

                if (quotes && quotes.length > 0) {
                    for (const quote of quotes) {
                        if (quote.symbol && quote.price && quote.marketCap) {
                            try {
                                const updateData: any = {
                                    price: quote.price,
                                    marketCap: String(quote.marketCap),
                                };
                                if (quote.change !== undefined) updateData.dailyChange = String(quote.change);
                                if (quote.changesPercentage !== undefined) updateData.dailyChangePercent = String(quote.changesPercentage);
                                // Do not overwrite fundamental fields daily
                                // if (quote.eps !== undefined) updateData.eps = String(quote.eps);

                                // Fallback to ratios-ttm dividend yield (TTM)
                                if (false && !updateData.dividendYield) {
                                    try {
                                        const apiKey = process.env.FMP_API_KEY;
                                        const ttm = await fetch(`https://financialmodelingprep.com/api/v3/ratios-ttm/${quote.symbol}?apikey=${apiKey}`).then((r: any) => r.ok ? r.json() : null);
                                        const raw = Array.isArray(ttm) && ttm.length ? ttm[0] : null;
                                        const dy = raw && (raw.dividendYieldTTM ?? raw.dividendYielTTM);
                                        if (dy !== null && dy !== undefined) {
                                            updateData.dividendYield = String(Number(dy) * 100); // percentage
                                        }
                                    } catch {}
                                }

                                await db.update(schema.sp500Companies)
                                    .set(updateData)
                                    .where(eq(schema.sp500Companies.symbol, quote.symbol));

                                console.log(`[${quote.symbol}] 💾 Price & MCap updated to ${quote.price} / ${quote.marketCap}`);
                                updatedCount++;

                                // Now, trigger the DCF metrics update
                                await updateDcfMetricsForCompany(schema.sp500Companies, quote.symbol, quote.marketCap);

                            } catch (error) {
                                failedCount++;
                                console.error(`[${quote.symbol}] Error updating price in DB:`, error);
                            }
                        } else {
                            failedCount++;
                        }
                    }
                } else {
                    failedCount += batch.length;
                }
            } catch (batchError) {
                failedCount += batch.length;
                console.error(`❌ Error processing batch:`, batchError);
            }
        }

        console.log("🎉 S&P 500 daily price update complete.");
        console.log(`✅ Updated: ${updatedCount}, ❌ Failed: ${failedCount}`);

    } catch (error) {
        console.error("❌ A critical error occurred during the S&P 500 price update process:", error);
    }
}
