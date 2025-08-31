#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from "./db";
import { companies, type InsertCompany } from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

class SP500CsvImporter {

  private readCsvFile(): any[] {
    try {
      const filePath = path.resolve(process.cwd(), 'sp500.csv');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      });
      return records;
    } catch (error) {
      console.error("Error reading or parsing CSV file:", error);
      throw error;
    }
  }

  async importFromCsv() {
    console.log("🚀 Starting S&P 500 import from sp500.csv...");
    
    await db.delete(companies);
    console.log("✅ Cleared existing company data.");

    const records = this.readCsvFile();
    const total = records.length;
    
    if (total === 0) {
        console.log("No records found in CSV file. Aborting.");
        return;
    }

    console.log(`📊 Found ${total} companies in CSV. Creating entries...`);

    // Sort records alphabetically by company name
    records.sort((a, b) => a.Company.localeCompare(b.Company));

    const companiesData: InsertCompany[] = records.map((record, index) => {
        if (!record.Symbol || !record.Company) {
            console.warn(`⚠️ Skipping row ${index + 2} due to missing Symbol or Company.`);
            return null;
        }
        return {
            symbol: record.Symbol,
            name: record.Company,
            marketCap: "0",
            price: "0",
            country: "USA",
            rank: index + 1,
        };
    }).filter((c): c is InsertCompany => c !== null);

    if (companiesData.length > 0) {
        await db.insert(companies).values(companiesData);
        console.log(`🎉 S&P 500 list restored from CSV! Created ${companiesData.length} entries.`);
    } else {
        console.log("No valid company data found to insert.");
    }
  }
}

async function main() {
    const importer = new SP500CsvImporter();
    await importer.importFromCsv();
}

main().catch(error => {
    console.error("S&P 500 CSV import script failed:", error);
    process.exit(1);
});
