import type { InsertCompany, Company } from "@shared/schema";

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const FMP_API_KEY = process.env.FMP_API_KEY;

export interface FMPCompany {
  symbol: string;
  name: string;
  marketCap: number;
  price: number;
  changesPercentage: number;
  change: number;
  companyName: string;
  exchange: string;
  exchangeShortName: string;
  country: string;
}

export interface FMPCompanyProfile {
  symbol: string;
  companyName: string;
  country: string;
  image: string;
  exchangeShortName: string;
  marketCap: number;
  price: number;
}

export class FinancialDataService {
  private async makeRequest(endpoint: string): Promise<any> {
    if (!FMP_API_KEY) {
      throw new Error("FMP_API_KEY is not configured");
    }

    const url = `${FMP_BASE_URL}${endpoint}?apikey=${FMP_API_KEY}`;
    console.log(`Fetching: ${endpoint}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async fetchTopCompaniesByMarketCap(limit: number = 100): Promise<FMPCompany[]> {
    try {
      // Get all companies sorted by market cap
      const companies = await this.makeRequest("/stock-screener?marketCapMoreThan=1000000000&limit=1000");
      
      if (!Array.isArray(companies)) {
        console.error("Unexpected response format:", companies);
        return [];
      }

      // Filter out companies without essential data and sort by market cap
      const filteredCompanies = companies
        .filter(company => 
          company.marketCap && 
          company.marketCap > 0 && 
          company.symbol && 
          company.companyName &&
          company.price &&
          company.price > 0
        )
        .sort((a, b) => b.marketCap - a.marketCap)
        .slice(0, limit);

      return filteredCompanies;
    } catch (error) {
      console.error("Error fetching companies:", error);
      throw error;
    }
  }

  async fetchCompanyProfile(symbol: string): Promise<FMPCompanyProfile | null> {
    try {
      const profiles = await this.makeRequest(`/profile/${symbol}`);
      return Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      console.error(`Error fetching profile for ${symbol}:`, error);
      return null;
    }
  }

  async fetchMultipleCompanyProfiles(symbols: string[]): Promise<FMPCompanyProfile[]> {
    try {
      const symbolsString = symbols.join(',');
      const profiles = await this.makeRequest(`/profile/${symbolsString}`);
      return Array.isArray(profiles) ? profiles : [];
    } catch (error) {
      console.error("Error fetching multiple profiles:", error);
      return [];
    }
  }

  convertToCompanySchema(fmpCompany: FMPCompany, rank: number, profile?: FMPCompanyProfile): InsertCompany {
    // Map exchange to country code
    const getCountryCode = (country: string, exchange: string): string => {
      const countryMap: Record<string, string> = {
        'US': 'us',
        'United States': 'us',
        'CA': 'ca',
        'Canada': 'ca',
        'GB': 'gb',
        'United Kingdom': 'gb',
        'DE': 'de',
        'Germany': 'de',
        'FR': 'fr',
        'France': 'fr',
        'JP': 'jp',
        'Japan': 'jp',
        'CN': 'cn',
        'China': 'cn',
        'KR': 'kr',
        'South Korea': 'kr',
        'IN': 'in',
        'India': 'in',
        'AU': 'au',
        'Australia': 'au',
        'NL': 'nl',
        'Netherlands': 'nl',
        'CH': 'ch',
        'Switzerland': 'ch',
        'SE': 'se',
        'Sweden': 'se',
        'DK': 'dk',
        'Denmark': 'dk',
        'NO': 'no',
        'Norway': 'no',
        'FI': 'fi',
        'Finland': 'fi'
      };

      // Try country first, then exchange-based mapping
      let countryCode = countryMap[country] || countryMap[country?.toUpperCase()];
      
      if (!countryCode) {
        // Map by exchange
        const exchangeMap: Record<string, string> = {
          'NASDAQ': 'us',
          'NYSE': 'us',
          'AMEX': 'us',
          'TSX': 'ca',
          'LSE': 'gb',
          'FRA': 'de',
          'EPA': 'fr',
          'TYO': 'jp',
          'SHE': 'cn',
          'SHZ': 'cn',
          'KRX': 'kr',
          'BSE': 'in',
          'NSE': 'in',
          'ASX': 'au'
        };
        countryCode = exchangeMap[exchange] || 'us';
      }

      return countryCode;
    };

    const countryCode = getCountryCode(
      profile?.country || fmpCompany.country || '', 
      fmpCompany.exchangeShortName || ''
    );

    const getCountryName = (countryCode: string): string => {
      const countryNames: Record<string, string> = {
        'us': 'United States',
        'ca': 'Canada',
        'gb': 'United Kingdom',
        'de': 'Germany',
        'fr': 'France',
        'jp': 'Japan',
        'cn': 'China',
        'kr': 'South Korea',
        'in': 'India',
        'au': 'Australia',
        'nl': 'Netherlands',
        'ch': 'Switzerland',
        'se': 'Sweden',
        'dk': 'Denmark',
        'no': 'Norway',
        'fi': 'Finland'
      };
      return countryNames[countryCode] || 'United States';
    };

    return {
      name: profile?.companyName || fmpCompany.companyName || fmpCompany.name,
      symbol: fmpCompany.symbol,
      marketCap: fmpCompany.marketCap.toString(),
      price: fmpCompany.price.toFixed(2),
      dailyChange: (fmpCompany.change || 0).toFixed(2),
      dailyChangePercent: (fmpCompany.changesPercentage || 0).toFixed(2),
      country: getCountryName(countryCode),
      countryCode,
      rank,
      logoUrl: profile?.image || `https://logo.clearbit.com/${this.getDomainFromCompanyName(fmpCompany.companyName || fmpCompany.name)}`
    };
  }

  private getDomainFromCompanyName(companyName: string): string {
    // Simple domain mapping for major companies
    const domainMap: Record<string, string> = {
      'Apple Inc.': 'apple.com',
      'Microsoft Corporation': 'microsoft.com',
      'Alphabet Inc.': 'google.com',
      'Amazon.com Inc.': 'amazon.com',
      'Tesla, Inc.': 'tesla.com',
      'Meta Platforms, Inc.': 'meta.com',
      'NVIDIA Corporation': 'nvidia.com',
      'Berkshire Hathaway Inc.': 'berkshirehathaway.com',
      'Taiwan Semiconductor Manufacturing Company Limited': 'tsmc.com',
      'JPMorgan Chase & Co.': 'jpmorgan.com',
      'Johnson & Johnson': 'jnj.com',
      'Visa Inc.': 'visa.com',
      'Procter & Gamble Company': 'pg.com',
      'Mastercard Incorporated': 'mastercard.com',
      'UnitedHealth Group Incorporated': 'unitedhealth.com',
      'Home Depot, Inc.': 'homedepot.com',
      'Pfizer Inc.': 'pfizer.com',
      'Coca-Cola Company': 'coca-cola.com',
      'Bank of America Corporation': 'bankofamerica.com',
      'Oracle Corporation': 'oracle.com'
    };

    const domain = domainMap[companyName];
    if (domain) return domain;

    // Fallback: create domain from company name
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')[0] + '.com';
  }
}

export const financialDataService = new FinancialDataService();