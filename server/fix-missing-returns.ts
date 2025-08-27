import { db } from "./db";
import { ftse100Companies } from "@shared/schema";
import { eq } from "drizzle-orm";

const FMP_API_KEY = process.env.FMP_API_KEY;

if (!FMP_API_KEY) {
  throw new Error("FMP_API_KEY environment variable is required");
}

async function fetchHistoricalData(symbol: string, years: number) {
  const baseSymbol = symbol.replace('.L', '');
  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${baseSymbol}?from=${new Date(Date.now() - years * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}&apikey=${FMP_API_KEY}`;
  
  console.log(`Fetching historical data for ${symbol} (${years} years)...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`HTTP ${response.status} for ${symbol}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.historical || data.historical.length === 0) {
      console.log(`No historical data available for ${symbol}`);
      return null;
    }
    
    return data.historical;
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
}

function calculateAnnualizedReturn(startPrice: number, endPrice: number, years: number): number {
  return Math.pow(endPrice / startPrice, 1 / years) - 1;
}

function calculateMaxDrawdown(prices: number[]): number {
  let maxDrawdown = 0;
  let peak = prices[0];
  
  for (const price of prices) {
    if (price > peak) {
      peak = price;
    }
    
    const drawdown = (peak - price) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

async function fixMissingReturnsData() {
  const missingDataCompanies = await db
    .select()
    .from(ftse100Companies)
    .where(eq(ftse100Companies.return3Year, null));

  console.log(`Found ${missingDataCompanies.length} companies with missing returns data`);

  for (const company of missingDataCompanies) {
    console.log(`Processing ${company.symbol} - ${company.name}`);
    
    // Fetch 10-year data
    const historical10Y = await fetchHistoricalData(company.symbol, 10);
    if (historical10Y && historical10Y.length >= 252 * 3) { // At least 3 years of data
      const sortedData = historical10Y.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const prices = sortedData.map((d: any) => d.close);
      
      const currentPrice = prices[prices.length - 1];
      
      // Calculate returns
      const return3Year = prices.length >= 252 * 3 ? calculateAnnualizedReturn(prices[prices.length - 252 * 3], currentPrice, 3) : null;
      const return5Year = prices.length >= 252 * 5 ? calculateAnnualizedReturn(prices[prices.length - 252 * 5], currentPrice, 5) : null;
      const return10Year = prices.length >= 252 * 10 ? calculateAnnualizedReturn(prices[prices.length - 252 * 10], currentPrice, 10) : null;
      
      // Calculate max drawdowns
      const maxDrawdown3Year = prices.length >= 252 * 3 ? calculateMaxDrawdown(prices.slice(-252 * 3)) : null;
      const maxDrawdown5Year = prices.length >= 252 * 5 ? calculateMaxDrawdown(prices.slice(-252 * 5)) : null;
      const maxDrawdown10Year = calculateMaxDrawdown(prices);
      
      // Calculate AR/MDD ratio
      const returnDrawdownRatio10Year = return10Year && maxDrawdown10Year ? return10Year / maxDrawdown10Year : null;
      
      // Update database
      await db
        .update(ftse100Companies)
        .set({
          return3Year: return3Year?.toString(),
          return5Year: return5Year?.toString(),
          return10Year: return10Year?.toString(),
          maxDrawdown3Year: maxDrawdown3Year?.toString(),
          maxDrawdown5Year: maxDrawdown5Year?.toString(),
          maxDrawdown10Year: maxDrawdown10Year?.toString(),
          returnDrawdownRatio10Year: returnDrawdownRatio10Year?.toString(),
        })
        .where(eq(ftse100Companies.id, company.id));
      
      console.log(`✓ Updated ${company.symbol} with returns data`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } else {
      console.log(`⚠ Insufficient data for ${company.symbol}`);
    }
  }
  
  console.log('Returns data enhancement completed');
}

// Run if called directly
fixMissingReturnsData().catch(console.error);

export { fixMissingReturnsData };