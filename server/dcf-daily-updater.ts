import { eq } from "drizzle-orm";
import { db, supabase } from "./db";
import * as schema from "../shared/schema";
import { PgTable } from "drizzle-orm/pg-core";

// Constants from populate-dcf-v2.ts
const DISCOUNT_RATE = 0.10; // 10% discount rate
const TERMINAL_GROWTH_RATE = 0.025; // 2.5% terminal growth rate
const PROJECTION_HORIZON_YEARS = 10;
const FCF_GROWTH_CLAMP_MIN = -0.05; // -5%
const FCF_GROWTH_CLAMP_MAX = 0.20; // 20%

/**
 * Updates DCF-related metrics for a single company based on its latest market cap.
 * @param table - The Drizzle schema table (e.g., schema.dowJonesCompanies)
 * @param symbol - The company's stock symbol.
 * @param marketCap - The new market capitalization.
 */
export async function updateDcfMetricsForCompany(table: PgTable<any>, symbol: string, marketCap: number) {
    if (!marketCap || marketCap <= 0) {
        console.log(`[${symbol}] Invalid market cap (${marketCap}). Skipping DCF update.`);
        return;
    }

    // Determine table name based on the table parameter
    let tableName = 'companies';
    if (table === schema.sp500Companies) tableName = 'sp500_companies';
    else if (table === schema.nasdaq100Companies) tableName = 'nasdaq100_companies';
    else if (table === schema.dowJonesCompanies) tableName = 'dow_jones_companies';

    const { data: company, error } = await supabase
        .from(tableName)
        .select('latest_fcf, revenue_growth_10y')
        .eq('symbol', symbol)
        .limit(1);

    if (error || !company || company.length === 0) {
        console.log(`[${symbol}] Error fetching company data: ${error?.message || 'No data found'}. Skipping DCF update.`);
        return;
    }

    const companyData = company[0];
    if (!companyData.latest_fcf || companyData.latest_fcf <= 0 || companyData.revenue_growth_10y === null) {
        console.log(`[${symbol}] Missing required data (FCF, 10Y Revenue Growth) for DCF calculation. Skipping.`);
        return;
    }
    const latestFcf = Number(companyData.latest_fcf);
    const revenueGrowth10Y = Number(companyData.revenue_growth_10y);

    // Use 10-year revenue growth as a proxy for FCF growth, capped at a reasonable range.
    const baseGrowth = revenueGrowth10Y / 100;
    const cappedGrowth = Math.max(FCF_GROWTH_CLAMP_MIN, Math.min(FCF_GROWTH_CLAMP_MAX, baseGrowth));

    const enterpriseValue = calculateDcfEnterpriseValue(latestFcf, cappedGrowth);
    const marginOfSafety = calculateMarginOfSafety(enterpriseValue, marketCap);
    const impliedGrowth = calculateReverseDcfGrowth(marketCap, latestFcf);

    const updates: any = {
        dcfEnterpriseValue: enterpriseValue !== null ? String(enterpriseValue.toFixed(0)) : null,
        marginOfSafety: marginOfSafety !== null ? marginOfSafety.toFixed(4) : null,
        dcfImpliedGrowth: impliedGrowth !== null ? impliedGrowth.toFixed(4) : null,
    };

    try {
        const { error: updateError } = await supabase
            .from(tableName)
            .update(updates)
            .eq('symbol', symbol);
        
        if (updateError) {
            console.error(`[${symbol}] ❌ Failed to update DCF metrics in DB:`, updateError);
        } else {
            console.log(`[${symbol}] ✅ Successfully updated DCF metrics. MoS: ${updates.marginOfSafety}`);
        }
    } catch (error) {
        console.error(`[${symbol}] ❌ Failed to update DCF metrics in DB:`, error);
    }
}

// --- Calculation Helper Functions (adapted from populate-dcf-v2.ts) ---

function calculateDcfEnterpriseValue(latestFcf: number, growthRate: number): number | null {
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
    if (enterpriseValue === null || enterpriseValue <= 0) {
        return null;
    }
    return (enterpriseValue - marketCap) / enterpriseValue;
}

function calculateReverseDcfGrowth(marketCap: number, latestFcf: number): number | null {
    if (marketCap <= 0 || latestFcf <= 0) {
        return null;
    }

    // Simplified iterative approach to find the growth rate
    let low = -1.0;
    let high = 2.0; 
    let mid, calculatedEv;

    for (let i = 0; i < 100; i++) { // 100 iterations for precision
        mid = (low + high) / 2;
        calculatedEv = calculateDcfEnterpriseValue(latestFcf, mid);
        
        if (calculatedEv === null || calculatedEv < marketCap) {
            low = mid;
        } else {
            high = mid;
        }
    }

    // Return the implied growth rate if it's within a reasonable range
    const impliedGrowth = (low + high) / 2;
    return isFinite(impliedGrowth) ? impliedGrowth : null;
}
