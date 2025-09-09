import { db } from './db';
import { dowJonesCompanies } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { batcher } from './utils/batcher';
import { FinancialDataService } from "./financial-data.ts";
import { updateDcfMetricsForCompany } from "./dcf-daily-updater"; // Import the new function

async function updateDowJonesPrices() {
  const BATCH_SIZE = 100;
  let updatedCount = 0;
  let failedCount = 0;

  try {
    const companiesToUpdate = await db.select({ symbol: dowJonesCompanies.symbol }).from(dowJonesCompanies);
    const symbols = companiesToUpdate.map(c => c.symbol);

    console.log(`Found ${symbols.length} companies in Dow Jones to update.`);

    const batches = batcher(symbols, BATCH_SIZE);

    for (const batch of batches) {
      try {
        const symbolsString = batch.join(',');
        const quotes = await (FinancialDataService as any).makeRequest(`/quote/${symbolsString}`);
        
        if (quotes && quotes.length > 0) {
            for (const quote of quotes) {
                if (quote.symbol && quote.price && quote.marketCap) {
                    try {
                        await db.update(dowJonesCompanies)
                            .set({
                                price: quote.price,
                                marketCap: String(quote.marketCap),
                                updatedAt: new Date(),
                            })
                            .where(eq(dowJonesCompanies.symbol, quote.symbol));
                        
                        console.log(`[${quote.symbol}] 💾 Price & MCap updated to ${quote.price} / ${quote.marketCap}`);

                        // Now, trigger the DCF metrics update
                        await updateDcfMetricsForCompany(dowJonesCompanies, quote.symbol, quote.marketCap);

                    } catch (error) {
                        console.error(`[${quote.symbol}] Error updating price in DB:`, error);
                    }
                }
            }
        } else {
            failedCount += batch.length;
        }
      } catch (batchError) {
        console.error(`Error updating batch for Dow Jones:`, batchError);
        failedCount += batch.length;
      }
    }

    console.log(`Dow Jones update finished. Updated: ${updatedCount}, Failed: ${failedCount}`);
    return { updated: updatedCount, failed: failedCount };
  } catch (error) {
    console.error('Failed to fetch Dow Jones companies for update:', error);
    return { updated: 0, failed: symbols.length };
  }
}

export { updateDowJonesPrices };
