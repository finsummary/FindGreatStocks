#!/usr/bin/env tsx

import { db } from './db';
import { companies } from '@shared/schema';
import { eq, or, isNull } from 'drizzle-orm';

const FMP_API_KEY = process.env.FMP_API_KEY;

if (!FMP_API_KEY) {
  console.error('❌ FMP_API_KEY environment variable is required');
  process.exit(1);
}

interface CompanyMetrics {
  symbol: string;
  revenue: number | null;
  netIncome: number | null;
  peRatio: number | null;
}

async function fetchCompanyFundamentals(symbol: string): Promise<CompanyMetrics> {
  try {
    // Fetch income statement (TTM)
    const incomeUrl = `https://financialmodelingprep.com/api/v3/income-statement/${symbol}?period=annual&limit=1&apikey=${FMP_API_KEY}`;
    const incomeResponse = await fetch(incomeUrl);
    
    if (!incomeResponse.ok) {
      throw new Error(`Income statement HTTP ${incomeResponse.status}`);
    }
    
    const incomeData = await incomeResponse.json();
    
    // Fetch key metrics (for P/E ratio)
    const metricsUrl = `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${symbol}?apikey=${FMP_API_KEY}`;
    const metricsResponse = await fetch(metricsUrl);
    
    if (!metricsResponse.ok) {
      throw new Error(`Key metrics HTTP ${metricsResponse.status}`);
    }
    
    const metricsData = await metricsResponse.json();
    
    const revenue = incomeData?.[0]?.revenue || null;
    const netIncome = incomeData?.[0]?.netIncome || null;
    const peRatio = metricsData?.[0]?.peRatioTTM || null;
    
    return {
      symbol,
      revenue: revenue ? Math.round(revenue) : null,
      netIncome: netIncome ? Math.round(netIncome) : null,
      peRatio: peRatio && peRatio > 0 ? Math.round(peRatio * 100) / 100 : null
    };
    
  } catch (error) {
    console.error(`❌ Failed to fetch fundamentals for ${symbol}:`, error);
    return {
      symbol,
      revenue: null,
      netIncome: null,
      peRatio: null
    };
  }
}

async function updateCompanyFundamentals(metrics: CompanyMetrics): Promise<boolean> {
  try {
    const updates: any = {};
    
    if (metrics.revenue !== null) {
      updates.revenue = metrics.revenue.toString();
    }
    
    if (metrics.netIncome !== null) {
      updates.netIncome = metrics.netIncome.toString();
    }
    
    if (metrics.peRatio !== null) {
      updates.peRatio = metrics.peRatio.toString();
    }
    
    if (Object.keys(updates).length === 0) {
      return false;
    }
    
    await db.update(companies)
      .set(updates)
      .where(eq(companies.symbol, metrics.symbol));
    
    console.log(`✅ Updated ${metrics.symbol}: Revenue=${metrics.revenue ? '$' + (metrics.revenue / 1e9).toFixed(1) + 'B' : 'N/A'}, Earnings=${metrics.netIncome ? '$' + (metrics.netIncome / 1e9).toFixed(1) + 'B' : 'N/A'}, P/E=${metrics.peRatio || 'N/A'}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to update ${metrics.symbol}:`, error);
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing missing fundamental data...');
  
  // Get companies missing fundamental data (including those with 0 values)
  const companiesNeedingFix = await db.select()
    .from(companies)
    .where(
      or(
        isNull(companies.revenue),
        isNull(companies.netIncome),
        isNull(companies.peRatio),
        eq(companies.revenue, '0'),
        eq(companies.netIncome, '0'),
        eq(companies.peRatio, '0.00')
      )
    )
    .orderBy(companies.rank);
  
  console.log(`📊 Found ${companiesNeedingFix.length} companies missing fundamental data`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < companiesNeedingFix.length; i++) {
    const company = companiesNeedingFix[i];
    console.log(`\n[${i + 1}/${companiesNeedingFix.length}] Processing ${company.symbol}...`);
    
    const metrics = await fetchCompanyFundamentals(company.symbol);
    const success = await updateCompanyFundamentals(metrics);
    
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Rate limiting - wait 200ms between requests
    if (i < companiesNeedingFix.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`\n🎉 Fundamental data fix complete!`);
  console.log(`✅ Successfully updated: ${successCount} companies`);
  console.log(`❌ Failed to update: ${failureCount} companies`);
  console.log(`📈 Success rate: ${((successCount / (successCount + failureCount)) * 100).toFixed(1)}%`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { fetchCompanyFundamentals, updateCompanyFundamentals };