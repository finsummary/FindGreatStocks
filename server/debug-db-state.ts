import 'dotenv/config';
import { db } from './db';
import { companies, nasdaq100Companies, dowJonesCompanies } from '@shared/schema';
import { sql, isNull, or, and, not, count } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

async function debugTable(table: PgTable) {
    const tableName = table[Symbol.for('drizzle:BaseName')];
    console.log(`\n--- Debugging Table: ${tableName} ---`);

    const total = await db.select({ value: count() }).from(table);
    console.log(`Total rows: ${total[0].value}`);

    const dcfNull = await db.select({ value: count() }).from(table).where(isNull(table.dcfEnterpriseValue));
    console.log(`Rows where dcfEnterpriseValue IS NULL: ${dcfNull[0].value}`);

    const fcfGrowthNull = await db.select({ value: count() }).from(table).where(isNull(table.fcfGrowthRate));
    console.log(`Rows where fcfGrowthRate IS NULL: ${fcfGrowthNull[0].value}`);
    
    const dcfOrFcfGrowthNull = await db.select({ value: count() }).from(table).where(or(isNull(table.dcfEnterpriseValue), isNull(table.fcfGrowthRate)));
    console.log(`Rows where dcfEnterpriseValue IS NULL OR fcfGrowthRate IS NULL: ${dcfOrFcfGrowthNull[0].value}`);

    const dcfNotNullAndFcfGrowthNull = await db.select({ value: count() }).from(table).where(and(not(isNull(table.dcfEnterpriseValue)), isNull(table.fcfGrowthRate)));
    console.log(`Rows where dcfEnterpriseValue IS NOT NULL AND fcfGrowthRate IS NULL: ${dcfNotNullAndFcfGrowthNull[0].value}`);
}

async function main() {
    await debugTable(companies);
    await debugTable(nasdaq100Companies);
    await debugTable(dowJonesCompanies);
}

main().catch(console.error).finally(() => {
    // process.exit(0);
});
