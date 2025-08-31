#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from "./db";
import { companies, type InsertCompany } from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface SP500Constituent {
  Symbol: string;
  Name: string;
  Sector: string;
}

class SP500LocalImporter {
  
  private async getSP500ConstituentsFromFile(): Promise<SP500Constituent[]> {
     try {
       console.log("Reading S&P 500 constituents from local file...");
       const __filename = fileURLToPath(import.meta.url);
       const __dirname = path.dirname(__filename);
       const filePath = path.resolve(__dirname, 'sp500_constituents.json');
       const fileContent = fs.readFileSync(filePath, 'utf-8');
       const constituents = JSON.parse(fileContent);
       console.log(`Found ${constituents.length} S&P 500 companies in local file.`);
       return constituents;
     } catch (error) {
       console.error("Error reading or parsing local S&P 500 constituents file:", error);
       throw error;
     }
   }

  async importFromLocal() {
    console.log("🚀 Starting S&P 500 import from local file (NO API CALLS)...");
    
    await db.delete(companies);
    console.log("✅ Cleared existing company data to ensure a clean slate.");

    const constituents = await this.getSP500ConstituentsFromFile();
    const total = constituents.length;
    
    if (total === 0) {
        console.log("No constituents found in local file. Aborting.");
        return;
    }

    console.log(`📊 Found ${total} constituents. Creating minimal entries...`);

    const minimalCompaniesData: InsertCompany[] = constituents.map((c, index) => ({
        symbol: c.Symbol,
        name: c.Name,
        industry: c.Sector,
        marketCap: "0",
        price: "0",
        country: "USA", 
        rank: index + 1,
    }));

    await db.insert(companies).values(minimalCompaniesData).onConflictDoNothing();

    console.log(`🎉 S&P 500 list restored! Created ${total} entries with basic info.`);
    console.log("All financial data columns are null. Run `npm run enhance:all` once API access is restored.");
  }
}

async function main() {
    const importer = new SP500LocalImporter();
    await importer.importFromLocal();
}

main().catch(error => {
    console.error("S&P 500 local import script failed:", error);
    process.exit(1);
});