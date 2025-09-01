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
    // We will now select ALL companies to re-evaluate their ratios and ensure correctness
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
      .from(table);

    if (companiesToUpdate.length === 0) {
        console.log(`🎉 No companies found in ${name}. Nothing to do.`);
        return;
    }

    console.log(
      `📊 Found ${companiesToUpdate.length} companies in ${name} to calculate AR/MDD Ratios for.`
    );

    for (const company of companiesToUpdate) {
        const calculateRatio = (retStr: string | null, mddStr: string | null): number | null => {
            // Ensure both values are not null and are valid numbers.
            if (retStr === null || mddStr === null) {
                return null;
            }

            const returnVal = parseFloat(retStr);
            const maxDrawdownVal = parseFloat(mddStr);

            // Ensure parsing was successful and maxDrawdown is a positive number to avoid division by zero or invalid logic.
            if (!isNaN(returnVal) && !isNaN(maxDrawdownVal) && maxDrawdownVal > 0) {
                return parseFloat((returnVal / maxDrawdownVal).toFixed(4));
            }
            
            return null;
        };
        
        const arMddRatio3Year = calculateRatio(company.return3Year, company.maxDrawdown3Year);
        const arMddRatio5Year = calculateRatio(company.return5Year, company.maxDrawdown5Year);
        const arMddRatio10Year = calculateRatio(company.return10Year, company.maxDrawdown10Year);

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
