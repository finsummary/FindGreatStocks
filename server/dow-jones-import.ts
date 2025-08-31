import { db } from "./db";
import { dowJonesCompanies } from "@shared/schema";
import 'dotenv/config';

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const FMP_API_KEY = process.env.FMP_API_KEY;

interface Constituent {
  symbol: string;
  name: string;
}

async function getConstituents(): Promise<Constituent[]> {
  if (!FMP_API_KEY) {
    throw new Error("FMP_API_KEY is not configured");
  }
  const url = `${FMP_BASE_URL}/dowjones_constituent?apikey=${FMP_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Dow Jones constituents: ${response.statusText}`);
  }
  return response.json();
}

async function importDowJones() {
  console.log("🚀 Starting Dow Jones import (additive mode)...");
  try {
    const constituents = await getConstituents();
    console.log(`Found ${constituents.length} Dow Jones companies from API.`);

    const existingCompanies = await db.select({ symbol: dowJonesCompanies.symbol }).from(dowJonesCompanies);
    const existingSymbols = new Set(existingCompanies.map(c => c.symbol));
    console.log(`Found ${existingSymbols.size} companies already in the database.`);

    const missingConstituents = constituents.filter(c => !existingSymbols.has(c.symbol));
    
    if (missingConstituents.length === 0) {
      console.log("🎉 Database is already up to date. No new companies to add.");
      return;
    }

    console.log(`📊 Found ${missingConstituents.length} new constituents to add.`);

    const newCompaniesData = missingConstituents.map(c => ({
      symbol: c.symbol,
      name: c.name,
    }));

    await db.insert(dowJonesCompanies).values(newCompaniesData).onConflictDoNothing();

    console.log(`✅ Successfully added ${missingConstituents.length} new companies to the Dow Jones table.`);
    console.log("Run `npm run enhance:all` to enrich the new entries.");

  } catch (error) {
    console.error("❌ An error occurred during the Dow Jones import process:", error);
    process.exit(1);
  }
}

importDowJones();
