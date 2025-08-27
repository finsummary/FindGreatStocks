import { db } from "./db";
import { ftse100Companies } from "@shared/schema";
import { eq } from "drizzle-orm";

if (!process.env.FMP_API_KEY) {
  throw new Error('FMP_API_KEY environment variable is required');
}

const API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface FMPFinancialData {
  symbol: string;
  revenue: number;
  netIncome: number;
  eps: number;
  peRatio: number;
}

async function fetchFinancialData(symbol: string): Promise<FMPFinancialData | null> {
  try {
    console.log(`📊 Fetching financial data for ${symbol}...`);
    
    // Get income statement (annual)
    const incomeResponse = await fetch(`${BASE_URL}/income-statement/${symbol}?period=annual&limit=1&apikey=${API_KEY}`);
    const incomeData = await incomeResponse.json();
    
    // Get key metrics
    const metricsResponse = await fetch(`${BASE_URL}/key-metrics/${symbol}?period=annual&limit=1&apikey=${API_KEY}`);
    const metricsData = await metricsResponse.json();
    
    // Get ratios
    const ratiosResponse = await fetch(`${BASE_URL}/ratios/${symbol}?period=annual&limit=1&apikey=${API_KEY}`);
    const ratiosData = await ratiosResponse.json();
    
    const income = incomeData?.[0];
    const metrics = metricsData?.[0];
    const ratios = ratiosData?.[0];
    
    if (!income && !metrics && !ratios) {
      console.log(`⚠️ No financial data found for ${symbol}`);
      return null;
    }
    
    return {
      symbol,
      revenue: income?.revenue || 0,
      netIncome: income?.netIncome || 0,
      eps: income?.eps || metrics?.eps || 0,
      peRatio: ratios?.peRatio || metrics?.peRatio || 0
    };
    
  } catch (error) {
    console.error(`Error fetching financial data for ${symbol}:`, error);
    return null;
  }
}

async function fetchCompleteFTSE100List(): Promise<string[]> {
  // Complete FTSE 100 list with accurate symbols
  return [
    // Top 50 by market cap
    'SHEL.L', 'AZN.L', 'LSEG.L', 'UU.L', 'ULVR.L', 'RKT.L', 'RELX.L', 
    'BP.L', 'NWG.L', 'VOD.L', 'GSK.L', 'LLOY.L', 'BARC.L', 'TSCO.L', 
    'BT-A.L', 'RIO.L', 'DGE.L', 'PRU.L', 'NG.L', 'ADM.L', 'NXT.L', 
    'IMB.L', 'ANTO.L', 'CRH.L', 'GLEN.L', 'IAG.L', 'SBRY.L', 'BHP.L', 
    'FLTR.L', 'LGEN.L', 'JET.L', 'WTB.L', 'SMDS.L', 'EZJ.L', 'AAL.L', 
    'CRDA.L', 'PSON.L', 'IHG.L', 'MNDI.L', 'OCDO.L', 'WPP.L', 'LAND.L', 
    'BRBY.L', 'CTEC.L', 'ENT.L', 'CCH.L', 'JMAT.L', 'KGF.L', 'SVT.L', 
    'BME.L',
    
    // Mid-cap FTSE 100 companies (51-100)
    'HIK.L', 'BNZL.L', 'AVV.L', 'SDR.L', 'SPX.L', 'ICP.L', 'PSH.L', 
    'DSV.L', 'SMT.L', 'RTO.L', 'HSX.L', 'HWDN.L', 'FRAS.L', 'PSN.L', 
    'AUTO.L', 'JD.L', 'IGG.L', 'WEIR.L', 'STAN.L', 'MGGT.L', 'BDEV.L', 
    'CPG.L', 'AHT.L', 'SSE.L', 'SGE.L', 'EVR.L', 'PTEC.L', 'EXPN.L', 
    'RMV.L', 'RS1.L', 'III.L', 'ITRK.L', 'MNG.L', 'CNE.L', 'TMG.L', 
    'FERG.L', 'INF.L', 'CNA.L', 'SPG.L', 'BBGI.L', 'BATS.L', 'HOC.L', 
    'DARK.L', 'REL.L', 'SN.L', 'RR.L', 'BKGH.L', 'POLYP.L', 'ASCL.L', 
    'TUI.L'
  ];
}

async function addMissingCompanies() {
  console.log('🔍 Adding missing FTSE 100 companies...');
  
  const allSymbols = await fetchCompleteFTSE100List();
  const existingCompanies = await db.select({ symbol: ftse100Companies.symbol }).from(ftse100Companies);
  const existingSymbols = new Set(existingCompanies.map(c => c.symbol));
  
  const missingSymbols = allSymbols.filter(symbol => !existingSymbols.has(symbol));
  
  console.log(`📋 Found ${missingSymbols.length} missing companies to add`);
  
  let added = 0;
  let failed = 0;
  
  for (const symbol of missingSymbols) {
    try {
      // Get basic quote data
      const quoteResponse = await fetch(`${BASE_URL}/quote/${symbol}?apikey=${API_KEY}`);
      const quoteData = await quoteResponse.json();
      
      if (!quoteData?.[0]) {
        console.log(`⚠️ No quote data for ${symbol}`);
        failed++;
        continue;
      }
      
      const quote = quoteData[0];
      
      // Get company profile
      const profileResponse = await fetch(`${BASE_URL}/profile/${symbol}?apikey=${API_KEY}`);
      const profileData = await profileResponse.json();
      const profile = profileData?.[0] || {};
      
      // Insert company
      await db.insert(ftse100Companies).values({
        rank: added + 22, // Continue from existing rank
        symbol: quote.symbol,
        name: quote.name || profile.companyName || symbol,
        marketCap: quote.marketCap?.toString() || '0',
        price: quote.price?.toString() || '0',
        dailyChange: quote.change?.toString() || '0',
        dailyChangePercent: (quote.changesPercentage / 100)?.toString() || '0',
        sector: profile.sector || 'Unknown',
        industry: profile.industry || 'Unknown',
        country: profile.country || 'GB',
        website: profile.website,
        description: profile.description,
        ceo: profile.ceo,
        employees: profile.fullTimeEmployees,
        logoUrl: `https://financialmodelingprep.com/image-stock/${symbol.replace('.L', '')}.png`
      });
      
      console.log(`✅ Added ${symbol}: ${quote.name} (${added + 1}/${missingSymbols.length})`);
      added++;
      
      // Rate limiting
      await delay(200);
      
    } catch (error) {
      console.error(`❌ Failed to add ${symbol}:`, error);
      failed++;
    }
  }
  
  return { added, failed };
}

export async function enhanceFTSE100Data() {
  console.log('🚀 Starting FTSE 100 data enhancement...');
  const startTime = Date.now();
  
  try {
    // First, add any missing companies
    const addResult = await addMissingCompanies();
    console.log(`📊 Added ${addResult.added} missing companies (${addResult.failed} failed)`);
    
    // Get all companies that need financial data
    const companies = await db
      .select()
      .from(ftse100Companies)
      .where(eq(ftse100Companies.revenue, null));
    
    console.log(`📈 Enhancing financial data for ${companies.length} companies...`);
    
    let enhanced = 0;
    let failed = 0;
    
    for (const company of companies) {
      try {
        const financialData = await fetchFinancialData(company.symbol);
        
        if (financialData) {
          await db
            .update(ftse100Companies)
            .set({
              revenue: financialData.revenue?.toString(),
              netIncome: financialData.netIncome?.toString(),
              eps: financialData.eps?.toString(),
              peRatio: financialData.peRatio?.toString(),
              lastUpdated: new Date()
            })
            .where(eq(ftse100Companies.id, company.id));
          
          console.log(`✅ Enhanced ${company.symbol}: ${company.name} (${enhanced + 1}/${companies.length})`);
          enhanced++;
        } else {
          failed++;
        }
        
        // Rate limiting - be respectful to FMP API
        await delay(300);
        
      } catch (error) {
        console.error(`❌ Failed to enhance ${company.symbol}:`, error);
        failed++;
      }
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`🎉 FTSE 100 enhancement completed in ${duration}s`);
    console.log(`📊 Results: ${enhanced} companies enhanced, ${failed} failed`);
    
    return {
      success: true,
      enhanced,
      failed,
      total: companies.length,
      duration: parseFloat(duration)
    };
    
  } catch (error) {
    console.error('❌ FTSE 100 enhancement failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      enhanced: 0,
      failed: 0,
      total: 0
    };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  enhanceFTSE100Data()
    .then(result => {
      console.log('Final result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}