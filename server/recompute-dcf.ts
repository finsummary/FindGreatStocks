import 'dotenv/config';
import { db } from './db';
import { sp500Companies, nasdaq100Companies, dowJonesCompanies } from '@shared/schema';
import { updateDcfMetricsForCompany } from './dcf-daily-updater';

async function recomputeForTable(table: any, name: string) {
  console.log(`\n🔧 Recomputing DCF metrics for ${name}...`);
  const rows = await db.select({ symbol: table.symbol, marketCap: table.marketCap }).from(table);
  let updated = 0; let skipped = 0;
  for (const row of rows) {
    const symbol = row.symbol as string;
    const marketCapNum = row.marketCap ? Number(row.marketCap) : 0;
    try {
      await updateDcfMetricsForCompany(table, symbol, marketCapNum);
      updated++;
      await new Promise(r => setTimeout(r, 75));
    } catch {
      skipped++;
    }
  }
  console.log(`✅ ${name}: updated ${updated}, skipped ${skipped}`);
}

async function main() {
  await recomputeForTable(sp500Companies, 'S&P 500');
  await recomputeForTable(nasdaq100Companies, 'Nasdaq 100');
  await recomputeForTable(dowJonesCompanies, 'Dow Jones');
  console.log('\n🎉 DCF recomputation finished.');
}

main().catch(err => { console.error(err); process.exit(1); });
