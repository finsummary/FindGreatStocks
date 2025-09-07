import { db } from './db';
import { dowJonesCompanies } from '@shared/schema';
import { financialDataService } from './financial-data';
import { eq } from 'drizzle-orm';
import { batcher } from './utils/batcher.ts';

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
        const quotes = await (financialDataService as any).makeRequest(`/quote/${symbolsString}`);
        
        for (const quote of quotes) {
          if (quote.symbol && quote.price != null && quote.marketCap != null) {
            await db.update(dowJonesCompanies)
              .set({
                price: quote.price.toString(),
                marketCap: quote.marketCap.toString(),
                dailyChange: (quote.change ?? 0).toString(),
                dailyChangePercent: (quote.changesPercentage ?? 0).toString(),
                volume: (quote.volume ?? 0).toString(),
              })
              .where(eq(dowJonesCompanies.symbol, quote.symbol));
            updatedCount++;
          } else {
            failedCount++;
          }
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
