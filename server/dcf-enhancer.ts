#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from './db';
import { companies, nasdaq100Companies, dowJonesCompanies } from '@shared/schema';
import { makeRequest } from './fmp';
import { sql, eq, isNull, or, and, not } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

// --- Model Assumptions (fixed for v1 as per user request) ---
const DISCOUNT_RATE = 0.08; // r
const TERMINAL_GROWTH_RATE = 0.02; // tg
const PROJECTION_HORIZON_YEARS = 10; // N
const DEFAULT_FCF_GROWTH_RATE = 0.04; // g_default
const FCF_GROWTH_CLAMP_MIN = -0.05;
const FCF_GROWTH_CLAMP_MAX = 0.15;

// --- Interfaces for data fetching ---
interface FmpCashFlowStatement {
    date: string;
    operatingCashFlow: number;
    capitalExpenditure: number;
    freeCashFlow: number;
}

// --- Data Fetching Functions ---

async function getFcfHistory(symbol: string): Promise<number[] | null> {
    const data: FmpCashFlowStatement[] = await makeRequest(`/api/v3/cash-flow-statement/${symbol}?period=annual&limit=8`);
    if (!data || data.length === 0) {
        console.error(`[${symbol}] ❌ FCF history not found.`);
        return null;
    }
    // FMP returns in descending order (newest first), so we reverse for YoY calculation
    return data.map(item => item.freeCashFlow).reverse();
}

async function getSharesOutstanding(symbol: string): Promise<number | null> {
    const data = await makeRequest(`/api/v3/key-metrics-ttm/${symbol}`);
    if (data && data.length > 0 && data[0].sharesOutstandingTTM) {
        return data[0].sharesOutstandingTTM;
    }
    console.warn(`[${symbol}] ⚠️ Could not get TTM shares outstanding. Trying enterprise value...`);

    const enterpriseValueData = await makeRequest(`/api/v3/enterprise-values/${symbol}?limit=1`);
    if (enterpriseValueData && enterpriseValueData.length > 0 && enterpriseValueData[0].numberOfShares) {
        return enterpriseValueData[0].numberOfShares;
    }
    
    console.error(`[${symbol}] ❌ Shares outstanding not found.`);
    return null;
}

async function getLatestPrice(symbol: string): Promise<number | null> {
    // This function can be expanded with yfinance fallback if needed
    const data = await makeRequest(`/api/v3/historical-price-full/${symbol}?serietype=line`);
    if (data && data.historical && data.historical.length > 0) {
        return data.historical[0].close;
    }
    console.error(`[${symbol}] ❌ Latest price not found.`);
    return null;
}


// --- Main Enhancer Logic ---
async function enhanceDcfForTable(table: PgTable) {
    const tableName = table[Symbol.for('drizzle:BaseName')];
    console.log(`🚀 Starting DCF enhancement for ${tableName}...`);
    
    const companiesToUpdate = await db.select()
      .from(table)
      .where(
        or(
          isNull(table.dcfFairValue)
        )
      );

    console.log(`📊 Found ${companiesToUpdate.length} companies in ${tableName} to enhance.`);
    
    for (const company of companiesToUpdate) {
        if (!company.symbol) continue;
        
        console.log(`\n--- Processing ${company.symbol} ---`);
        
        const [fcfHistory, sharesOutstanding, price] = await Promise.all([
            getFcfHistory(company.symbol),
            getSharesOutstanding(company.symbol),
            getLatestPrice(company.symbol),
        ]);

        if (!fcfHistory || !sharesOutstanding || !price || fcfHistory.length === 0) {
            console.error(`[${company.symbol}] ❌ Missing essential data (FCF, Shares, or Price). Skipping DCF calculation.`);
            continue;
        }
        
        const growthRate = calculateFcfGrowthRate(fcfHistory);
        const fairValue = calculateDcfFairValue(fcfHistory[fcfHistory.length - 1], growthRate, sharesOutstanding);
        const marginOfSafety = calculateMarginOfSafety(fairValue, price);
        const impliedGrowth = calculateReverseDcfGrowth(price, fcfHistory[fcfHistory.length - 1], sharesOutstanding);

        const updates: { [key: string]: any } = {};
        if (fairValue !== null) {
            updates.dcfFairValue = fairValue.toFixed(2);
        }
        if (marginOfSafety !== null) {
            updates.marginOfSafety = marginOfSafety.toFixed(4);
        }
        if (impliedGrowth !== null) {
            updates.dcfImpliedGrowth = impliedGrowth.toFixed(4);
        }
        
        if (Object.keys(updates).length > 0) {
            console.log(`[${company.symbol}] 💾 Saving to DB:`, updates);
            await db.update(table).set(updates).where(eq(table.symbol, company.symbol));
        }
    }
}

// --- Calculation Helper Functions ---

function calculateFcfGrowthRate(fcfHistory: number[]): number {
    const recentFcf = fcfHistory.slice(-6); // Max 5 growth periods from last 6 years of data
    if (recentFcf.length < 2) {
        return DEFAULT_FCF_GROWTH_RATE;
    }

    const growthRates: number[] = [];
    for (let i = 1; i < recentFcf.length; i++) {
        const prevFcf = recentFcf[i - 1];
        const currentFcf = recentFcf[i];
        
        if (prevFcf > 0) {
            const growth = (currentFcf - prevFcf) / prevFcf;
            growthRates.push(growth);
        }
    }

    if (growthRates.length === 0) {
        return DEFAULT_FCF_GROWTH_RATE;
    }

    growthRates.sort((a, b) => a - b);
    const mid = Math.floor(growthRates.length / 2);
    const medianGrowth = growthRates.length % 2 !== 0
        ? growthRates[mid]
        : (growthRates[mid - 1] + growthRates[mid]) / 2;

    return Math.max(FCF_GROWTH_CLAMP_MIN, Math.min(FCF_GROWTH_CLAMP_MAX, medianGrowth));
}

function calculateDcfFairValue(
    latestFcf: number,
    growthRate: number,
    sharesOutstanding: number
): number | null {
    if (latestFcf <= 0 || sharesOutstanding <= 0 || DISCOUNT_RATE <= TERMINAL_GROWTH_RATE) {
        return null;
    }

    let totalPvFcf = 0;
    let lastProjectedFcf = 0;

    for (let t = 1; t <= PROJECTION_HORIZON_YEARS; t++) {
        const projectedFcf = latestFcf * Math.pow(1 + growthRate, t);
        totalPvFcf += projectedFcf / Math.pow(1 + DISCOUNT_RATE, t);
        if (t === PROJECTION_HORIZON_YEARS) {
            lastProjectedFcf = projectedFcf;
        }
    }

    const terminalValue = (lastProjectedFcf * (1 + TERMINAL_GROWTH_RATE)) / (DISCOUNT_RATE - TERMINAL_GROWTH_RATE);
    const pvTerminalValue = terminalValue / Math.pow(1 + DISCOUNT_RATE, PROJECTION_HORIZON_YEARS);
    
    const totalEnterpriseValue = totalPvFcf + pvTerminalValue;

    return totalEnterpriseValue / sharesOutstanding;
}

function calculateMarginOfSafety(fairValue: number | null, price: number): number | null {
    if (fairValue === null || fairValue <= 0 || price <= 0) {
        return null;
    }
    // Align definition: 1 - (Price / Fair Value), clamped to >= -1 (-100%)
    const mos = 1 - (price / fairValue);
    return isFinite(mos) ? Math.max(mos, -1) : null;
}

function calculateReverseDcfGrowth(
    targetPrice: number,
    latestFcf: number,
    sharesOutstanding: number
): number | null {
    if (targetPrice <= 0 || latestFcf <= 0 || sharesOutstanding <= 0) {
        return null;
    }

    let minGrowth = -0.50; 
    let maxGrowth = 1.00;
    let impliedGrowth = 0;
    const tolerance = 0.0001 * targetPrice;
    
    for (let i = 0; i < 100; i++) {
        impliedGrowth = (minGrowth + maxGrowth) / 2;
        const calculatedPrice = calculateDcfFairValue(latestFcf, impliedGrowth, sharesOutstanding);

        if (calculatedPrice === null) {
            maxGrowth = impliedGrowth; 
            continue;
        }

        if (Math.abs(calculatedPrice - targetPrice) < tolerance) {
            return impliedGrowth;
        }

        if (calculatedPrice > targetPrice) {
            maxGrowth = impliedGrowth;
        } else {
            minGrowth = impliedGrowth;
        }
    }
    
    console.warn(`Reverse DCF did not converge for price $${targetPrice}. Best guess: ${impliedGrowth}`);
    return impliedGrowth;
}


async function main() {
    const fmpFile = await import('./fmp');
    if (!fmpFile.makeRequest) {
        console.error("Fatal: `makeRequest` function not found. Please ensure `server/fmp.ts` exists and is correct.");
        return;
    }
    
    await enhanceDcfForTable(companies);
    await enhanceDcfForTable(nasdaq100Companies);
    await enhanceDcfForTable(dowJonesCompanies);
    
    console.log("\n✅ DCF enhancement process complete for all tables.");
}

main().catch(console.error).finally(() => {
    // process.exit(0);
});