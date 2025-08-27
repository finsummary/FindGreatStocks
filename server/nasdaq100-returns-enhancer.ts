import { db } from './db';
import { nasdaq100Companies } from '@shared/schema';
import { eq, or, isNull, sql } from 'drizzle-orm';
import { storage } from './storage'; // We might need some generic parts of storage

interface HistoricalPrice {
  date: string;
  close: number;
  adjClose: number;
}

interface CompanyReturns {
  symbol: string;
  return3Year: number | null;
  return5Year: number | null;
  return10Year: number | null;
}

class Nasdaq100ReturnsEnhancer {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('FMP_API_KEY environment variable is required');
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const url = `https://financialmodelingprep.com/api/v3${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${this.apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FMP API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return response.json();
  }

  private calculateAnnualizedReturn(startPrice: number, endPrice: number, years: number): number {
    if (startPrice <= 0 || endPrice <= 0 || years <= 0) return 0;
    return (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
  }

  async getCompanyReturns(symbol: string): Promise<CompanyReturns | null> {
    try {
      // Logic is identical to the original ReturnsEnhancer
      const today = new Date();
      const tenYearsAgo = new Date(today);
      tenYearsAgo.setFullYear(today.getFullYear() - 11); // Fetch 11 years to be safe
      const historicalData = await this.makeRequest(`/historical-price-full/${symbol}?from=${tenYearsAgo.toISOString().split('T')[0]}&to=${today.toISOString().split('T')[0]}`);
      
      if (!historicalData?.historical || !Array.isArray(historicalData.historical) || historicalData.historical.length === 0) {
        console.warn(`- No historical data for ${symbol}`);
        return null;
      }

      const prices: HistoricalPrice[] = historicalData.historical.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const currentPrice = prices[prices.length - 1]?.adjClose || prices[prices.length - 1]?.close;

      if (!currentPrice || currentPrice <= 0) return null;

      const findClosestPrice = (targetDate: Date): number | null => {
        return prices.reduce((closest, price) => {
            const priceDate = new Date(price.date);
            const diff = Math.abs(priceDate.getTime() - targetDate.getTime());
            if (diff < closest.minDiff) {
                return { minDiff: diff, price: price.adjClose || price.close };
            }
            return closest;
        }, { minDiff: Infinity, price: null as number | null }).price;
      };

      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(today.getFullYear() - 3);
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(today.getFullYear() - 5);
      const tenYearsAgoTarget = new Date();
      tenYearsAgoTarget.setFullYear(today.getFullYear() - 10);

      const price3YearsAgo = findClosestPrice(threeYearsAgo);
      const price5YearsAgo = findClosestPrice(fiveYearsAgo);
      const price10YearsAgo = findClosestPrice(tenYearsAgoTarget);

      const returns: CompanyReturns = {
        symbol,
        return3Year: price3YearsAgo ? this.calculateAnnualizedReturn(price3YearsAgo, currentPrice, 3) : null,
        return5Year: price5YearsAgo ? this.calculateAnnualizedReturn(price5YearsAgo, currentPrice, 5) : null,
        return10Year: price10YearsAgo ? this.calculateAnnualizedReturn(price10YearsAgo, currentPrice, 10) : null,
      };
      
      console.log(`✅ Calculated returns for ${returns.symbol}: 3Y=${returns.return3Year?.toFixed(2)}%, 5Y=${returns.return5Year?.toFixed(2)}%, 10Y=${returns.return10Year?.toFixed(2)}%`);
      return returns;

    } catch (error) {
      console.error(`Error fetching returns for ${symbol}:`, error);
      return null;
    }
  }

  async enhanceAll(): Promise<{ updated: number; errors: number }> {
    console.log("📈 Starting returns enhancement for all Nasdaq 100 companies...");
    // Fetch all companies from the nasdaq100 table that haven't been processed yet.
    const companiesToUpdate = await db.select()
        .from(nasdaq100Companies)
        .where(or(
            isNull(nasdaq100Companies.return10Year),
            eq(sql`(${nasdaq100Companies.return10Year})::text`, '')
        ));

    console.log(`📊 Found ${companiesToUpdate.length} Nasdaq 100 companies needing returns enhancement.`);

    let updated = 0;
    let errors = 0;
    
    for (const [index, company] of companiesToUpdate.entries()) {
        console.log(`[${index + 1}/${companiesToUpdate.length}] Processing ${company.symbol}...`);
        try {
            const returns = await this.getCompanyReturns(company.symbol);
            if (returns) {
                await db.update(nasdaq100Companies).set({
                    return3Year: returns.return3Year?.toFixed(2),
                    return5Year: returns.return5Year?.toFixed(2),
                    return10Year: returns.return10Year?.toFixed(2),
                }).where(eq(nasdaq100Companies.symbol, company.symbol));
                updated++;
            } else {
                errors++;
            }
        } catch (error) {
            errors++;
            console.error(`❌ Error processing ${company.symbol}:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
    }
    
    console.log(`\n🎉 Nasdaq 100 returns enhancement complete:`);
    console.log(`✅ Updated: ${updated} companies`);
    console.log(`❌ Errors: ${errors} companies`);
    return { updated, errors };
  }
}

export const nasdaq100ReturnsEnhancer = new Nasdaq100ReturnsEnhancer();

async function run() {
    await nasdaq100ReturnsEnhancer.enhanceAll();
    process.exit(0);
}

run().catch(err => {
    console.error("Failed to run Nasdaq 100 returns enhancement:", err);
    process.exit(1);
});
