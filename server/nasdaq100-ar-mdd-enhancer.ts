import { db } from './db';
import { nasdaq100Companies } from '@shared/schema';
import { eq, or, isNull, sql, and, isNotNull } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

// This script is a direct adaptation of the S&P 500 ar-mdd-enhancer.ts

class Nasdaq100ArMddEnhancer {

  private calculateArMddRatio(annualizedReturn: number | null, maxDrawdown: number | null): number | null {
    if (annualizedReturn === null || maxDrawdown === null || maxDrawdown <= 0) {
      return null;
    }
    // maxDrawdown is already a percentage, so no need to multiply by 100
    return annualizedReturn / maxDrawdown;
  }

  async enhanceAll(): Promise<{ updated: number; errors: number }> {
    console.log("📈 Starting AR/MDD Ratio enhancement for all Nasdaq 100 companies...");

    const companiesToUpdate = await db.select()
        .from(nasdaq100Companies)
        .where(and(
            isNotNull(nasdaq100Companies.maxDrawdown10Year), // Prerequisite
            or(
                isNull(nasdaq100Companies.arMddRatio10Year),
                eq(sql`(${nasdaq100Companies.arMddRatio10Year})::text`, '')
            )
        ));
    
    console.log(`📊 Found ${companiesToUpdate.length} companies needing AR/MDD ratio enhancement.`);

    let updated = 0;
    let errors = 0;

    for (const [index, company] of companiesToUpdate.entries()) {
      console.log(`[${index + 1}/${companiesToUpdate.length}] Processing ${company.symbol}...`);
      try {
        const arMddRatio3Year = this.calculateArMddRatio(parseFloat(company.return3Year), parseFloat(company.maxDrawdown3Year));
        const arMddRatio5Year = this.calculateArMddRatio(parseFloat(company.return5Year), parseFloat(company.maxDrawdown5Year));
        const arMddRatio10Year = this.calculateArMddRatio(parseFloat(company.return10Year), parseFloat(company.maxDrawdown10Year));

        await db.update(nasdaq100Companies)
          .set({
            arMddRatio3Year: arMddRatio3Year ? arMddRatio3Year.toFixed(4) : null,
            arMddRatio5Year: arMddRatio5Year ? arMddRatio5Year.toFixed(4) : null,
            arMddRatio10Year: arMddRatio10Year ? arMddRatio10Year.toFixed(4) : null,
          })
          .where(eq(nasdaq100Companies.symbol, company.symbol));
        
        updated++;
        console.log(`✅ Updated ${company.symbol}: 3Y=${arMddRatio3Year?.toFixed(4)}, 5Y=${arMddRatio5Year?.toFixed(4)}, 10Y=${arMddRatio10Year?.toFixed(4)}`);

      } catch (error) {
        console.error(`❌ Error processing ${company.symbol}:`, error);
        errors++;
      }
    }
    
    console.log(`\n🎉 Nasdaq 100 AR/MDD Ratio enhancement complete:`);
    console.log(`✅ Updated: ${updated} companies`);
    console.log(`❌ Errors: ${errors} companies`);
    return { updated, errors };
  }
}

async function run() {
    const enhancer = new Nasdaq100ArMddEnhancer();
    await enhancer.enhanceAll();
    process.exit(0);
}

run().catch(err => {
    console.error("Failed to run Nasdaq 100 AR/MDD Ratio enhancement:", err);
    process.exit(1);
});
