import 'dotenv/config';
import { db } from './db';
import { companies, nasdaq100Companies, dowJonesCompanies, sp500Companies } from '@shared/schema';
import { makeRequest } from './fmp';
import { sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

async function enhanceDupontForTable(table: PgTable) {
  const tableName = table[Symbol.for('drizzle:BaseName')];
  console.log(`\n--- Starting DuPont & ROE enhancement for ${tableName} ---`);

  const companiesToUpdate = await db
    .select({
      id: table.id,
      symbol: table.symbol,
      revenue: table.revenue,
      netIncome: table.netIncome,
    })
    .from(table);

  console.log(`Found ${companiesToUpdate.length} companies to process in ${tableName}.`);

  for (const company of companiesToUpdate) {
    try {
      console.log(`Fetching balance sheet for ${company.symbol}...`);
      const balanceSheetData = await makeRequest(`/api/v3/balance-sheet-statement/${company.symbol}?period=annual&limit=1`);
      
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!balanceSheetData || balanceSheetData.length === 0) {
        console.log(`No balance sheet data for ${company.symbol}. Skipping.`);
        continue;
      }

      const latestReport = balanceSheetData[0];
      const totalAssets = latestReport.totalAssets;
      const totalEquity = latestReport.totalStockholdersEquity;

      if (totalAssets === undefined || totalEquity === undefined || totalAssets === 0) {
        console.log(`Missing or zero Total Assets for ${company.symbol}. Skipping.`);
        continue;
      }
      
      const revenue = Number(company.revenue);
      const netIncome = Number(company.netIncome);

      if (isNaN(revenue) || isNaN(netIncome)) {
          console.log(`Invalid base data (Revenue or NetIncome) for ${company.symbol}. Skipping.`);
          continue;
      }
      
      let roe = null;
      let financialLeverage = null;
      const assetTurnover = revenue / totalAssets;

      if (totalEquity > 0) {
        roe = netIncome / totalEquity;
        financialLeverage = totalAssets / totalEquity;
      } else {
        console.log(`Negative or zero equity for ${company.symbol}. ROE and Financial Leverage will be null.`);
      }

      console.log(`Updating ${company.symbol}: ROE=${roe?.toFixed(4)}, AT=${assetTurnover.toFixed(4)}, FL=${financialLeverage?.toFixed(4)}`);

      await db
        .update(table)
        .set({
          totalAssets: totalAssets,
          totalEquity: totalEquity,
          assetTurnover: assetTurnover.toFixed(4),
          financialLeverage: financialLeverage ? financialLeverage.toFixed(4) : null,
          roe: roe ? roe.toFixed(4) : null,
        })
        .where(sql`id = ${company.id}`);

    } catch (error) {
      console.error(`Error processing ${company.symbol}:`, error);
    }
  }

  console.log(`--- Finished DuPont & ROE enhancement for ${tableName} ---`);
}

async function main() {
  await enhanceDupontForTable(sp500Companies);
  await enhanceDupontForTable(nasdaq100Companies);
  await enhanceDupontForTable(dowJonesCompanies);
}

main().catch(console.error);
