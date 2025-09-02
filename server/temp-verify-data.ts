import 'dotenv/config';
import { db } from './db';
import { companies, nasdaq100Companies, dowJonesCompanies } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function verifyData() {
  console.log('--- Verifying data in the database ---');

  const symbolsToCHeck = ['AAPL', 'MSFT', 'JPM'];

  console.log('\n--- Checking S&P 500 (companies) table ---');
  for (const symbol of symbolsToCHeck) {
    const companyData = await db
      .select({
        symbol: companies.symbol,
        return10Year: companies.return10Year,
        maxDrawdown10Year: companies.maxDrawdown10Year,
        roe: companies.roe,
        assetTurnover: companies.assetTurnover,
        financialLeverage: companies.financialLeverage,
      })
      .from(companies)
      .where(eq(companies.symbol, symbol));

    if (companyData.length > 0) {
      console.log(`Data for ${symbol}:`, companyData[0]);
    } else {
      console.log(`Could not find ${symbol} in S&P 500 table.`);
    }
  }

  console.log('\n--- Checking Dow Jones (dow_jones_companies) table ---');
    const dowCompany = await db
      .select({
        symbol: dowJonesCompanies.symbol,
        return10Year: dowJonesCompanies.return10Year,
        maxDrawdown10Year: dowJonesCompanies.maxDrawdown10Year,
        roe: dowJonesCompanies.roe,
        assetTurnover: dowJonesCompanies.assetTurnover,
        financialLeverage: dowJonesCompanies.financialLeverage,
      })
      .from(dowJonesCompanies)
      .where(eq(dowJonesCompanies.symbol, 'AAPL'));
    
    if (dowCompany.length > 0) {
        console.log(`Data for AAPL in Dow Jones:`, dowCompany[0]);
    } else {
        console.log(`Could not find AAPL in Dow Jones table.`);
    }


  console.log('\n--- Verification complete ---');
}

verifyData().catch(console.error);
