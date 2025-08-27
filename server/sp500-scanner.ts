import type { InsertCompany } from "@shared/schema";
import { storage } from "./storage";

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const FMP_API_KEY = process.env.FMP_API_KEY;

export interface SP500Constituent {
  symbol: string;
  name: string;
  sector: string;
  subSector: string;
  headQuarter: string;
  dateFirstAdded: string;
  cik: string;
  founded: string;
}

export interface CompanyProfile {
  symbol: string;
  price: number;
  beta: number;
  volAvg: number;
  mktCap: number;
  lastDiv: number;
  range: string;
  changes: number;
  companyName: string;
  currency: string;
  cik: string;
  isin: string;
  cusip: string;
  exchange: string;
  exchangeShortName: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  sector: string;
  country: string;
  fullTimeEmployees: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dcfDiff: number;
  dcf: number;
  image: string;
  ipoDate: string;
  defaultImage: boolean;
  isEtf: boolean;
  isActivelyTrading: boolean;
  isAdr: boolean;
  isFund: boolean;
}

export interface IncomeStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  researchAndDevelopmentExpenses: number;
  generalAndAdministrativeExpenses: number;
  sellingAndMarketingExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
  otherExpenses: number;
  operatingExpenses: number;
  costAndExpenses: number;
  interestIncome: number;
  interestExpense: number;
  depreciationAndAmortization: number;
  ebitda: number;
  ebitdaratio: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  totalOtherIncomeExpensesNet: number;
  incomeBeforeTax: number;
  incomeBeforeTaxRatio: number;
  incomeTaxExpense: number;
  netIncome: number;
  netIncomeRatio: number;
  eps: number;
  epsdiluted: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
}

export class SP500Scanner {
  private async makeRequest(endpoint: string, retries = 3, delay = 5000): Promise<any> {
    if (!FMP_API_KEY) {
      throw new Error("FMP_API_KEY is not configured");
    }

    const url = `${FMP_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${FMP_API_KEY}`;
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        
        if (response.ok) {
          return response.json();
        }

        if (response.status === 429) {
          console.warn(`[WARN] Rate limit hit. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }
        
        const errorText = await response.text();
        throw new Error(`FMP API error: ${response.status} ${response.statusText} - ${errorText}`);

      } catch (error) {
        if (i === retries - 1) { // If it's the last retry, throw the error
          throw error;
        }
      }
    }
    // If all retries fail, throw an error
    throw new Error(`Failed to fetch ${endpoint} after ${retries} attempts.`);
  }

  async getSP500Constituents(): Promise<SP500Constituent[]> {
    try {
      console.log("Fetching S&P 500 constituents...");
      const constituents = await this.makeRequest('/sp500_constituent');
      console.log(`Found ${constituents.length} S&P 500 companies`);
      return constituents;
    } catch (error) {
      console.error("Error fetching S&P 500 constituents:", error);
      throw error;
    }
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    try {
      const profiles = await this.makeRequest(`/profile/${symbol}`);
      return Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      console.error(`Error fetching profile for ${symbol}:`, error);
      return null;
    }
  }

  async getIncomeStatement(symbol: string): Promise<IncomeStatement | null> {
    try {
      const statements = await this.makeRequest(`/income-statement/${symbol}?limit=1`);
      return Array.isArray(statements) && statements.length > 0 ? statements[0] : null;
    } catch (error) {
      console.error(`Error fetching income statement for ${symbol}:`, error);
      return null;
    }
  }

  async scanAndImportSP500(): Promise<{ success: number; failed: number; total: number }> {
    console.log("🚀 Starting S&P 500 scan and import...");
    
    // Clear existing data
    await storage.clearAllCompanies();
    console.log("✅ Cleared existing company data");

    // Get S&P 500 constituents
    const constituents = await this.getSP500Constituents();
    
    let success = 0;
    let failed = 0;
    let rank = 1;
    
    console.log(`📊 Processing ${constituents.length} S&P 500 companies...`);
    
    // Process companies in batches to respect API limits
    const batchSize = 20;
    for (let i = 0; i < constituents.length; i += batchSize) {
      const batch = constituents.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(constituents.length/batchSize)}: ${batch.map(c => c.symbol).join(', ')}`);
      
      const batchPromises = batch.map(async (constituent) => {
        try {
          // Get company profile and income statement
          const [profile, incomeStatement] = await Promise.all([
            this.getCompanyProfile(constituent.symbol),
            this.getIncomeStatement(constituent.symbol)
          ]);
          
          if (!profile) {
            console.warn(`⚠️  No profile data for ${constituent.symbol}`);
            return false;
          }
          
          // Calculate daily change percentage
          const dailyChangePercent = profile.changes || 0;
          
          // Prepare company data
          const companyData: InsertCompany = {
            name: profile.companyName || constituent.name,
            symbol: constituent.symbol,
            marketCap: Math.round(profile.mktCap || 0).toString(),
            price: profile.price?.toFixed(2) || "0",
            dailyChange: profile.changes?.toString() || "0",
            dailyChangePercent: dailyChangePercent.toString(),
            country: profile.country || "United States",
            countryCode: this.getCountryCode(profile.country || "United States"),
            rank: rank++,
            logoUrl: profile.image && !profile.defaultImage ? profile.image : null,
            industry: profile.industry || constituent.sector,
            sector: profile.sector || constituent.sector,
            website: profile.website || null,
            description: profile.description || null,
            ceo: profile.ceo || null,
            employees: profile.fullTimeEmployees || null,
            peRatio: null, // Will be calculated from other metrics
            eps: incomeStatement?.eps?.toString() || null,
            beta: profile.beta?.toString() || null,
            dividendYield: profile.lastDiv?.toString() || null,
            volume: profile.volAvg?.toString() || null,
            avgVolume: profile.volAvg?.toString() || null,
            dayLow: null,
            dayHigh: null,
            yearLow: profile.range ? profile.range.split('-')[0]?.trim() || null : null,
            yearHigh: profile.range ? profile.range.split('-')[1]?.trim() || null : null,
            revenue: incomeStatement?.revenue?.toString() || null,
            grossProfit: incomeStatement?.grossProfit?.toString() || null,
            operatingIncome: incomeStatement?.operatingIncome?.toString() || null,
            netIncome: incomeStatement?.netIncome?.toString() || null,
            totalAssets: null,
            totalDebt: null,
            cashAndEquivalents: null
          };
          
          await storage.createCompany(companyData);
          
          const marketCapFormatted = profile.mktCap ? `$${(profile.mktCap / 1e9).toFixed(1)}B` : 'N/A';
          const revenueFormatted = incomeStatement?.revenue ? `$${(incomeStatement.revenue / 1e9).toFixed(1)}B` : 'N/A';
          const netIncomeFormatted = incomeStatement?.netIncome ? `$${(incomeStatement.netIncome / 1e9).toFixed(1)}B` : 'N/A';
          
          console.log(`✅ ${constituent.symbol} (${companyData.name}): Market Cap ${marketCapFormatted}, Revenue ${revenueFormatted}, Net Income ${netIncomeFormatted}`);
          return true;
          
        } catch (error) {
          console.error(`❌ Failed to process ${constituent.symbol}:`, error);
          return false;
        }
      });
      
      const results = await Promise.all(batchPromises);
      success += results.filter(r => r).length;
      failed += results.filter(r => !r).length;
      
      // Rate limiting between batches
      if (i + batchSize < constituents.length) {
        console.log("⏳ Waiting 2 seconds before next batch...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`🎉 S&P 500 scan complete! Success: ${success}, Failed: ${failed}, Total: ${constituents.length}`);
    
    return {
      success,
      failed,
      total: constituents.length
    };
  }
  
  private getCountryCode(country: string): string {
    const countryMap: { [key: string]: string } = {
      'United States': 'us',
      'USA': 'us',
      'US': 'us',
      'Canada': 'ca',
      'United Kingdom': 'gb',
      'UK': 'gb',
      'Germany': 'de',
      'France': 'fr',
      'Japan': 'jp',
      'China': 'cn',
      'India': 'in',
      'Brazil': 'br',
      'Australia': 'au',
      'South Korea': 'kr',
      'Netherlands': 'nl',
      'Switzerland': 'ch',
      'Taiwan': 'tw',
      'Denmark': 'dk',
      'Sweden': 'se',
      'Norway': 'no',
      'Finland': 'fi',
      'Spain': 'es',
      'Italy': 'it',
      'Belgium': 'be',
      'Ireland': 'ie',
      'Luxembourg': 'lu'
    };
    
    return countryMap[country] || 'us'; // Default to US for S&P 500
  }
  
  // Fetches comprehensive data for a given stock symbol
  public async quickScan(
    symbol: string,
    companyNameFromList?: string
  ): Promise<InsertCompany | null> {
    try {
      const [profileData, incomeData, balanceSheetData, cashFlowData] = await Promise.all([
        this.getCompanyProfile(symbol),
        this.getIncomeStatement(symbol),
        // Assuming balance sheet and cash flow are not directly available via FMP API
        // For now, we'll just fetch income statement for simplicity in this example
        // If balance sheet/cash flow are needed, they would require separate API calls
        null, // balanceSheetData
        null  // cashFlowData
      ]);

      if (!profileData) {
        console.warn(`⚠️ Could not find profile data for symbol ${symbol}. Skipping.`);
        return null;
      }

      // If profileData.companyName is null or undefined, use the fallback name
      const companyName = profileData.companyName || companyNameFromList;

      if (!companyName) {
        console.warn(`⚠️ Could not determine company name for symbol ${symbol}. Skipping.`);
        return null;
      }

      const companyData: InsertCompany = {
        name: companyName,
        symbol: profileData.symbol,
        marketCap: profileData.mktCap ? String(profileData.mktCap) : "0",
        price: profileData.price ? String(profileData.price) : "0",
        dailyChange: profileData.changes?.toString() || "0",
        dailyChangePercent: profileData.changes?.toString() || "0",
        country: "United States", // Assuming default country for quick scan
        countryCode: "us", // Assuming default country code for quick scan
        rank: 0, // Placeholder, will be updated after scanning
        logoUrl: profileData.image && !profileData.defaultImage ? profileData.image : null,
        industry: profileData.industry || "Unknown", // Assuming default industry
        sector: profileData.sector || "Unknown", // Assuming default sector
        website: profileData.website || null,
        description: profileData.description || null,
        ceo: profileData.ceo || null,
        employees: profileData.fullTimeEmployees || null,
        peRatio: null,
        eps: incomeData?.eps?.toString() || null,
        beta: profileData.beta?.toString() || null,
        dividendYield: profileData.lastDiv?.toString() || null,
        volume: profileData.volAvg?.toString() || null,
        avgVolume: profileData.volAvg?.toString() || null,
        dayLow: null,
        dayHigh: null,
        yearLow: profileData.range ? profileData.range.split('-')[0]?.trim() || null : null,
        yearHigh: profileData.range ? profileData.range.split('-')[1]?.trim() || null : null,
        revenue: incomeData?.revenue?.toString() || null,
        grossProfit: incomeData?.grossProfit?.toString() || null,
        operatingIncome: incomeData?.operatingIncome?.toString() || null,
        netIncome: incomeData?.netIncome?.toString() || null,
        totalAssets: null,
        totalDebt: null,
        cashAndEquivalents: null
      };
      
      await storage.createCompany(companyData);
      
      const marketCap = profileData.mktCap ? `$${(profileData.mktCap / 1e9).toFixed(1)}B` : 'N/A';
      console.log(`✅ ${symbol}: ${marketCap}`);
      
      return companyData;
      
    } catch (error) {
      console.error(`❌ Failed to quick scan ${symbol}:`, error);
      return null;
    }
  }
}

export const sp500Scanner = new SP500Scanner();