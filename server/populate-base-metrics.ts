#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from "./db";
import { companies, nasdaq100Companies, dowJonesCompanies, type InsertCompany } from "@shared/schema";
import { eq, isNull, PgTable } from "drizzle-orm";

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const FMP_API_KEY = process.env.FMP_API_KEY;

interface CompanyProfile {
    symbol: string; price: number; beta: number; volAvg: number; mktCap: number; lastDiv: number; range: string; changes: number; companyName: string; currency: string; cik: string; isin: string; cusip: string; exchange: string; exchangeShortName: string; industry: string; website: string; description: string; ceo: string; sector: string; country: string; fullTimeEmployees: string; phone: string; address: string; city: string; state: string; zip: string; dcfDiff: number; dcf: number; image: string; ipoDate: string; defaultImage: boolean; isEtf: boolean; isActivelyTrading: boolean; isAdr: boolean; isFund: boolean;
}
interface KeyMetrics {
    peRatioTTM: number; priceToSalesRatioTTM: number; netProfitMarginTTM: number; returnOnEquityTTM: number; returnOnAssetsTTM: number; debtToEquityTTM: number;
}
interface IncomeStatement {
    eps: number;
}

class BaseMetricsPopulator {
    private async makeRequest<T>(endpoint: string, retries = 3, delay = 5000): Promise<T | null> {
        for (let i = 0; i < retries; i++) {
            try {
                const url = `${FMP_BASE_URL}${endpoint}?apikey=${FMP_API_KEY}`;
                const response = await fetch(url);
                if (!response.ok) {
                    if (response.status === 429 || response.status >= 500) {
                        const wait = delay * Math.pow(2, i);
                        console.warn(`[WARN] Rate limit/server error for ${endpoint}. Retrying in ${wait / 1000}s...`);
                        await new Promise(resolve => setTimeout(resolve, wait));
                        continue;
                    }
                    return null;
                }
                return await response.json() as T;
            } catch (error) {
                if (i < retries - 1) continue;
                return null;
            }
        }
        return null;
    }

    async populate(table: PgTable, name: string) {
        console.log(`🚀 Starting base metrics population for ${name}...`);
        const companiesToUpdate = await db.select({ symbol: table.symbol }).from(table).where(isNull(table.peRatio));
        
        if (companiesToUpdate.length === 0) {
            console.log(`🎉 All companies in ${name} already have base metrics. Nothing to do.`);
            return;
        }
        console.log(`📊 Found ${companiesToUpdate.length} companies in ${name} to populate.`);

        for (const [index, company] of companiesToUpdate.entries()) {
            const symbol = company.symbol;
            console.log(`[${index + 1}/${companiesToUpdate.length}] Processing ${symbol}...`);

            try {
                // Fetch data sequentially to avoid hitting rate limits too hard
                const profile = await this.makeRequest<CompanyProfile[]>(`/profile/${symbol}`);
                
                const keyMetrics = await this.makeRequest<KeyMetrics[]>(`/key-metrics-ttm/${symbol}`);

                const incomeStatement = await this.makeRequest<IncomeStatement[]>(`/income-statement/${symbol}?limit=1`);

                const p = profile?.[0];
                const km = keyMetrics?.[0];
                const is = incomeStatement?.[0];

                if (!p) {
                    console.warn(`- Skipping ${symbol}: No profile data.`);
                    continue;
                }

                const price = p.price || 0;
                const changes = p.changes || 0;
                const previousPrice = price - changes;
                const dailyChangePercent = previousPrice !== 0 ? (changes / previousPrice) * 100 : 0;
                const lastDiv = p.lastDiv || 0;
                const calculatedDividendYield = price > 0 ? (lastDiv / price) * 100 : 0;

                const companyData: Partial<InsertCompany> = {
                    marketCap: Math.round(p.mktCap || 0).toString(),
                    price: price.toFixed(2),
                    dailyChange: changes.toString(),
                    dailyChangePercent: dailyChangePercent.toFixed(4),
                    logoUrl: p.image && !p.defaultImage ? p.image : undefined,
                    website: p.website || undefined,
                    description: p.description || undefined,
                    ceo: p.ceo || undefined,
                    employees: p.fullTimeEmployees ? parseInt(p.fullTimeEmployees, 10) : undefined,
                    country: p.country || undefined,
                    peRatio: km?.peRatioTTM?.toString(),
                    eps: is?.eps?.toString(),
                    beta: p.beta?.toString(),
                    dividendYield: calculatedDividendYield.toFixed(4),
                    priceToSalesRatio: km?.priceToSalesRatioTTM?.toString(),
                    netProfitMargin: km?.netProfitMarginTTM?.toString(),
                    returnOnEquity: km?.returnOnEquityTTM?.toString(),
                    returnOnAssets: km?.returnOnAssetsTTM?.toString(),
                    debtToEquity: km?.debtToEquityTTM?.toString(),
                    volume: p.volAvg?.toString(),
                    avgVolume: p.volAvg?.toString(),
                    yearLow: p.range ? p.range.split('-')[0]?.trim() : undefined,
                    yearHigh: p.range ? p.range.split('-')[1]?.trim() : undefined,
                };

                await db.update(table).set(companyData).where(eq(table.symbol, symbol));
                console.log(`✅ Populated ${symbol}`);

            } catch (error) {
                console.error(`❌ Failed to process ${symbol}:`, error);
            }
        }
    }
}

async function main() {
    const populator = new BaseMetricsPopulator();
    await populator.populate(companies, "S&P 500");
    await populator.populate(nasdaq100Companies, "Nasdaq 100");
    await populator.populate(dowJonesCompanies, "Dow Jones");
    console.log("\nAll base metrics population complete.");
}

main().catch(error => {
    console.error("Base metrics population script failed:", error);
    process.exit(1);
});
