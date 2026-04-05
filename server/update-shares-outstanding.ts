#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Fetch shares outstanding from Yahoo Finance
async function fetchSharesOutstandingFromYahoo(symbol: string): Promise<number | null> {
  try {
    const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=defaultKeyStatistics,summaryDetail`;
    const response = await fetch(summaryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const summary = data?.quoteSummary?.result?.[0];

    if (!summary) return null;

    // Try multiple paths for shares outstanding
    const sharesOutstanding = 
      summary.defaultKeyStatistics?.sharesOutstanding?.raw ||
      summary.defaultKeyStatistics?.sharesOutstanding ||
      summary.summaryDetail?.sharesOutstanding?.raw ||
      summary.summaryDetail?.sharesOutstanding ||
      null;

    // Yahoo Finance returns shares outstanding in BASE UNITS (not thousands/millions)
    // For example, AAPL has ~15.3 billion shares = 15,300,000,000
    return sharesOutstanding ? Number(sharesOutstanding) : null;
  } catch (error) {
    console.warn(`[Yahoo] Error fetching shares for ${symbol}:`, error?.message || error);
    return null;
  }
}

// Fetch shares outstanding from FMP API
async function fetchSharesOutstandingFromFMP(symbol: string): Promise<number | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  try {
    // Try key-metrics-ttm endpoint first
    const url = `https://financialmodelingprep.com/stable/key-metrics-ttm/${symbol}?apikey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) return null;

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0 && data[0].sharesOutstandingTTM) {
      // FMP API returns shares outstanding in BASE UNITS (not thousands/millions)
      // For example, AAPL has ~15.3 billion shares = 15,300,000,000
      return Number(data[0].sharesOutstandingTTM);
    }

    return null;
  } catch (error) {
    console.warn(`[FMP] Error fetching shares for ${symbol}:`, error?.message || error);
    return null;
  }
}

async function updateSharesOutstanding() {
  console.log('🚀 Starting shares_outstanding update for all companies...\n');

  const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
  
  let totalUpdated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const table of tables) {
    console.log(`\n📊 Processing ${table}...`);
    
    try {
      // Get all symbols from table
      const { data: companies, error } = await supabase
        .from(table)
        .select('symbol, shares_outstanding')
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

          // Skip if we already have shares_outstanding (unless it's 0 or null)
          const existingShares = company.shares_outstanding ? Number(company.shares_outstanding) : null;
          if (existingShares && existingShares > 0) {
            totalSkipped++;
            if (totalSkipped <= 5) {
              console.log(`   ⏭️  ${symbol}: Already has shares_outstanding (${existingShares.toLocaleString()})`);
            }
            continue;
          }

          try {
            // Try Yahoo Finance first (no API key required)
            let sharesOutstanding = await fetchSharesOutstandingFromYahoo(symbol);
            
            // Fallback to FMP API if Yahoo Finance didn't work
            if (!sharesOutstanding || sharesOutstanding <= 0) {
              sharesOutstanding = await fetchSharesOutstandingFromFMP(symbol);
            }

            if (sharesOutstanding && sharesOutstanding > 0) {
              // Update in database
              // Shares outstanding is stored in BASE UNITS (not thousands/millions)
              // Market cap will be calculated as: price * shares_outstanding
              const { error: updateError } = await supabase
                .from(table)
                .update({ shares_outstanding: sharesOutstanding.toString() })
                .eq('symbol', symbol);

              if (updateError) {
                console.error(`   ❌ ${symbol}: Update error:`, updateError.message);
                totalFailed++;
              } else {
                totalUpdated++;
                if (totalUpdated <= 10) {
                  // Format for display (show in billions if > 1B, millions if > 1M)
                  const formatted = sharesOutstanding >= 1e9 
                    ? `${(sharesOutstanding / 1e9).toFixed(2)}B`
                    : sharesOutstanding >= 1e6
                    ? `${(sharesOutstanding / 1e6).toFixed(2)}M`
                    : sharesOutstanding >= 1e3
                    ? `${(sharesOutstanding / 1e3).toFixed(2)}K`
                    : sharesOutstanding.toString();
                  console.log(`   ✅ ${symbol}: Updated shares_outstanding = ${formatted} (${sharesOutstanding.toLocaleString()} base units)`);
                }
              }
            } else {
              totalFailed++;
              // Show more details for first few failures
              if (totalFailed <= 10) {
                console.warn(`   ⚠️  ${symbol}: Could not fetch shares_outstanding (tried Yahoo Finance and FMP API)`);
              }
            }

            // Rate limiting: small delay between requests
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error: any) {
            console.error(`   ❌ ${symbol}: Error:`, error?.message || error);
            totalFailed++;
          }
        }

        // Show progress
        if ((i + batchSize) % 50 === 0 || i + batchSize >= companies.length) {
          console.log(`   📈 Progress: ${Math.min(i + batchSize, companies.length)}/${companies.length} companies processed...`);
        }

        // Longer delay between batches
        if (i + batchSize < companies.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`   ✅ ${table}: Updated ${totalUpdated} companies, skipped ${totalSkipped}, failed ${totalFailed}`);
    } catch (error: any) {
      console.error(`❌ Error processing ${table}:`, error?.message || error);
    }
  }

  console.log(`\n🎉 Update complete!`);
  console.log(`   ✅ Updated: ${totalUpdated}`);
  console.log(`   ⏭️  Skipped (already had data): ${totalSkipped}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(`\n💡 Note: Shares outstanding is stored in BASE UNITS.`);
  console.log(`   Market cap will be calculated as: price * shares_outstanding`);
  console.log(`   Example: If price = $150 and shares_outstanding = 15,300,000,000`);
  console.log(`   Then market_cap = $150 * 15,300,000,000 = $2,295,000,000,000`);
}

updateSharesOutstanding().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
