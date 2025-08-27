/**
 * Nasdaq 100 Complete Data Enhancement Script
 * Fetches comprehensive financial data for all Nasdaq 100 companies
 * using Financial Modeling Prep API and populates missing data columns
 */

import { db } from "./db";
import { nasdaq100Companies } from "@shared/schema";
import { eq } from "drizzle-orm";

if (!process.env.FMP_API_KEY) {
  throw new Error('FMP_API_KEY environment variable is required');
}

const API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface CompanyProfile {
  symbol: string;
  companyName: string;
  marketCap: number;
  price: number;
  changes: number;
  changesPercentage: number;
  sector: string;
  industry: string;
  description: string;
  website: string;
}

interface IncomeStatement {
  revenue: number;
  netIncome: number;
}

interface Ratios {
  peRatio: number;
}

interface HistoricalPrice {
  date: string;
  close: number;
  adjClose: number;
}

async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  try {
    const response = await fetch(`${BASE_URL}/profile/${symbol}?apikey=${API_KEY}`);
    
    if (!response.ok) {
      console.log(`Profile API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data?.[0] || null;
  } catch (error) {
    console.error(`Error fetching profile for ${symbol}:`, error);
    return null;
  }
}

async function fetchIncomeStatement(symbol: string): Promise<IncomeStatement | null> {
  try {
    const response = await fetch(`${BASE_URL}/income-statement/${symbol}?limit=1&apikey=${API_KEY}`);
    
    if (!response.ok) {
      console.log(`Income statement API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data?.[0] || null;
  } catch (error) {
    console.error(`Error fetching income statement for ${symbol}:`, error);
    return null;
  }
}

async function fetchRatios(symbol: string): Promise<Ratios | null> {
  try {
    const response = await fetch(`${BASE_URL}/ratios/${symbol}?limit=1&apikey=${API_KEY}`);
    
    if (!response.ok) {
      console.log(`Ratios API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data?.[0] || null;
  } catch (error) {
    console.error(`Error fetching ratios for ${symbol}:`, error);
    return null;
  }
}

async function fetchHistoricalReturns(symbol: string): Promise<{
  return3Year: number | null;
  return5Year: number | null;
  return10Year: number | null;
  maxDrawdown10Year: number | null;
  returnDrawdownRatio10Year: number | null;
}> {
  try {
    // Get 11 years of data to calculate 10-year returns accurately
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 11 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await fetch(
      `${BASE_URL}/historical-price-full/${symbol}?from=${startDate}&to=${endDate}&apikey=${API_KEY}`
    );
    
    if (!response.ok) {
      console.log(`Historical data API error for ${symbol}: ${response.status}`);
      return { return3Year: null, return5Year: null, return10Year: null, maxDrawdown10Year: null, returnDrawdownRatio10Year: null };
    }

    const data = await response.json();
    const prices: HistoricalPrice[] = data?.historical || [];
    
    if (prices.length === 0) {
      return { return3Year: null, return5Year: null, return10Year: null, maxDrawdown10Year: null, returnDrawdownRatio10Year: null };
    }

    // Sort by date (newest first)
    prices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const currentPrice = prices[0]?.adjClose;
    if (!currentPrice) {
      return { return3Year: null, return5Year: null, return10Year: null, maxDrawdown10Year: null, returnDrawdownRatio10Year: null };
    }

    // Calculate returns
    const calculateReturn = (yearsBack: number) => {
      const targetDate = new Date(Date.now() - yearsBack * 365 * 24 * 60 * 60 * 1000);
      const historicalPrice = prices.find(price => 
        new Date(price.date) <= targetDate
      )?.adjClose;
      
      if (!historicalPrice) return null;
      
      const totalReturn = (currentPrice - historicalPrice) / historicalPrice;
      return (Math.pow(1 + totalReturn, 1 / yearsBack) - 1) * 100;
    };

    // Calculate maximum drawdown and AR/MDD ratio for 10-year period
    const calculateMaxDrawdown = () => {
      if (prices.length < 252 * 10) return { maxDrawdown: null, arMddRatio: null }; // Need ~10 years of data
      
      const tenYearPrices = prices.slice(0, Math.min(252 * 10, prices.length));
      let maxDrawdown = 0;
      let peak = tenYearPrices[tenYearPrices.length - 1].adjClose; // Start from oldest price
      
      // Calculate drawdown from oldest to newest
      for (let i = tenYearPrices.length - 2; i >= 0; i--) {
        const price = tenYearPrices[i].adjClose;
        if (price > peak) {
          peak = price;
        } else {
          const drawdown = (peak - price) / peak;
          maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
      }
      
      const return10Year = calculateReturn(10);
      const arMddRatio = (return10Year && maxDrawdown > 0) ? return10Year / (maxDrawdown * 100) : null;
      
      return {
        maxDrawdown: maxDrawdown > 0 ? maxDrawdown * 100 : null,
        arMddRatio
      };
    };

    const { maxDrawdown, arMddRatio } = calculateMaxDrawdown();

    return {
      return3Year: calculateReturn(3),
      return5Year: calculateReturn(5),
      return10Year: calculateReturn(10),
      maxDrawdown10Year: maxDrawdown,
      returnDrawdownRatio10Year: arMddRatio
    };
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return { return3Year: null, return5Year: null, return10Year: null, maxDrawdown10Year: null, returnDrawdownRatio10Year: null };
  }
}

async function enhanceCompanyData(symbol: string) {
  console.log(`Enhancing data for ${symbol}...`);
  
  try {
    // Fetch all data concurrently
    const [profile, income, ratios, returns] = await Promise.all([
      fetchCompanyProfile(symbol),
      fetchIncomeStatement(symbol),
      fetchRatios(symbol),
      fetchHistoricalReturns(symbol)
    ]);

    // Prepare update data
    const updateData: any = {};
    
    if (profile) {
      if (profile.marketCap) updateData.marketCap = profile.marketCap.toString();
      if (profile.price) updateData.price = profile.price.toString();
      if (profile.changes) updateData.dailyChange = profile.changes.toString();
      if (profile.changesPercentage) updateData.dailyChangePercent = profile.changesPercentage.toString();
      if (profile.sector) updateData.sector = profile.sector;
      if (profile.industry) updateData.industry = profile.industry;
      if (profile.description) updateData.description = profile.description;
      if (profile.website) updateData.website = profile.website;
    }

    if (income) {
      if (income.revenue) updateData.revenue = income.revenue.toString();
      if (income.netIncome) updateData.netIncome = income.netIncome.toString();
    }

    if (ratios && ratios.peRatio) {
      updateData.peRatio = ratios.peRatio.toString();
    }

    // Add historical returns data
    if (returns.return3Year !== null) updateData.return3Year = returns.return3Year.toString();
    if (returns.return5Year !== null) updateData.return5Year = returns.return5Year.toString();
    if (returns.return10Year !== null) updateData.return10Year = returns.return10Year.toString();
    if (returns.maxDrawdown10Year !== null) updateData.maxDrawdown10Year = returns.maxDrawdown10Year.toString();
    if (returns.returnDrawdownRatio10Year !== null) updateData.returnDrawdownRatio10Year = returns.returnDrawdownRatio10Year.toString();

    // Update database
    if (Object.keys(updateData).length > 0) {
      await db
        .update(nasdaq100Companies)
        .set(updateData)
        .where(eq(nasdaq100Companies.symbol, symbol));
      
      console.log(`✅ Enhanced ${symbol} with ${Object.keys(updateData).length} data points`);
    } else {
      console.log(`⚠️ No data available for ${symbol}`);
    }

  } catch (error) {
    console.error(`❌ Error enhancing ${symbol}:`, error);
  }
}

async function main() {
  console.log('🚀 Starting Nasdaq 100 comprehensive data enhancement...');
  
  try {
    // Get all Nasdaq 100 companies
    const companies = await db.select().from(nasdaq100Companies);
    console.log(`Found ${companies.length} Nasdaq 100 companies`);
    
    let processed = 0;
    const total = companies.length;
    
    for (const company of companies) {
      await enhanceCompanyData(company.symbol);
      processed++;
      
      console.log(`Progress: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
      
      // Rate limiting - wait 200ms between requests
      if (processed < total) {
        await delay(200);
      }
    }
    
    console.log('✅ Nasdaq 100 data enhancement completed successfully!');
    
    // Summary statistics
    const updatedCompanies = await db.select().from(nasdaq100Companies);
    const companiesWithRevenue = updatedCompanies.filter(c => c.revenue && c.revenue !== '0');
    const companiesWithEarnings = updatedCompanies.filter(c => c.netIncome && c.netIncome !== '0');
    const companiesWithReturns = updatedCompanies.filter(c => c.return10Year);
    const companiesWithPE = updatedCompanies.filter(c => c.peRatio && c.peRatio !== '0');
    
    console.log('\n📊 Enhancement Summary:');
    console.log(`Total companies: ${updatedCompanies.length}`);
    console.log(`Companies with revenue data: ${companiesWithRevenue.length} (${Math.round(companiesWithRevenue.length/updatedCompanies.length*100)}%)`);
    console.log(`Companies with earnings data: ${companiesWithEarnings.length} (${Math.round(companiesWithEarnings.length/updatedCompanies.length*100)}%)`);
    console.log(`Companies with P/E ratios: ${companiesWithPE.length} (${Math.round(companiesWithPE.length/updatedCompanies.length*100)}%)`);
    console.log(`Companies with return data: ${companiesWithReturns.length} (${Math.round(companiesWithReturns.length/updatedCompanies.length*100)}%)`);
    
  } catch (error) {
    console.error('❌ Enhancement failed:', error);
    process.exit(1);
  }
}

// Run the script
main().then(() => {
  console.log('\n🎉 Nasdaq 100 data enhancement completed!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { main as enhanceNasdaq100Data };