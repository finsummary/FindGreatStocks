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
const DEFAULT_GROWTH_RATE = 0.04; // g_default (used if 10Y Revenue Growth is missing)
const GROWTH_CLAMP_MIN = -0.05;
const GROWTH_CLAMP_MAX = 0.15;

// --- Interfaces for data fetching ---
interface FmpCashFlowStatement {
    date: string;
    operatingCashFlow: number;
    capitalExpenditure: number;
    freeCashFlow: number;
}

interface FmpIncomeStatement {
    weightedAverageShsOut: number;
}

interface FmpPrice {
    historical: { close: number }[];
}


// --- Data Fetching Functions ---

async function getFcfHistory(symbol: string): Promise<number[] | null> {
    const data: FmpCashFlowStatement[] = await makeRequest(`/api/v3/cash-flow-statement/${symbol}?period=annual&limit=1`);
    if (!data || data.length === 0) {
        console.error(`[${symbol}] ❌ Latest FCF not found.`);
        return null;
    }
    return data.map(item => item.freeCashFlow);
}

async function getMarketCap(symbol: string): Promise<number | null> {
    const data = await makeRequest(`/api/v3/profile/${symbol}`);
    if (data && data.length > 0 && data[0].mktCap) {
        return data[0].mktCap;
    }
    console.error(`[${symbol}] ❌ Market Cap not found directly.`);
    
    // Fallback mechanism
    console.log(`[${symbol}] ⏳ Attempting fallback to calculate Market Cap manually...`);
    const [sharesData, priceData]: [FmpIncomeStatement[] | null, FmpPrice | null] = await Promise.all([
        makeRequest(`/api/v3/income-statement/${symbol}?period=annual&limit=1`),
        makeRequest(`/api/v3/historical-price-full/${symbol}?serietype=line&limit=1`)
    ]);

    const sharesOutstanding = sharesData?.[0]?.weightedAverageShsOut;
    const lastPrice = priceData?.historical?.[0]?.close;

    if (sharesOutstanding && lastPrice) {
        const calculatedMarketCap = sharesOutstanding * lastPrice;
        console.log(`[${symbol}] ✅ Fallback successful. Calculated Market Cap: ${calculatedMarketCap}`);
        return calculatedMarketCap;
    }
    
    console.error(`[${symbol}] ❌ Fallback failed. Missing shares outstanding or price.`);
    return null;
}

// --- Main Enhancer Logic ---
async function enhanceDcfForTable(table: PgTable) {
    const tableName = table[Symbol.for('drizzle:BaseName')];
    console.log(`🚀 Starting DCF enhancement for ${tableName}...`);
    
    // We will recalculate for ALL companies to ensure consistency with the new logic
    const companiesToUpdate = await db.select().from(table);

    console.log(`📊 Found ${companiesToUpdate.length} companies in ${tableName} to enhance.`);
    
    for (const company of companiesToUpdate) {
        if (!company.symbol) continue;
        
        console.log(`\n--- Processing ${company.symbol} ---`);
        
        const [fcfHistory, marketCap] = await Promise.all([
            getFcfHistory(company.symbol),
            getMarketCap(company.symbol),
        ]);

        if (!marketCap) {
            console.error(`[${company.symbol}] ❌ Market Cap could not be determined. Skipping DCF calculation.`);
            continue;
        }
        if (!fcfHistory || fcfHistory.length === 0) {
            console.error(`[${company.symbol}] ❌ FCF history not found. Skipping DCF calculation.`);
            continue;
        }
        if (fcfHistory[0] <= 0) {
            console.error(`[${company.symbol}] ❌ Latest FCF is zero or negative (${fcfHistory[0]}), not suitable for this DCF model. Skipping.`);
            continue;
        }

        const latestFcf = fcfHistory[0];
        // Use 10Y Revenue Growth if available, else default. Convert from percent string to decimal.
        const growthRateDecimal = company.revenueGrowth10Y ? parseFloat(company.revenueGrowth10Y) / 100 : DEFAULT_GROWTH_RATE;
        const cappedGrowth = Math.max(GROWTH_CLAMP_MIN, Math.min(GROWTH_CLAMP_MAX, growthRateDecimal));
        
        console.log(`[${company.symbol}] Using growth rate: ${cappedGrowth.toFixed(4)} (from 10Y Revenue Growth: ${company.revenueGrowth10Y}%)`);

        const enterpriseValue = calculateDcfEnterpriseValue(latestFcf, cappedGrowth);
        const marginOfSafety = calculateMarginOfSafety(enterpriseValue, marketCap);
        const impliedGrowth = calculateReverseDcfGrowth(marketCap, latestFcf);

        const updates: { [key: string]: any } = {
            dcfEnterpriseValue: null,
            marginOfSafety: null,
            dcfImpliedGrowth: null
        };

        if (enterpriseValue !== null) {
            updates.dcfEnterpriseValue = String(enterpriseValue.toFixed(0));
        }
        if (marginOfSafety !== null) {
            updates.marginOfSafety = marginOfSafety.toFixed(4);
        }
        if (impliedGrowth !== null) {
            updates.dcfImpliedGrowth = impliedGrowth.toFixed(4);
        }
        
        console.log(`[${company.symbol}] 💾 Saving to DB:`, updates);
        await db.update(table).set(updates).where(eq(table.symbol, company.symbol));
    }
}

// --- Calculation Helper Functions ---

function calculateDcfEnterpriseValue(
    latestFcf: number,
    growthRate: number,
): number | null {
    if (latestFcf <= 0 || DISCOUNT_RATE <= TERMINAL_GROWTH_RATE) {
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
    
    return totalPvFcf + pvTerminalValue;
}

function calculateMarginOfSafety(enterpriseValue: number | null, marketCap: number): number | null {
    if (enterpriseValue === null || enterpriseValue <= 0 || marketCap <= 0) {
        return null;
    }
    // New definition: 1 - (Market Cap / Enterprise Value), clamped to >= -1 (-100%)
    const mos = 1 - (marketCap / enterpriseValue);
    return isFinite(mos) ? Math.max(mos, -1) : null;
}

function calculateReverseDcfGrowth(
    targetMarketCap: number,
    latestFcf: number,
): number | null {
    if (targetMarketCap <= 0 || latestFcf <= 0) {
        return null;
    }

    let minGrowth = -0.50; 
    let maxGrowth = 1.00;
    let impliedGrowth = 0;
    const tolerance = 0.0001 * targetMarketCap;
    
    for (let i = 0; i < 100; i++) {
        impliedGrowth = (minGrowth + maxGrowth) / 2;
        const calculatedEnterpriseValue = calculateDcfEnterpriseValue(latestFcf, impliedGrowth);

        if (calculatedEnterpriseValue === null) {
            maxGrowth = impliedGrowth; 
            continue;
        }

        if (Math.abs(calculatedEnterpriseValue - targetMarketCap) < tolerance) {
            return impliedGrowth;
        }

        if (calculatedEnterpriseValue > targetMarketCap) {
            maxGrowth = impliedGrowth;
        } else {
            minGrowth = impliedGrowth;
        }
    }
    
    console.warn(`Reverse DCF did not converge for market cap ${targetMarketCap}. Best guess: ${impliedGrowth}`);
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
