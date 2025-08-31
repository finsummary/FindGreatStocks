import dotenv from 'dotenv';
dotenv.config();

import { db } from "./db";
import { companies, nasdaq100Companies, dowJonesCompanies } from "@shared/schema";
import { PgTable } from "drizzle-orm/pg-core";
import { eq, isNotNull, and, or, sql } from "drizzle-orm";

async function calculateAndStoreArMddRatiosForTable(
  table: PgTable,
  name: string
) {
  console.log(`🚀 Calculating AR/MDD Ratios for ${name}...`);

  try {
    // Select companies that have the necessary return and drawdown data, but AR/MDD is not yet calculated
    const companiesToUpdate = await db
      .select({
        symbol: table.symbol,
        return3Year: table.return3Year,
        return5Year: table.return5Year,
        return10Year: table.return10Year,
        maxDrawdown3Year: table.maxDrawdown3Year,
        maxDrawdown5Year: table.maxDrawdown5Year,
        maxDrawdown10Year: table.maxDrawdown10Year,
      })
      .from(table)
      .where(
          and(
              or(
                  isNotNull(table.return3Year),
                  isNotNull(table.return5Year),
                  isNotNull(table.return10Year)
              ),
              sql`${table.arMddRatio3Year} is null`
          )
      );

    if (companiesToUpdate.length === 0) {
        console.log(`🎉 All companies in ${name} already have AR/MDD Ratios calculated. Nothing to do.`);
        return;
    }

    console.log(
      `📊 Found ${companiesToUpdate.length} companies in ${name} to calculate AR/MDD Ratios for.`
    );

    for (const company of companiesToUpdate) {
            const parseAndCalculate = (ret: string | null, mdd: string | null): number | null => {
                const returnVal = parseFloat(ret || '0');
                const maxDrawdownVal = parseFloat(mdd || '0');
                if (!isNaN(returnVal) && !isNaN(maxDrawdownVal) && maxDrawdownVal > 0) {
                    return parseFloat((returnVal / maxDrawdownVal).toFixed(4));
                }
                return null;
            };
            
            const arMddRatio3Year = parseAndCalculate(company.return3Year, company.maxDrawdown3Year);
            const arMddRatio5Year = parseAndCalculate(company.return5Year, company.maxDrawdown5Year);
            const arMddRatio10Year = parseAndCalculate(company.return10Year, company.maxDrawdown10Year);

            const updates = {
                arMddRatio3Year: arMddRatio3Year,
                arMddRatio5Year: arMddRatio5Year,
                arMddRatio10Year: arMddRatio10Year,
            };

            await db.update(table).set(updates).where(eq(table.symbol, company.symbol));
        }

        console.log(
          `✅ Successfully calculated and stored AR/MDD Ratios for ${companiesToUpdate.length} companies in ${name}.`
        );

    } catch (error) {
        console.error(`❌ Error calculating AR/MDD Ratios for ${name}:`, error);
    }
}

async function main() {
    await calculateAndStoreArMddRatiosForTable(companies, "S&P 500");
    await calculateAndStoreArMddRatiosForTable(nasdaq100Companies, "Nasdaq 100");
    await calculateAndStoreArMddRatiosForTable(dowJonesCompanies, "Dow Jones");
    console.log("\nAll AR/MDD Ratio calculations complete.");
    process.exit(0);
}

main().catch(err => {
    console.error("Fatal error during AR/MDD calculation:", err);
    process.exit(1);
});
