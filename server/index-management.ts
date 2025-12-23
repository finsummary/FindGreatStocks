#!/usr/bin/env tsx

/**
 * УНИВЕРСАЛЬНАЯ СИСТЕМА УПРАВЛЕНИЯ ИНДЕКСАМИ
 * 
 * Этот скрипт позволяет добавлять и удалять компании из любых индексов.
 * Использует те же функции, что и populate-new-sp500-companies.ts, но работает с любым индексом.
 */

import { supabase } from './db';
import * as schema from '../shared/schema';
import { FinancialDataService } from './financial-data';
import { updateDcfMetricsForCompany } from './dcf-daily-updater';
import { PgTable } from 'drizzle-orm/pg-core';

// Импортируем все функции из populate-new-sp500-companies.ts
// Но адаптируем их для работы с динамическим tableName
import * as populateSp500 from './populate-new-sp500-companies';

const FMP_API_KEY = process.env.FMP_API_KEY;

if (!FMP_API_KEY) {
  console.error('❌ FMP_API_KEY environment variable is required');
  process.exit(1);
}

// ============================================================================
// КОНФИГУРАЦИЯ ИНДЕКСОВ
// ============================================================================

const INDEX_CONFIG: Record<string, { tableName: string; tableSchema: PgTable<any>; displayName: string }> = {
  sp500: {
    tableName: 'sp500_companies',
    tableSchema: schema.sp500Companies as PgTable<any>,
    displayName: 'S&P 500',
  },
  nasdaq100: {
    tableName: 'nasdaq100_companies',
    tableSchema: schema.nasdaq100Companies as PgTable<any>,
    displayName: 'NASDAQ 100',
  },
  dowjones: {
    tableName: 'dow_jones_companies',
    tableSchema: schema.dowJonesCompanies as PgTable<any>,
    displayName: 'Dow Jones',
  },
  ftse100: {
    tableName: 'ftse100_companies',
    tableSchema: schema.ftse100Companies as PgTable<any>,
    displayName: 'FTSE 100',
  },
};

// ============================================================================
// ОСНОВНЫЕ ФУНКЦИИ
// ============================================================================

export async function addCompaniesToIndex(indexKey: string, symbols: string[]) {
  const config = INDEX_CONFIG[indexKey];
  if (!config) {
    throw new Error(`Unknown index: ${indexKey}. Available: ${Object.keys(INDEX_CONFIG).join(', ')}`);
  }

  console.log(`\n🚀 Adding companies to ${config.displayName}: ${symbols.join(', ')}\n`);

  // Для S&P 500 используем существующий скрипт напрямую
  if (indexKey === 'sp500') {
    // Временно обновляем SYMBOLS в populate-new-sp500-companies.ts
    // Но лучше создать универсальную версию
    console.log('⚠️ For S&P 500, please use populate-new-sp500-companies.ts directly');
    console.log('⚠️ For other indices, this will be implemented soon');
    return;
  }

  // Для других индексов - используем универсальный процесс
  for (const symbol of symbols) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing ${symbol}`);
    console.log('='.repeat(60));

    try {
      // Проверяем, существует ли компания в таблице
      const { data: existing } = await supabase
        .from(config.tableName)
        .select('symbol')
        .eq('symbol', symbol)
        .single();

      if (existing) {
        console.log(`⚠️ ${symbol} already exists in ${config.displayName}. Skipping insertion, but will populate data.`);
      } else {
        // Создаем базовую запись
        const { error: insertError } = await supabase
          .from(config.tableName)
          .insert({ symbol, name: symbol });

        if (insertError) {
          console.error(`❌ Error inserting ${symbol}:`, insertError);
          continue;
        }
        console.log(`✅ Inserted ${symbol} into ${config.tableName}`);
      }

      // Заполняем все данные используя универсальные функции
      // TODO: Создать универсальные версии всех функций populate
      console.log(`⚠️ Universal population functions not yet implemented for ${indexKey}`);
      console.log(`⚠️ Please use populate-new-sp500-companies.ts as a template`);
      
    } catch (error) {
      console.error(`\n❌ Failed to process ${symbol}:`, error);
    }
  }

  console.log(`\n🎉 All companies processed!`);
}

export async function removeCompaniesFromIndex(indexKey: string, symbols: string[]) {
  const config = INDEX_CONFIG[indexKey];
  if (!config) {
    throw new Error(`Unknown index: ${indexKey}. Available: ${Object.keys(INDEX_CONFIG).join(', ')}`);
  }

  console.log(`\n🗑️ Removing companies from ${config.displayName}: ${symbols.join(', ')}\n`);

  for (const symbol of symbols) {
    const { error } = await supabase
      .from(config.tableName)
      .delete()
      .eq('symbol', symbol);

    if (error) {
      console.error(`❌ Error removing ${symbol}:`, error);
    } else {
      console.log(`✅ Removed ${symbol} from ${config.displayName}`);
    }
  }

  console.log(`\n✅ Removal complete!`);
}

// ============================================================================
// CLI / API INTERFACE
// ============================================================================

export async function manageIndex(action: 'add' | 'remove', index: string, symbols: string[]) {
  if (action === 'add') {
    await addCompaniesToIndex(index, symbols);
  } else if (action === 'remove') {
    await removeCompaniesFromIndex(index, symbols);
  } else {
    throw new Error(`Unknown action: ${action}. Use 'add' or 'remove'`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('index-management.ts')) {
  const args = process.argv.slice(2);
  const action = args[0] as 'add' | 'remove';
  const indexIndex = args.indexOf('--index');
  const symbolsIndex = args.indexOf('--symbols');

  if (!action || !['add', 'remove'].includes(action)) {
    console.error('Usage: tsx server/index-management.ts <add|remove> --index <index> --symbols <symbol1,symbol2,...>');
    process.exit(1);
  }

  if (indexIndex === -1 || symbolsIndex === -1) {
    console.error('Missing required arguments: --index and --symbols');
    process.exit(1);
  }

  const index = args[indexIndex + 1];
  const symbolsStr = args[symbolsIndex + 1];
  const symbols = symbolsStr.split(',').map(s => s.trim().toUpperCase());

  manageIndex(action, index, symbols).catch(console.error);
}
