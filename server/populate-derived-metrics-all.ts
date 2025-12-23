#!/usr/bin/env tsx

/**
 * UNIVERSAL SCRIPT: Populate derived metrics (roic_stability, roic_stability_score, fcf_margin)
 * for ALL companies in ALL index tables
 * 
 * This ensures consistency across all companies - these metrics should be stored in DB
 * for all companies, not just new ones.
 * 
 * Usage: tsx server/populate-derived-metrics-all.ts
 * 
 * This script will:
 * 1. Calculate roic_stability and roic_stability_score from roic_10y_avg and roic_10y_std
 * 2. Calculate fcf_margin from latest_fcf and revenue
 * 3. Update all companies in: sp500_companies, nasdaq100_companies, dow_jones_companies, ftse100_companies
 */

import { supabase } from './db';

const TABLES = [
  'sp500_companies',
  'nasdaq100_companies',
  'dow_jones_companies',
  'ftse100_companies',
];

async function calculateAndUpdateDerivedMetrics(tableName: string) {
  console.log(`\n📊 Processing ${tableName}...`);
  
  try {
    // Fetch all companies with required data
    const { data: companies, error: fetchError } = await supabase
      .from(tableName)
      .select('symbol, roic_10y_avg, roic_10y_std, latest_fcf, revenue, free_cash_flow')
      .not('symbol', 'is', null);

    if (fetchError) {
      console.error(`❌ Error fetching companies from ${tableName}:`, fetchError);
      return { processed: 0, errors: 0 };
    }

    if (!companies || companies.length === 0) {
      console.log(`⚠️ No companies found in ${tableName}`);
      return { processed: 0, errors: 0 };
    }

    console.log(`   Found ${companies.length} companies`);

    let processed = 0;
    let errors = 0;

    for (const company of companies) {
      try {
        const updates: any = {};

        // Calculate ROIC Stability metrics
        const roic10YAvg = company.roic_10y_avg ? parseFloat(company.roic_10y_avg) : null;
        const roic10YStd = company.roic_10y_std ? parseFloat(company.roic_10y_std) : null;

        if (roic10YAvg !== null && roic10YStd !== null && isFinite(roic10YStd) && roic10YStd > 0) {
          const roicStability = roic10YAvg / roic10YStd;
          const cv = roic10YStd / roic10YAvg; // Coefficient of variation
          const roicStabilityScore = Math.max(0, Math.min(100, 100 * (1 - Math.min(cv, 1))));

          updates.roic_stability = roicStability.toFixed(4);
          updates.roic_stability_score = roicStabilityScore.toFixed(2);
        } else {
          updates.roic_stability = null;
          updates.roic_stability_score = null;
        }

        // Calculate FCF Margin
        const latestFcf = company.latest_fcf ? parseFloat(company.latest_fcf) : 
                         (company.free_cash_flow ? parseFloat(company.free_cash_flow) : null);
        const revenue = company.revenue ? parseFloat(company.revenue) : null;

        if (latestFcf !== null && revenue !== null && revenue > 0) {
          let fcfMargin = latestFcf / revenue;
          // Clamp to reasonable range
          if (fcfMargin > 2) fcfMargin = 2;
          if (fcfMargin < -2) fcfMargin = -2;
          updates.fcf_margin = fcfMargin.toFixed(4);
        } else {
          updates.fcf_margin = null;
        }

        // Update company
        const { error: updateError } = await supabase
          .from(tableName)
          .update(updates)
          .eq('symbol', company.symbol);

        if (updateError) {
          console.error(`   ❌ Error updating ${company.symbol}:`, updateError);
          errors++;
        } else {
          processed++;
          if (processed % 50 === 0) {
            console.log(`   ✅ Processed ${processed}/${companies.length} companies...`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${company.symbol}:`, error);
        errors++;
      }
    }

    console.log(`   ✅ Completed ${tableName}: ${processed} updated, ${errors} errors`);
    return { processed, errors };
  } catch (error) {
    console.error(`❌ Error processing ${tableName}:`, error);
    return { processed: 0, errors: 0 };
  }
}

async function main() {
  console.log('🚀 Starting population of derived metrics for ALL companies...\n');

  let totalProcessed = 0;
  let totalErrors = 0;

  for (const tableName of TABLES) {
    const result = await calculateAndUpdateDerivedMetrics(tableName);
    totalProcessed += result.processed;
    totalErrors += result.errors;
    // Small delay between tables
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n🎉 All done!`);
  console.log(`   Total processed: ${totalProcessed}`);
  console.log(`   Total errors: ${totalErrors}`);
}

// Export for use in API endpoints
export { calculateAndUpdateDerivedMetrics };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('populate-derived-metrics-all.ts')) {
  main().catch(console.error);
}

