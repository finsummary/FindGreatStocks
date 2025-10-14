#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config();

import { db } from "./db";
import { companies, nasdaq100Companies, dowJonesCompanies, sp500Companies } from "@shared/schema";
import { PgTable } from "drizzle-orm/pg-core";
import { eq, sql } from "drizzle-orm";

interface HistoricalPrice {
  date: string;
  close: number;
  adjClose: number;
}

interface DrawdownResult {
  symbol: string;
  maxDrawdown10Year: number | null;
}

class DrawdownEnhancer {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('FMP_API_KEY environment variable is required');
    }
  }

  private async makeRequest(endpoint: string, retries = 3, initialDelay = 5000): Promise<any> {
    const url = `https://financialmodelingprep.com/api/v3${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${this.apiKey}`;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 429 || response.status >= 500) {
                    const delay = initialDelay * Math.pow(2, i);
                    console.warn(`[WARN] Rate limit hit or server error. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                const errorText = await response.text();
                throw new Error(`FMP API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            return response.json();
        } catch (error) {
            if (i < retries - 1) {
                const delay = initialDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
  }

  // Calculate maximum drawdown from price series
  private calculateMaxDrawdown(prices: HistoricalPrice[]): number {
    if (prices.length < 2) return 0;
    
    let maxDrawdown = 0;
    let peak = prices[0].adjClose || prices[0].close;
    
    for (const price of prices) {
      const currentPrice = price.adjClose || price.close;
      
      // Update peak if current price is higher
      if (currentPrice > peak) {
        peak = currentPrice;
      }
      
      // Calculate drawdown from peak
      const drawdown = (peak - currentPrice) / peak;
      
      // Update max drawdown if current drawdown is larger
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown * 100; // Convert to percentage
  }

  // Get historical prices and calculate maximum drawdown
  async getCompanyDrawdowns(symbol: string): Promise<{ maxDrawdown3Year: number | null; maxDrawdown5Year: number | null; maxDrawdown10Year: number | null; }> {
    try {
      console.log(`Fetching historical data for drawdown calculation for ${symbol}...`);
      
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      const today = new Date();

      const historicalData = await this.makeRequest(`/historical-price-full/${symbol}?from=${tenYearsAgo.toISOString().split('T')[0]}&to=${today.toISOString().split('T')[0]}`);
      
      if (!historicalData?.historical || !Array.isArray(historicalData.historical) || historicalData.historical.length === 0) {
        console.log(`No historical data available for ${symbol}`);
        return { maxDrawdown3Year: null, maxDrawdown5Year: null, maxDrawdown10Year: null };
      }

      const prices: HistoricalPrice[] = historicalData.historical.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

      const earliestDataDate = new Date(prices[0].date);

      const prices10Year = prices;
      const prices5Year = earliestDataDate <= fiveYearsAgo ? prices.filter(p => new Date(p.date) >= fiveYearsAgo) : [];
      const prices3Year = earliestDataDate <= threeYearsAgo ? prices.filter(p => new Date(p.date) >= threeYearsAgo) : [];

      if (earliestDataDate > fiveYearsAgo) console.log(`- Skipping 5Y drawdown for ${symbol}: not enough data.`);
      if (earliestDataDate > threeYearsAgo) console.log(`- Skipping 3Y drawdown for ${symbol}: not enough data.`);

      const drawdowns = {
        maxDrawdown10Year: prices10Year.length > 1 ? this.calculateMaxDrawdown(prices10Year) : null,
        maxDrawdown5Year: prices5Year.length > 1 ? this.calculateMaxDrawdown(prices5Year) : null,
        maxDrawdown3Year: prices3Year.length > 1 ? this.calculateMaxDrawdown(prices3Year) : null,
      };

      console.log(`✅ Calculated drawdowns for ${symbol}: 3Y=${drawdowns.maxDrawdown3Year?.toFixed(1)}%, 5Y=${drawdowns.maxDrawdown5Year?.toFixed(1)}%, 10Y=${drawdowns.maxDrawdown10Year?.toFixed(1)}%`);
      return drawdowns;

    } catch (error) {
      console.error(`Error fetching drawdowns for ${symbol}:`, error);
      return { maxDrawdown3Year: null, maxDrawdown5Year: null, maxDrawdown10Year: null };
    }
  }

  // Enhance all companies with drawdown data
  async enhanceAllCompaniesDrawdown(): Promise<{ updated: number; errors: number }> {
    console.log("📉 Starting maximum drawdown enhancement for all S&P 500 companies...");
    
    try {
      // Get all companies from database
      const companies = await db.select({ symbol: companies.symbol }).from(companies); // Get all companies
      console.log(`📊 Calculating max drawdown for ${companies.length} companies`);
      
      let updated = 0;
      let errors = 0;
      
      // Process companies one by one
      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        
        try {
          console.log(`[${i + 1}/${companies.length}] Processing ${company.symbol}...`);
          
          const drawdowns = await this.getCompanyDrawdowns(company.symbol);
          
          if (drawdowns) {
            await db.update(companies).set({
              maxDrawdown10Year: drawdowns.maxDrawdown10Year?.toString(),
              maxDrawdown5Year: drawdowns.maxDrawdown5Year?.toString(),
              maxDrawdown3Year: drawdowns.maxDrawdown3Year?.toString(),
            }).where(eq(companies.symbol, company.symbol));
            updated++;
            console.log(`✅ [${i + 1}/${companies.length}] ${company.symbol}: Max Drawdown = ${drawdowns.maxDrawdown10Year?.toFixed(1)}%`);
          } else {
            errors++;
            console.log(`❌ [${i + 1}/${companies.length}] ${company.symbol}: No drawdown data available`);
          }
        } catch (error) {
          errors++;
          console.error(`❌ [${i + 1}/${companies.length}] Error processing ${company.symbol}:`, error);
        }
        
        // Rate limiting - 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Progress update every 25 companies
        if ((i + 1) % 25 === 0) {
          const progress = Math.round(((i + 1) / companies.length) * 100);
          console.log(`🚀 DRAWDOWN PROGRESS: ${progress}% complete (${updated} updated, ${errors} errors)`);
        }
      }
      
      console.log(`🎉 Drawdown enhancement complete:`);
      console.log(`✅ Updated: ${updated} companies`);
      console.log(`❌ Errors: ${errors} companies`);
      
      return { updated, errors };
      
    } catch (error) {
      console.error("Error enhancing drawdown data:", error);
      throw error;
    }
  }

  // Quick enhancement for specific symbols
  async enhanceSpecificCompaniesDrawdown(symbols: string[]): Promise<{ updated: number; errors: number }> {
    console.log(`📉 Enhancing drawdown data for specific companies: ${symbols.join(', ')}`);
    
    let updated = 0;
    let errors = 0;
    
    for (const symbol of symbols) {
      try {
        const drawdownResult = await this.getCompanyDrawdowns(symbol);
        
        if (drawdownResult) {
          await db.update(companies).set({
            maxDrawdown10Year: drawdownResult.maxDrawdown10Year?.toString(),
            maxDrawdown5Year: drawdownResult.maxDrawdown5Year?.toString(),
            maxDrawdown3Year: drawdownResult.maxDrawdown3Year?.toString(),
          }).where(eq(companies.symbol, symbol));
          updated++;
          console.log(`✅ Enhanced ${symbol} with max drawdowns: 3Y=${drawdownResult.maxDrawdown3Year?.toFixed(1)}%, 5Y=${drawdownResult.maxDrawdown5Year?.toFixed(1)}%, 10Y=${drawdownResult.maxDrawdown10Year?.toFixed(1)}%`);
        } else {
          errors++;
          console.log(`❌ Failed to enhance ${symbol}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error enhancing ${symbol}:`, error);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return { updated, errors };
  }
}

export async function enhanceAllDrawdowns(table: PgTable, name: string) {
    console.log(`📉 Starting drawdown enhancement for all ${name} companies...`);
    const drawdownEnhancer = new DrawdownEnhancer();
  
    try {
        const companiesToEnhance = await db.select({ symbol: table.symbol }).from(table).where(sql`${table.maxDrawdown10Year} is null`);
        
        if (companiesToEnhance.length === 0) {
            console.log(`🎉 All companies in ${name} already have drawdown data. Nothing to do.`);
            return;
        }

        console.log(`📊 Enhancing drawdown data for ${companiesToEnhance.length} companies in ${name}`);
    
        let updated = 0;
        let errors = 0;
    
        for (let i = 0; i < companiesToEnhance.length; i++) {
            const company = companiesToEnhance[i];
            console.log(`[${i + 1}/${companiesToEnhance.length}] Processing ${company.symbol} for ${name}...`);

            try {
                const drawdowns = await drawdownEnhancer.getCompanyDrawdowns(company.symbol);
                if (drawdowns) {
                    await db.update(table).set({
                        maxDrawdown3Year: drawdowns.maxDrawdown3Year,
                        maxDrawdown5Year: drawdowns.maxDrawdown5Year,
                        maxDrawdown10Year: drawdowns.maxDrawdown10Year,
                    }).where(eq(table.symbol, company.symbol));
                    updated++;
                } else {
                    errors++;
                }
            } catch (error) {
                errors++;
                console.error(`❌ Error processing ${company.symbol}:`, error);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 sec delay between companies
        }
    
        console.log(`🎉 ${name} drawdown enhancement complete: Updated ${updated}, Errors ${errors}`);
    
    } catch (error) {
        console.error(`Error enhancing drawdown data for ${name}:`, error);
        throw error;
    }
}

// Run if called directly
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const isMainModule = resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  (async () => {
    await enhanceAllDrawdowns(sp500Companies as any, "S&P 500");
    await enhanceAllDrawdowns(nasdaq100Companies as any, "Nasdaq 100");
    await enhanceAllDrawdowns(dowJonesCompanies as any, "Dow Jones");
    console.log("\nAll drawdown enhancements complete.");
    process.exit(0);
  })().catch(error => {
    console.error("Main drawdown execution failed:", error);
    process.exit(1);
  });
}