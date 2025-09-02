import 'dotenv/config';
import { db } from './db';
import { companies } from '@shared/schema';
import { sql } from 'drizzle-orm';

async function verifyData() {
  console.log('--- Verifying DuPont and ROE data in the database ---');

  const symbolsToCHeck = ['NVDA', 'MSFT', 'AAPL', 'AMZN', 'JPM'];

  const results = await db
    .select({
      symbol: companies.symbol,
      roe: companies.roe,
      assetTurnover: companies.assetTurnover,
      financialLeverage: companies.financialLeverage,
    })
    .from(companies)
    .where(sql`${companies.symbol} in ${symbolsToCHeck}`);
    
  if (results.length === 0) {
    console.log('Could not find any of the sample companies (NVDA, MSFT, AAPL, AMZN, JPM) in the database.');
    return;
  }

  console.log('Data for sample companies:');
  console.table(results);

  console.log('\n--- Verification complete ---');
  process.exit(0);
}

verifyData().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
