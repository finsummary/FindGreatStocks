import { db } from './db';
import { nasdaq100Companies } from '@shared/schema';
import { eq, isNotNull, and, or, isNull, sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

// This script is a direct adaptation of the S&P 500 drawdown-enhancer.ts

interface HistoricalPrice {
  date: string;
  adjClose: number;
}

class Nasdaq100DrawdownEnhancer {
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

  calculateMaxDrawdown(prices: number[]): number {
    let maxDrawdown = 0;
    let peak = -Infinity;
    for (const price of prices) {
      if (price > peak) {
        peak = price;
      }
      const drawdown = ((peak - price) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    return maxDrawdown;
  }

  async enhanceCompany(symbol: string): Promise<void> {
    const today = new Date();
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(today.getFullYear() - 11); // Fetch 11 years to be safe

    const data = await this.makeRequest(`/historical-price-full/${symbol}?from=${tenYearsAgo.toISOString().split('T')[0]}`);
    if (!data?.historical) {
      console.warn(`- No historical data for ${symbol}`);
      return;
    }

    const prices: HistoricalPrice[] = data.historical.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const getDateYearsAgo = (years: number) => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - years);
        return date;
    };

    const prices10Year = prices.filter(p => new Date(p.date) >= getDateYearsAgo(10)).map(p => p.adjClose);
    const prices5Year = prices.filter(p => new Date(p.date) >= getDateYearsAgo(5)).map(p => p.adjClose);
    const prices3Year = prices.filter(p => new Date(p.date) >= getDateYearsAgo(3)).map(p => p.adjClose);

    const maxDrawdown10Year = this.calculateMaxDrawdown(prices10Year);
    const maxDrawdown5Year = this.calculateMaxDrawdown(prices5Year);
    const maxDrawdown3Year = this.calculateMaxDrawdown(prices3Year);

    await db.update(nasdaq100Companies).set({
        maxDrawdown10Year: maxDrawdown10Year.toFixed(2),
        maxDrawdown5Year: maxDrawdown5Year.toFixed(2),
        maxDrawdown3Year: maxDrawdown3Year.toFixed(2),
    }).where(eq(nasdaq100Companies.symbol, symbol));
    
    console.log(`✅ Calculated drawdowns for ${symbol}: 3Y=${maxDrawdown3Year.toFixed(2)}%, 5Y=${maxDrawdown5Year.toFixed(2)}%, 10Y=${maxDrawdown10Year.toFixed(2)}%`);
  }

  async enhanceAll(): Promise<{ updated: number; errors: number }> {
    console.log("📉 Starting drawdown enhancement for all Nasdaq 100 companies...");
    const companiesToUpdate = await db.select({ symbol: nasdaq100Companies.symbol })
      .from(nasdaq100Companies)
      .where(and(
        isNotNull(nasdaq100Companies.return10Year), // Ensure returns are calculated first
        or(
            isNull(nasdaq100Companies.maxDrawdown10Year),
            eq(sql`(${nasdaq100Companies.maxDrawdown10Year})::text`, '')
        )
      ));
    
    console.log(`📊 Found ${companiesToUpdate.length} companies needing drawdown enhancement.`);

    let updated = 0;
    let errors = 0;

    for (const [index, company] of companiesToUpdate.entries()) {
        console.log(`[${index + 1}/${companiesToUpdate.length}] Processing ${company.symbol}...`);
        try {
            await this.enhanceCompany(company.symbol);
            updated++;
        } catch (error) {
            console.error(`❌ Error processing ${company.symbol}:`, error);
            errors++;
        }
        await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
    }

    console.log(`\n🎉 Nasdaq 100 drawdown enhancement complete:`);
    console.log(`✅ Updated: ${updated} companies`);
    console.log(`❌ Errors: ${errors} companies`);
    return { updated, errors };
  }
}

async function run() {
    const enhancer = new Nasdaq100DrawdownEnhancer();
    await enhancer.enhanceAll();
    process.exit(0);
}

run().catch(err => {
    console.error("Failed to run Nasdaq 100 drawdown enhancement:", err);
    process.exit(1);
});
