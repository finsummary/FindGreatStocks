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

interface MarketCapData {
  symbol: string;
  marketCap: number;
  price?: number;
}

// Fetch from stockanalysis.com
async function fetchFromStockAnalysis(): Promise<Map<string, MarketCapData>> {
  const data = new Map<string, MarketCapData>();
  
  try {
    console.log('📡 Fetching from stockanalysis.com...');
    const url = 'https://stockanalysis.com/list/sp-500-stocks/';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      console.warn(`⚠️  stockanalysis.com returned ${response.status}`);
      return data;
    }

    const html = await response.text();
    
    // Try to find JSON data embedded in the page (many sites use this)
    const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s) ||
                     html.match(/<script[^>]*type=["']application\/json["'][^>]*>(.+?)<\/script>/s);
    
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[1]);
        console.log('✅ Found JSON data in page');
        // Parse the JSON structure (structure may vary)
        // This is a placeholder - actual structure needs to be inspected
      } catch (e) {
        console.warn('⚠️  Could not parse JSON from page');
      }
    }

    // Try to parse HTML table
    // Look for table with market cap data
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tableMatches = [...html.matchAll(tableRegex)];
    
    if (tableMatches.length > 0) {
      console.log(`✅ Found ${tableMatches.length} table(s) in HTML`);
      // Parse table rows - this is a simplified version
      // Actual parsing would need to inspect the HTML structure
    }

    // Alternative: Look for data attributes or specific patterns
    // Many sites use data attributes like data-market-cap, data-symbol, etc.
    
  } catch (error: any) {
    console.warn(`⚠️  Error fetching from stockanalysis.com:`, error?.message || error);
  }

  return data;
}

// Fetch from companiesmarketcap.com - more reliable parsing
async function fetchFromCompaniesMarketCap(): Promise<Map<string, MarketCapData>> {
  const data = new Map<string, MarketCapData>();
  
  try {
    console.log('📡 Fetching from companiesmarketcap.com...');
    const url = 'https://companiesmarketcap.com/usa/largest-companies-in-the-usa-by-market-cap/';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
      }
    });

    if (!response.ok) {
      console.warn(`⚠️  companiesmarketcap.com returned ${response.status}`);
      return data;
    }

    const html = await response.text();
    
    // Try to find JSON data embedded in the page (many modern sites use this)
    const jsonMatches = [
      html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s),
      html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*type=["']application\/json["'][^>]*>(.+?)<\/script>/s),
      html.match(/<script[^>]*type=["']application\/json["'][^>]*id=["']__NEXT_DATA__["'][^>]*>(.+?)<\/script>/s),
    ].filter(Boolean);
    
    if (jsonMatches.length > 0) {
      try {
        const jsonStr = jsonMatches[0]![1];
        const jsonData = JSON.parse(jsonStr);
        console.log('✅ Found JSON data in page');
        // Navigate through JSON structure to find company data
        // Structure varies, but usually in props.pageProps or similar
        const companies = extractCompaniesFromJson(jsonData);
        companies.forEach(c => data.set(c.symbol, c));
      } catch (e) {
        console.warn('⚠️  Could not parse JSON from page, trying HTML parsing...');
      }
    }
    
    // Fallback: Parse HTML table
    if (data.size === 0) {
      // Look for table rows - companiesmarketcap.com uses specific table structure
      const tableRegex = /<table[^>]*class=["'][^"']*table[^"']*["'][^>]*>([\s\S]*?)<\/table>/gi;
      const tableMatch = html.match(tableRegex);
      
      if (tableMatch) {
        const tableHtml = tableMatch[0];
        // Find all rows with data-symbol attribute
        const rowRegex = /<tr[^>]*data-symbol=["']([^"']+)["'][^>]*>([\s\S]*?)<\/tr>/gi;
        const rows = [...tableHtml.matchAll(rowRegex)];
        
        for (const row of rows) {
          const symbol = row[1]?.toUpperCase();
          const rowHtml = row[2];
          
          if (!symbol) continue;
          
          // Extract market cap - usually in a specific column
          // Format: $XXX.XXB or $XXX.XXM
          const marketCapMatches = [
            rowHtml.match(/<td[^>]*>[\s\$]*([\d,]+\.?\d*)\s*([BMK])[\s]*<\/td>/i),
            rowHtml.match(/data-marketcap=["']([\d.]+)["']/i),
            rowHtml.match(/"marketcap":\s*"([\d.]+)"/i),
          ].filter(Boolean);
          
          if (marketCapMatches.length > 0) {
            const match = marketCapMatches[0]!;
            let marketCap = parseFloat(match[1].replace(/,/g, ''));
            const unit = match[2]?.toUpperCase() || '';
            
            // Convert to base units
            if (unit === 'B') marketCap *= 1e9;
            else if (unit === 'M') marketCap *= 1e6;
            else if (unit === 'K') marketCap *= 1e3;
            
            // Also try to get price if available
            const priceMatch = rowHtml.match(/<td[^>]*>[\s\$]*([\d,]+\.?\d*)[\s]*<\/td>/i);
            const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined;
            
            data.set(symbol, {
              symbol,
              marketCap,
              price
            });
          }
        }
      }
    }
    
    console.log(`✅ Found ${data.size} companies from companiesmarketcap.com`);
  } catch (error: any) {
    console.warn(`⚠️  Error fetching from companiesmarketcap.com:`, error?.message || error);
  }

  return data;
}

// Helper to extract companies from JSON structure
function extractCompaniesFromJson(json: any): MarketCapData[] {
  const companies: MarketCapData[] = [];
  
  // Try common JSON structures
  const paths = [
    json?.props?.pageProps?.companies,
    json?.props?.pageProps?.initialData?.companies,
    json?.pageProps?.companies,
    json?.companies,
    json?.data?.companies,
  ];
  
  for (const companiesArray of paths) {
    if (Array.isArray(companiesArray)) {
      for (const company of companiesArray) {
        if (company?.symbol && company?.marketcap) {
          let marketCap = typeof company.marketcap === 'string' 
            ? parseMarketCapString(company.marketcap)
            : Number(company.marketcap);
          
          if (marketCap > 0) {
            companies.push({
              symbol: company.symbol.toUpperCase(),
              marketCap,
              price: company.price ? Number(company.price) : undefined
            });
          }
        }
      }
      break;
    }
  }
  
  return companies;
}

// Parse market cap string like "$2.5T", "$500B", "$50M"
function parseMarketCapString(str: string): number {
  const match = str.match(/[\$]?([\d,]+\.?\d*)\s*([TBMK])?/i);
  if (!match) return 0;
  
  let value = parseFloat(match[1].replace(/,/g, ''));
  const unit = match[2]?.toUpperCase() || '';
  
  if (unit === 'T') value *= 1e12;
  else if (unit === 'B') value *= 1e9;
  else if (unit === 'M') value *= 1e6;
  else if (unit === 'K') value *= 1e3;
  
  return value;
}

// Fetch from TradingView (if accessible)
async function fetchFromTradingView(): Promise<Map<string, MarketCapData>> {
  const data = new Map<string, MarketCapData>();
  
  try {
    console.log('📡 Fetching from tradingview.com...');
    // TradingView might require authentication or have API
    // For now, we'll skip or use their public data if available
    console.log('⚠️  TradingView requires special handling (may need API key or authentication)');
  } catch (error: any) {
    console.warn(`⚠️  Error fetching from tradingview.com:`, error?.message || error);
  }

  return data;
}

// Fetch market cap from Yahoo Finance API (most reliable)
async function fetchMarketCapFromYahoo(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const summary = data?.quoteSummary?.result?.[0];
    
    if (!summary) return null;

    // Try multiple paths for market cap
    const marketCap = 
      summary.defaultKeyStatistics?.marketCap?.raw ||
      summary.defaultKeyStatistics?.marketCap ||
      summary.summaryDetail?.marketCap?.raw ||
      summary.summaryDetail?.marketCap ||
      null;

    return marketCap ? Number(marketCap) : null;
  } catch (error) {
    return null;
  }
}

// Main function to fetch and update market cap
async function updateMarketCapFromWeb() {
  console.log('🚀 Starting market cap update from web sources...\n');

  // Get all S&P 500 companies
  const tables = ['sp500_companies', 'companies', 'nasdaq100_companies', 'dow_jones_companies'];
  const allSymbols = new Set<string>();
  
  for (const table of tables) {
    const { data } = await supabase.from(table).select('symbol').not('symbol', 'is', null);
    if (data) {
      data.forEach(row => allSymbols.add(row.symbol.toUpperCase()));
    }
  }

  console.log(`📊 Found ${allSymbols.size} unique companies to update\n`);

  // Try web sources first for bulk data
  const allData = new Map<string, MarketCapData>();
  
  console.log('📡 Fetching from companiesmarketcap.com...');
  const companiesMarketCapData = await fetchFromCompaniesMarketCap();
  companiesMarketCapData.forEach((value, key) => allData.set(key, value));
  console.log(`   ✅ Got ${companiesMarketCapData.size} companies from companiesmarketcap.com\n`);
  
  // Fetch from stockanalysis.com as fallback
  if (allData.size < allSymbols.size * 0.5) {
    console.log('📡 Fetching from stockanalysis.com...');
    const stockAnalysisData = await fetchFromStockAnalysis();
    stockAnalysisData.forEach((value, key) => {
      if (!allData.has(key)) {
        allData.set(key, value);
      }
    });
    console.log(`   ✅ Got ${stockAnalysisData.size} companies from stockanalysis.com\n`);
  }

  console.log(`📊 Total unique companies from web sources: ${allData.size}`);

  // If web scraping didn't work, use Yahoo Finance API for all companies
  if (allData.size === 0) {
    console.log('⚠️  Web scraping didn\'t return data. Using Yahoo Finance API for all companies...\n');
  }

  // Update database - use web sources first, then Yahoo Finance API for missing ones
  let totalUpdated = 0;
  let totalFromWeb = 0;
  let totalFromYahoo = 0;
  let totalFailed = 0;

  for (const table of tables) {
    console.log(`\n📊 Updating ${table}...`);
    
    const { data: companies } = await supabase
      .from(table)
      .select('symbol, market_cap')
      .not('symbol', 'is', null);

    if (!companies || companies.length === 0) continue;

    console.log(`   Processing ${companies.length} companies...`);

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      
      // Show progress every 50 companies
      if (i > 0 && i % 50 === 0) {
        console.log(`   📈 Progress: ${i}/${companies.length} companies processed...`);
      }
      const symbol = company.symbol.toUpperCase();
      
      try {
        let marketCap: number | null = null;
        let source = '';

        // First try web sources (if available)
        if (allData.size > 0 && allData.has(symbol)) {
          marketCap = allData.get(symbol)!.marketCap;
          source = 'web';
          totalFromWeb++;
        } else {
          // Use Yahoo Finance API
          marketCap = await fetchMarketCapFromYahoo(symbol);
          if (marketCap) {
            source = 'yahoo';
            totalFromYahoo++;
          }
          
          // Small delay to avoid rate limiting (100ms between requests)
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (marketCap && marketCap > 0) {
          // Update market cap
          const { error } = await supabase
            .from(table)
            .update({ 
              market_cap: marketCap.toString(),
              last_price_update: new Date().toISOString()
            })
            .eq('symbol', symbol);

          if (!error) {
            totalUpdated++;
            if (totalUpdated <= 20) {
              const formatted = marketCap >= 1e9 
                ? `$${(marketCap / 1e9).toFixed(2)}B`
                : marketCap >= 1e6
                ? `$${(marketCap / 1e6).toFixed(2)}M`
                : `$${marketCap.toLocaleString()}`;
              console.log(`   ✅ ${symbol}: Updated market_cap = ${formatted} (${source})`);
            }
          } else {
            totalFailed++;
          }
        } else {
          totalFailed++;
        }
      } catch (error: any) {
        totalFailed++;
        if (totalFailed <= 5) {
          console.warn(`   ⚠️  ${symbol}: Error - ${error?.message || error}`);
        }
      }
    }
  }

  console.log(`\n🎉 Update complete!`);
  console.log(`   ✅ Total updated: ${totalUpdated}`);
  console.log(`   📡 From web sources: ${totalFromWeb}`);
  console.log(`   📡 From Yahoo Finance API: ${totalFromYahoo}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
}

updateMarketCapFromWeb().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
