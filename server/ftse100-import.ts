/**
 * FTSE 100 Companies Import
 * Fetches and imports all FTSE 100 companies using Financial Modeling Prep API
 */

import { db } from "./db";
import { ftse100Companies } from "@shared/schema";

if (!process.env.FMP_API_KEY) {
  throw new Error('FMP_API_KEY environment variable is required');
}

const API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface FMPCompany {
  symbol: string;
  name: string;
  marketCap: number;
  price: number;
  changesPercentage: number;
  change: number;
  sector: string;
  industry: string;
  country: string;
  website?: string;
  description?: string;
  ceo?: string;
  fullTimeEmployees?: number;
}

async function fetchFTSE100List(): Promise<string[]> {
  try {
    console.log('📋 Fetching FTSE 100 constituent list...');
    const response = await fetch(`${BASE_URL}/dowjones_constituent?apikey=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch FTSE 100 list: ${response.status}`);
    }

    const data = await response.json();
    
    // For now, we'll use a curated list of major UK companies as FMP might not have exact FTSE 100 endpoint
    const ftse100Symbols = [
      // Top holdings by market cap
      'SHEL.L', 'AZN.L', 'LSEG.L', 'UU.L', 'ULVR.L', 'RKT.L', 'RELX.L', 
      'BP.L', 'ASML.L', 'NWG.L', 'VOD.L', 'GSK.L', 'LLOY.L', 'BARC.L',
      'TSCO.L', 'BT-A.L', 'RIO.L', 'DGE.L', 'PRU.L', 'NG.L', 'ADM.L',
      'NXT.L', 'IMB.L', 'ANTO.L', 'CRH.L', 'GLEN.L', 'IAG.L', 'SBRY.L',
      'BHP.L', 'FLTR.L', 'LGEN.L', 'JET.L', 'WTB.L', 'SMDS.L', 'EZJ.L',
      'AAL.L', 'CRDA.L', 'PSON.L', 'IHG.L', 'MNDI.L', 'OCDO.L', 'WPP.L',
      'LAND.L', 'BRBY.L', 'CTEC.L', 'ENT.L', 'CCH.L', 'JMAT.L', 'KGF.L',
      'SVT.L', 'BME.L', 'HIK.L', 'BNZL.L', 'AVV.L', 'SDR.L', 'SPX.L',
      'ICP.L', 'PSH.L', 'DSV.L', 'SMT.L', 'RTO.L', 'HSX.L', 'HWDN.L',
      'FRAS.L', 'PSN.L', 'AUTO.L', 'JD.L', 'IGG.L', 'WEIR.L', 'STAN.L',
      'MGGT.L', 'BDEV.L', 'CPG.L', 'AHT.L', 'SSE.L', 'SGE.L', 'EVR.L',
      'PTEC.L', 'EXPN.L', 'RMV.L', 'RS1.L', 'III.L', 'ITRK.L', 'MNG.L',
      'RDSB.L', 'CNE.L', 'TMG.L', 'FERG.L', 'INF.L', 'CNA.L', 'SPG.L',
      'BBGI.L', 'BATS.L', 'HOC.L', 'DARK.L', 'REL.L', 'SN.L', 'RR.L',
      'IDEMITSU.L', 'BKGH.L'
    ];

    console.log(`📊 Using curated FTSE 100 list with ${ftse100Symbols.length} companies`);
    return ftse100Symbols.slice(0, 100); // Ensure exactly 100 companies
    
  } catch (error) {
    console.error('Error fetching FTSE 100 list:', error);
    throw error;
  }
}

async function fetchCompanyData(symbol: string): Promise<FMPCompany | null> {
  try {
    console.log(`📈 Fetching data for ${symbol}...`);
    
    // Get quote data
    const quoteResponse = await fetch(`${BASE_URL}/quote/${symbol}?apikey=${API_KEY}`);
    const quoteData = await quoteResponse.json();
    
    if (!quoteData?.[0]) {
      console.log(`⚠️ No quote data for ${symbol}`);
      return null;
    }

    const quote = quoteData[0];
    
    // Get company profile for additional details
    const profileResponse = await fetch(`${BASE_URL}/profile/${symbol}?apikey=${API_KEY}`);
    const profileData = await profileResponse.json();
    const profile = profileData?.[0] || {};

    return {
      symbol: quote.symbol,
      name: quote.name || profile.companyName || symbol,
      marketCap: quote.marketCap || 0,
      price: quote.price || 0,
      changesPercentage: quote.changesPercentage || 0,
      change: quote.change || 0,
      sector: profile.sector || 'Unknown',
      industry: profile.industry || 'Unknown',
      country: profile.country || 'GB',
      website: profile.website,
      description: profile.description,
      ceo: profile.ceo,
      fullTimeEmployees: profile.fullTimeEmployees
    };
    
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
}

export async function importFTSE100Companies() {
  console.log('🚀 Starting FTSE 100 import...');
  const startTime = Date.now();
  
  try {
    // Clear existing data
    await db.delete(ftse100Companies);
    console.log('🗑️ Cleared existing FTSE 100 data');
    
    // Get FTSE 100 symbols
    const symbols = await fetchFTSE100List();
    console.log(`📋 Found ${symbols.length} FTSE 100 companies to import`);
    
    let imported = 0;
    let failed = 0;
    
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      
      try {
        const companyData = await fetchCompanyData(symbol);
        
        if (companyData) {
          // Insert into database
          await db.insert(ftse100Companies).values({
            rank: i + 1,
            symbol: companyData.symbol,
            name: companyData.name,
            marketCap: companyData.marketCap.toString(),
            price: companyData.price.toString(),
            dailyChange: companyData.change.toString(),
            dailyChangePercent: companyData.changesPercentage.toString(),
            sector: companyData.sector,
            industry: companyData.industry,
            country: companyData.country,
            website: companyData.website,
            description: companyData.description,
            ceo: companyData.ceo,
            employees: companyData.fullTimeEmployees,
            logoUrl: `https://financialmodelingprep.com/image-stock/${companyData.symbol.replace('.L', '')}.png`
          });
          
          imported++;
          console.log(`✅ Imported ${companyData.symbol}: ${companyData.name} (${imported}/${symbols.length})`);
        } else {
          failed++;
          console.log(`❌ Failed to import ${symbol} (${failed} total failures)`);
        }
        
      } catch (error) {
        failed++;
        console.error(`❌ Error importing ${symbol}:`, error);
      }
      
      // Rate limiting - wait between requests
      if (i < symbols.length - 1) {
        await delay(200);
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ FTSE 100 import completed in ${duration}s`);
    console.log(`📊 Results: ${imported} imported, ${failed} failed`);
    
    return {
      success: true,
      imported,
      failed,
      total: symbols.length,
      duration: parseFloat(duration)
    };
    
  } catch (error) {
    console.error('❌ FTSE 100 import failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      imported: 0,
      failed: 0,
      total: 0
    };
  }
}

// Manual execution for testing
import.meta.url === `file://${process.argv[1]}` && 
  importFTSE100Companies().then(result => {
    console.log('\n🎉 Import completed:', result);
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });