import dotenv from 'dotenv';
dotenv.config();

import { storage } from './storage';
import { Company, companies } from '@shared/schema';
import { db } from './db';
import { eq, sql } from 'drizzle-orm';

class ArMddEnhancer {
  async enhanceAllCompanies() {
    try {
      console.log("🚀 Starting AR/MDD Ratio enhancement process for all companies...");
      
      const allCompanies = await storage.getCompaniesForEnhancement();
      
      console.log(`[INFO] Found ${allCompanies.length} companies to process.`);

      let updatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const company of allCompanies) {
        try {
          const ratios = this.calculateArMddRatios(company);

          if (ratios) {
            await db.update(companies)
              .set({
                arMddRatio10Year: ratios.ratio10Y?.toString(),
                arMddRatio5Year: ratios.ratio5Y?.toString(),
                arMddRatio3Year: ratios.ratio3Y?.toString(),
              })
              .where(eq(companies.symbol, company.symbol));

            console.log(`✅ [${updatedCount + 1}/${allCompanies.length}] Updated ${company.symbol}: 10Y=${ratios.ratio10Y}, 5Y=${ratios.ratio5Y}, 3Y=${ratios.ratio3Y}`);
            updatedCount++;
          } else {
            console.log(`⏭️ Skipping ${company.symbol}: Insufficient data.`);
            skippedCount++;
          }
        } catch (error) {
          console.error(`❌ Error processing ${company.symbol}:`, error);
          errorCount++;
        }
      }

      console.log("\n--- AR/MDD Ratio Enhancement Complete ---");
      console.log(`👍 Successfully updated: ${updatedCount}`);
      console.log(`⏭️ Skipped (insufficient data): ${skippedCount}`);
      console.log(`👎 Errors: ${errorCount}`);

    } catch (error) {
      console.error("❌ An unexpected error occurred during the AR/MDD enhancement process:", error);
    }
  }

  private calculateArMddRatios(company: Pick<Company, 'return3Year' | 'return5Year' | 'return10Year' | 'maxDrawdown3Year' | 'maxDrawdown5Year' | 'maxDrawdown10Year'>): { ratio10Y: number | null, ratio5Y: number | null, ratio3Y: number | null } | null {
    const return10y = company.return10Year ? parseFloat(company.return10Year) : null;
    const return5y = company.return5Year ? parseFloat(company.return5Year) : null;
    const return3y = company.return3Year ? parseFloat(company.return3Year) : null;
    const maxDrawdown10y = company.maxDrawdown10Year ? parseFloat(company.maxDrawdown10Year) : null;
    const maxDrawdown5y = company.maxDrawdown5Year ? parseFloat(company.maxDrawdown5Year) : null;
    const maxDrawdown3y = company.maxDrawdown3Year ? parseFloat(company.maxDrawdown3Year) : null;

    const calculateRatio = (annualizedReturn: number | null, maxDrawdown: number | null): number | null => {
      if (annualizedReturn === null || maxDrawdown === null || maxDrawdown === 0) {
        return null;
      }
      return parseFloat((annualizedReturn / maxDrawdown).toFixed(4));
    };

    const ratio10Y = calculateRatio(return10y, maxDrawdown10y);
    const ratio5Y = calculateRatio(return5y, maxDrawdown5y);
    const ratio3Y = calculateRatio(return3y, maxDrawdown3y);

    if (ratio10Y === null && ratio5Y === null && ratio3Y === null) {
      return null;
    }

    return { ratio10Y, ratio5Y, ratio3Y };
  }
}

const arMddEnhancer = new ArMddEnhancer();
arMddEnhancer.enhanceAllCompanies()
  .then(() => {
    console.log("AR/MDD enhancer script finished.");
    process.exit(0);
  })
  .catch(error => {
    console.error("AR/MDD enhancer script failed:", error);
    process.exit(1);
  });
