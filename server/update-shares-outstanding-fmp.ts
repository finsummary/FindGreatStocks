#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fmpApiKey = process.env.FMP_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

if (!fmpApiKey) {
  console.error('❌ FMP_API_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Fetch shares outstanding from FMP API
async function fetchSharesOutstandingFromFMP(symbol: string): Promise<number | null> {
  try {
    // Use shares-float endpoint (returns outstandingShares)
    const url = `https://financialmodelingprep.com/stable/shares-float?symbol=${symbol}&apikey=${fmpApiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 402) {
        console.warn(`   ⚠️  ${symbol}: FMP API 402 Payment Required`);
      } else if (response.status === 403) {
        console.warn(`   ⚠️  ${symbol}: FMP API 403 Forbidden`);
      } else if (response.status === 404) {
        // Silently skip 404 - symbol might not be available
        return null;
      }
      return null;
    }

    const data = await response.json();
    
    // FMP API returns shares outstanding in BASE UNITS (not thousands/millions)
    // For example, AAPL has ~14.7 billion shares = 14,697,925,714
    if (Array.isArray(data) && data.length > 0) {
      // Try outstandingShares first (most reliable)
      const sharesOutstanding = data[0].outstandingShares || data[0].floatShares;
      if (sharesOutstanding && sharesOutstanding > 0) {
        return Number(sharesOutstanding);
      }
    }

    return null;
  } catch (error: any) {
    console.warn(`   ⚠️  ${symbol}: FMP API error - ${error?.message || error}`);
    return null;
  }
}

async function updateSharesOutstandingAndMarketCap() {
  console.log('🚀 Starting shares_outstanding and market_cap update using FMP API...\n');

  const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
  
  let totalUpdatedShares = 0;
  let totalUpdatedMarketCap = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const table of tables) {
    console.log(`\n📊 Processing ${table}...`);
    
    try {
      // Get all companies with their current price and shares_outstanding
      const { data: companies, error } = await supabase
        .from(table)
        .select('symbol, price, shares_outstanding, market_cap')
        .not('symbol', 'is', null);

      if (error) {
        console.error(`❌ Error reading ${table}:`, error.message);
        continue;
      }

      if (!companies || companies.length === 0) {
        console.log(`⚠️  No companies found in ${table}`);
        continue;
      }

      console.log(`   Found ${companies.length} companies`);

      // Process in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < companies.length; i += batchSize) {
        const batch = companies.slice(i, i + batchSize);
        
        for (const company of batch) {
          const symbol = company.symbol?.toUpperCase();
          if (!symbol) continue;

          try {
            const existingShares = company.shares_outstanding ? Number(company.shares_outstanding) : null;
            const currentPrice = company.price ? Number(company.price) : null;

            // Skip if we already have shares_outstanding and it's valid
            if (existingShares && existingShares > 0) {
              // Still calculate market cap if we have price but market_cap is 0 or missing
              if (currentPrice && currentPrice > 0) {
                const calculatedMarketCap = existingShares * currentPrice;
                const currentMarketCap = company.market_cap ? Number(company.market_cap) : 0;
                
                // Update market cap if it's 0 or significantly different (>5%)
                if (currentMarketCap === 0 || Math.abs(calculatedMarketCap - currentMarketCap) / currentMarketCap > 0.05) {
                  const { error: updateError } = await supabase
                    .from(table)
                    .update({ 
                      market_cap: calculatedMarketCap.toString(),
                      last_price_update: new Date().toISOString()
                    })
                    .eq('symbol', symbol);

                  if (!updateError) {
                    totalUpdatedMarketCap++;
                    if (totalUpdatedMarketCap <= 10) {
                      const formatted = calculatedMarketCap >= 1e9 
                        ? `$${(calculatedMarketCap / 1e9).toFixed(2)}B`
                        : calculatedMarketCap >= 1e6
                        ? `$${(calculatedMarketCap / 1e6).toFixed(2)}M`
                        : `$${calculatedMarketCap.toLocaleString()}`;
                      console.log(`   ✅ ${symbol}: Updated market_cap = ${formatted} (from existing shares_outstanding)`);
                    }
                  }
                } else {
                  totalSkipped++;
                }
              } else {
                totalSkipped++;
              }
              continue;
            }

            // Fetch shares outstanding from FMP API
            const sharesOutstanding = await fetchSharesOutstandingFromFMP(symbol);

            if (sharesOutstanding && sharesOutstanding > 0) {
              // Calculate market cap if we have price
              let marketCap = null;
              if (currentPrice && currentPrice > 0) {
                marketCap = sharesOutstanding * currentPrice;
              }

              // Update database
              const updates: any = {
                shares_outstanding: sharesOutstanding.toString(),
                last_price_update: new Date().toISOString()
              };

              if (marketCap && marketCap > 0) {
                updates.market_cap = marketCap.toString();
              }

              const { error: updateError } = await supabase
                .from(table)
                .update(updates)
                .eq('symbol', symbol);

              if (updateError) {
                console.error(`   ❌ ${symbol}: Update error:`, updateError.message);
                totalFailed++;
              } else {
                totalUpdatedShares++;
                if (marketCap) totalUpdatedMarketCap++;
                
                if (totalUpdatedShares <= 20) {
                  const sharesFormatted = sharesOutstanding >= 1e9 
                    ? `${(sharesOutstanding / 1e9).toFixed(2)}B`
                    : sharesOutstanding >= 1e6
                    ? `${(sharesOutstanding / 1e6).toFixed(2)}M`
                    : sharesOutstanding >= 1e3
                    ? `${(sharesOutstanding / 1e3).toFixed(2)}K`
                    : sharesOutstanding.toString();
                  
                  const marketCapFormatted = marketCap 
                    ? (marketCap >= 1e9 
                        ? `$${(marketCap / 1e9).toFixed(2)}B`
                        : marketCap >= 1e6
                        ? `$${(marketCap / 1e6).toFixed(2)}M`
                        : `$${marketCap.toLocaleString()}`)
                    : 'N/A (no price)';
                  
                  console.log(`   ✅ ${symbol}: shares_outstanding = ${sharesFormatted} (${sharesOutstanding.toLocaleString()}), market_cap = ${marketCapFormatted}`);
                }
              }
            } else {
              totalFailed++;
              if (totalFailed <= 10) {
                console.warn(`   ⚠️  ${symbol}: Could not fetch shares_outstanding from FMP API`);
              }
            }

            // Rate limiting: small delay between requests
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error: any) {
            console.error(`   ❌ ${symbol}: Error:`, error?.message || error);
            totalFailed++;
          }
        }

        // Show progress every batch
        if ((i + batchSize) % 50 === 0 || i + batchSize >= companies.length) {
          console.log(`   📈 Progress: ${Math.min(i + batchSize, companies.length)}/${companies.length} companies processed...`);
        }

        // Longer delay between batches
        if (i + batchSize < companies.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`   ✅ ${table}: Updated ${totalUpdatedShares} shares_outstanding, ${totalUpdatedMarketCap} market_cap, skipped ${totalSkipped}, failed ${totalFailed}`);
    } catch (error: any) {
      console.error(`❌ Error processing ${table}:`, error?.message || error);
    }
  }

  console.log(`\n🎉 Update complete!`);
  console.log(`   ✅ Updated shares_outstanding: ${totalUpdatedShares}`);
  console.log(`   ✅ Updated market_cap: ${totalUpdatedMarketCap}`);
  console.log(`   ⏭️  Skipped (already had data): ${totalSkipped}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(`\n💡 Note: Shares outstanding is stored in BASE UNITS.`);
  console.log(`   Market cap is calculated as: price * shares_outstanding`);
  console.log(`   Example: If price = $150 and shares_outstanding = 15,300,000,000`);
  console.log(`   Then market_cap = $150 * 15,300,000,000 = $2,295,000,000,000`);
}

updateSharesOutstandingAndMarketCap().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
