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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStatus() {
  console.log('📊 Checking shares_outstanding and market_cap status...\n');

  const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
  
  for (const table of tables) {
    try {
      // Get statistics
      const { data: allCompanies, error: countError } = await supabase
        .from(table)
        .select('symbol, shares_outstanding, market_cap, price', { count: 'exact' });

      if (countError) {
        console.error(`❌ Error reading ${table}:`, countError.message);
        continue;
      }

      if (!allCompanies || allCompanies.length === 0) {
        console.log(`⚠️  ${table}: No companies found`);
        continue;
      }

      const total = allCompanies.length;
      const withShares = allCompanies.filter(c => c.shares_outstanding && Number(c.shares_outstanding) > 0).length;
      const withMarketCap = allCompanies.filter(c => c.market_cap && Number(c.market_cap) > 0).length;
      const withPrice = allCompanies.filter(c => c.price && Number(c.price) > 0).length;
      
      // Check how many have market_cap = 0
      const marketCapZero = allCompanies.filter(c => {
        const mc = c.market_cap ? Number(c.market_cap) : 0;
        return mc === 0;
      }).length;

      // Check how many could have market cap calculated (have price and shares_outstanding)
      const canCalculateMarketCap = allCompanies.filter(c => {
        const price = c.price ? Number(c.price) : 0;
        const shares = c.shares_outstanding ? Number(c.shares_outstanding) : 0;
        return price > 0 && shares > 0;
      }).length;

      // Check how many actually have calculated market cap (price * shares = market_cap)
      let correctlyCalculated = 0;
      for (const company of allCompanies) {
        const price = company.price ? Number(company.price) : 0;
        const shares = company.shares_outstanding ? Number(company.shares_outstanding) : 0;
        const marketCap = company.market_cap ? Number(company.market_cap) : 0;
        
        if (price > 0 && shares > 0 && marketCap > 0) {
          const calculated = price * shares;
          // Allow 1% difference for rounding
          if (Math.abs(calculated - marketCap) / calculated < 0.01) {
            correctlyCalculated++;
          }
        }
      }

      console.log(`\n📊 ${table}:`);
      console.log(`   Total companies: ${total}`);
      console.log(`   ✅ With shares_outstanding: ${withShares} (${((withShares/total)*100).toFixed(1)}%)`);
      console.log(`   ✅ With market_cap > 0: ${withMarketCap} (${((withMarketCap/total)*100).toFixed(1)}%)`);
      console.log(`   ✅ With price > 0: ${withPrice} (${((withPrice/total)*100).toFixed(1)}%)`);
      console.log(`   ⚠️  Market cap = 0: ${marketCapZero} (${((marketCapZero/total)*100).toFixed(1)}%)`);
      console.log(`   💡 Can calculate market cap: ${canCalculateMarketCap} (have both price and shares_outstanding)`);
      console.log(`   ✅ Correctly calculated market cap: ${correctlyCalculated} (price × shares = market_cap)`);

      // Show sample companies
      if (withShares > 0) {
        const samples = allCompanies
          .filter(c => c.shares_outstanding && Number(c.shares_outstanding) > 0)
          .slice(0, 5);
        
        console.log(`\n   📋 Sample companies with shares_outstanding:`);
        for (const company of samples) {
          const shares = Number(company.shares_outstanding);
          const price = company.price ? Number(company.price) : 0;
          const marketCap = company.market_cap ? Number(company.market_cap) : 0;
          const calculated = price > 0 && shares > 0 ? price * shares : 0;
          
          const sharesFormatted = shares >= 1e9 
            ? `${(shares / 1e9).toFixed(2)}B`
            : shares >= 1e6
            ? `${(shares / 1e6).toFixed(2)}M`
            : shares.toLocaleString();
          
          const marketCapFormatted = marketCap > 0
            ? (marketCap >= 1e9 
                ? `$${(marketCap / 1e9).toFixed(2)}B`
                : marketCap >= 1e6
                ? `$${(marketCap / 1e6).toFixed(2)}M`
                : `$${marketCap.toLocaleString()}`)
            : 'N/A';
          
          const calculatedFormatted = calculated > 0
            ? (calculated >= 1e9 
                ? `$${(calculated / 1e9).toFixed(2)}B`
                : calculated >= 1e6
                ? `$${(calculated / 1e6).toFixed(2)}M`
                : `$${calculated.toLocaleString()}`)
            : 'N/A';
          
          console.log(`      ${company.symbol}: shares=${sharesFormatted}, price=$${price.toFixed(2)}, market_cap=${marketCapFormatted}, calculated=${calculatedFormatted}`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${table}:`, error?.message || error);
    }
  }

  console.log(`\n✅ Status check complete!`);
}

checkStatus().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
