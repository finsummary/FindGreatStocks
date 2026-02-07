import { supabase } from './db';
import { batcher } from './utils/batcher';
import { FinancialDataService } from "./financial-data.ts";
import { updateDcfMetricsForCompany } from "./dcf-daily-updater";
import { calculateDerivedMetrics, formatDerivedMetricsForDB } from "./utils/derived-metrics";

async function updateDowJonesPrices() {
  const BATCH_SIZE = 100;
  let updatedCount = 0;
  let failedCount = 0;

  try {
    const { data: companiesToUpdate, error } = await supabase
      .from('dow_jones_companies')
      .select('symbol');
    
    if (error) {
      console.error('Error fetching Dow Jones companies:', error);
      return { updated: 0, failed: 0 };
    }
    
    const symbols = (companiesToUpdate || []).map(c => c.symbol);

    console.log(`Found ${symbols.length} companies in Dow Jones to update.`);

    const batches = batcher(symbols, BATCH_SIZE);
    const financialDataService = new FinancialDataService();

    for (const batch of batches) {
      try {
        const symbolsString = batch.join(',');
        const quotes = await (financialDataService as any).makeRequest(`/quote/${symbolsString}`);
        
        if (quotes && quotes.length > 0) {
            for (const quote of quotes) {
                if (quote.symbol && (quote.price !== undefined) && (quote.marketCap !== undefined)) {
                    try {
                        const updateData: any = {
                          price: Number(quote.price),
                          market_cap: Number(quote.marketCap),
                          last_price_update: new Date().toISOString(),
                        };
                        if (quote.change !== undefined) updateData.daily_change = Number(quote.change);
                        if (quote.changesPercentage !== undefined) updateData.daily_change_percent = Number(quote.changesPercentage);
                        // Preserve EPS (TTM) between quarter updates; don't overwrite daily
                        // if (quote.eps !== undefined) updateData.eps = String(quote.eps);

                        // Dividend Yield: try quote.yield first, fallback to ratios-ttm
                        try {
                          let dividendYield: number | undefined;
                          if (quote.yield !== undefined && quote.yield !== null) {
                            dividendYield = Number(quote.yield);
                          } else {
                            const ratiosTTM: any = await (financialDataService as any).fetchCompanyRatiosTTM(quote.symbol);
                            if (ratiosTTM) {
                              // FMP sometimes misspells the field as dividendYielTTM (missing 'd')
                              const rawDY =
                                ratiosTTM.dividendYieldTTM ??
                                ratiosTTM.dividendYielTTM ??
                                ratiosTTM.dividendYield ??
                                ratiosTTM.dividendYieldPercentageTTM;
                              if (rawDY !== undefined && rawDY !== null) {
                                dividendYield = Number(rawDY);
                              }
                            }
                          }

                          // Do not overwrite daily. Dividend yield recalculated on client from saved dividend per share when needed.
                        } catch (e) {
                          // Non-fatal: just skip dividend yield if any error
                          console.warn(`[${quote.symbol}] Dividend yield fetch failed or unavailable.`);
                        }

                        // Fetch company data for derived metrics calculation
                        const { data: companyData } = await supabase
                          .from('dow_jones_companies')
                          .select('roic_10y_avg, roic_10y_std, latest_fcf, free_cash_flow, revenue')
                          .eq('symbol', quote.symbol)
                          .single();

                        // Calculate derived metrics if we have the data
                        if (companyData) {
                          const derivedMetrics = calculateDerivedMetrics({
                            roic10YAvg: companyData.roic_10y_avg,
                            roic10YStd: companyData.roic_10y_std,
                            latestFcf: companyData.latest_fcf,
                            freeCashFlow: companyData.free_cash_flow,
                            revenue: companyData.revenue,
                          });
                          const derivedUpdates = formatDerivedMetricsForDB(derivedMetrics);
                          Object.assign(updateData, derivedUpdates);
                        }

                        await supabase
                          .from('dow_jones_companies')
                          .update(updateData)
                          .eq('symbol', quote.symbol);
                        
                        console.log(`[${quote.symbol}] 💾 Price & MCap updated to ${quote.price} / ${quote.marketCap}`);
                        updatedCount++;

                        // Now, trigger the DCF metrics update
                        await updateDcfMetricsForCompany({ table: 'dow_jones_companies' } as any, quote.symbol, quote.marketCap);

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
        console.error(`Error updating batch for Dow Jones:`, batchError);
        failedCount += batch.length;
      }
    }

    console.log(`Dow Jones update finished. Updated: ${updatedCount}, Failed: ${failedCount}`);
    return { updated: updatedCount, failed: failedCount };
  } catch (error) {
    console.error('Failed to fetch Dow Jones companies for update:', error);
    return { updated: updatedCount, failed: failedCount };
  }
}

export { updateDowJonesPrices };
