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

    const url = `${FMP_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${FMP_API_KEY}`;
    console.log(`Fetching: ${endpoint}`);
    console.log(`Full URL: ${url.replace(FMP_API_KEY, '[HIDDEN]')}`);
    
    const response = await fetch(url);
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Error response body: ${errorText}`);
      throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async fetchTopCompaniesByMarketCap(limit: number = 100): Promise<FMPCompany[]> {
    try {
      console.log("Fetching complete stock list from FMP...");
      
      // Step 1: Use multiple strategies to get comprehensive company list
      console.log("Using multi-strategy approach to build comprehensive stock universe...");
      
      const allCompaniesSet = new Set<string>();
      
      // Strategy A: Major US exchanges 
      const usExchanges = ['NYSE', 'NASDAQ'];
      for (const exchange of usExchanges) {
        try {
          const companies = await this.makeRequest(`/stock-screener?exchange=${exchange}&marketCapMoreThan=1000000&limit=5000&isActivelyTrading=true`);
          if (Array.isArray(companies)) {
            companies.forEach(c => {
              if (c.symbol && !this.isIndexFundOrETF(c.symbol, c.companyName || c.name)) {
                allCompaniesSet.add(c.symbol);
              }
            });
            console.log(`Added ${companies.length} symbols from ${exchange}, total unique: ${allCompaniesSet.size}`);
          }
        } catch (error) {
          console.error(`Error fetching from ${exchange}:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Strategy B: Market cap ranges
      const mcRanges = [1000000000, 100000000, 10000000];
      for (const mcMin of mcRanges) {
        try {
          const companies = await this.makeRequest(`/stock-screener?marketCapMoreThan=${mcMin}&limit=3000&isActivelyTrading=true`);
          if (Array.isArray(companies)) {
            companies.forEach(c => {
              if (c.symbol && !this.isIndexFundOrETF(c.symbol, c.companyName || c.name)) {
                allCompaniesSet.add(c.symbol);
              }
            });
            console.log(`Added from $${mcMin}+ market cap, total unique: ${allCompaniesSet.size}`);
          }
        } catch (error) {
          console.error(`Error fetching $${mcMin}+ companies:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const realCompanySymbols = Array.from(allCompaniesSet);
      console.log(`Built comprehensive universe: ${realCompanySymbols.length} unique company symbols`);
      
      // Step 3: Get market data for these companies in batches
      const allCompanies: FMPCompany[] = [];
      const batchSize = 100; // Process in smaller batches to avoid rate limits
      
      for (let i = 0; i < realCompanySymbols.length && allCompanies.length < limit; i += batchSize) {
        const batch = realCompanySymbols.slice(i, i + batchSize);
        const symbolsString = batch.join(',');
        
        try {
          console.log(`Fetching market data for batch ${Math.floor(i/batchSize) + 1} (${batch.length} symbols)...`);
          
          // Get real-time quotes for this batch
          const quotes = await this.makeRequest(`/quote/${symbolsString}`);
          
          if (Array.isArray(quotes)) {
            const validQuotes = quotes.filter(quote => 
              quote.marketCap && 
              quote.marketCap > 0 && 
              quote.symbol && 
              quote.name &&
              quote.price &&
              quote.price > 0 &&
              !this.isIndexFundOrETF(quote.symbol, quote.name)
            );
            
            // Get company profiles for enhanced data
            console.log(`Fetching profiles for ${validQuotes.length} companies...`);
            const profiles = await this.fetchMultipleCompanyProfiles(validQuotes.map(q => q.symbol));
            const profileMap = new Map(profiles.map(p => [p.symbol, p]));
            
            // Get financial statements for revenue and profit data
            console.log(`Fetching financial data for ${Math.min(validQuotes.length, 20)} top companies...`);
            const financialPromises = validQuotes.slice(0, 20).map(quote => 
              this.makeRequest(`/income-statement/${quote.symbol}?limit=1`).catch(err => {
                console.log(`No financial data for ${quote.symbol}`);
                return null;
              })
            );
            const financialResults = await Promise.all(financialPromises);
            const financialMap = new Map();
            financialResults.forEach((financial, index) => {
              if (financial && Array.isArray(financial) && financial.length > 0) {
                financialMap.set(validQuotes[index].symbol, financial[0]);
              }
            });
            
            // Convert to our company format with enhanced data
            const companies = validQuotes.map(quote => {
              const profile = profileMap.get(quote.symbol);
              const financials = financialMap.get(quote.symbol);
              return {
                symbol: quote.symbol,
                companyName: quote.name,
                name: quote.name,
                marketCap: quote.marketCap,
                price: quote.price,
                change: quote.change || 0,
                changesPercentage: quote.changesPercentage || 0,
                country: this.getCountryFromExchange(quote.exchange),
                exchangeShortName: quote.exchange,
                exchange: quote.exchange,
                // Enhanced quote data
                pe: quote.pe,
                eps: quote.eps,
                volume: quote.volume,
                avgVolume: quote.avgVolume,
                dayLow: quote.dayLow,
                dayHigh: quote.dayHigh,
                yearLow: quote.yearLow,
                yearHigh: quote.yearHigh,
                // Profile data
                profile: profile,
                // Financial statement data
                financials: financials
              };
            });
            
            allCompanies.push(...companies);
            console.log(`Added ${companies.length} companies with profiles from batch. Total: ${allCompanies.length}`);
          }
        } catch (error) {
          console.error(`Error fetching batch starting at ${i}:`, error);
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      

      
      // Prioritize US companies and sort by market cap
      const finalCompanies = allCompanies
        .sort((a, b) => {
          // First prioritize US companies
          const aIsUS = (a.country === 'US' || a.country === 'United States' || a.exchangeShortName === 'NYSE' || a.exchangeShortName === 'NASDAQ');
          const bIsUS = (b.country === 'US' || b.country === 'United States' || b.exchangeShortName === 'NYSE' || b.exchangeShortName === 'NASDAQ');
          
          if (aIsUS && !bIsUS) return -1;
          if (!aIsUS && bIsUS) return 1;
          
          // Then sort by market cap within each group
          return b.marketCap - a.marketCap;
        })
        .slice(0, limit);
      
      console.log(`Final result: ${finalCompanies.length} companies after deduplication and sorting`);
      return finalCompanies;
      
    } catch (error) {
      console.error("Error in comprehensive company fetch:", error);
      throw error;
    }
  }

  // Method to get total count of available companies
  async getTotalAvailableCompanies(): Promise<number> {
    try {
      // Get all tradable stocks list to count total available
      const stocks = await this.makeRequest('/available-traded/list');
      if (Array.isArray(stocks)) {
        const realCompanies = stocks.filter(stock => 
          stock.symbol && 
          stock.name && 
          !this.isIndexFundOrETF(stock.symbol, stock.name)
        );
        console.log(`Total available companies from API: ${realCompanies.length}`);
        return realCompanies.length;
      }
      return 0;
    } catch (error) {
      console.error("Error getting total companies count:", error);
      // If we can't get the exact count, return an estimate based on FMP documentation
      return 70000; // FMP has ~70,000 actively traded stocks
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

  async fetchCashFlowStatement(symbol: string, limit: number = 1): Promise<any[] | null> {
    try {
      const data = await this.makeRequest(`/cash-flow-statement/${symbol}?limit=${limit}`);
      return Array.isArray(data) ? data : null;
    } catch (error) {
      console.error(`Error fetching cash flow statement for ${symbol}:`, error);
      return null;
    }
  }

  async fetchIncomeStatement(symbol: string, limit: number = 10): Promise<any[] | null> {
    try {
      const data = await this.makeRequest(`/income-statement/${symbol}?limit=${limit}`);
      return Array.isArray(data) ? data : null;
    } catch (error) {
      console.error(`Error fetching income statement for ${symbol}:`, error);
      return null;
    }
  }

  // Ratios TTM (includes dividendYieldTTM)
  async fetchCompanyRatiosTTM(symbol: string): Promise<any | null> {
    try {
      const data = await this.makeRequest(`/ratios-ttm/${symbol}`);
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      return null;
    } catch (error) {
      console.error(`Error fetching ratios TTM for ${symbol}:`, error);
      return null;
    }
  }

  async fetchHistoricalData(symbol: string, from: string, to: string): Promise<any[] | null> {
    try {
      const data = await this.makeRequest(`/historical-price-full/${symbol}?from=${from}&to=${to}`);
      return data.historical || [];
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return null;
    }
  }

  convertToCompanySchema(fmpCompany: any, rank: number, profile?: FMPCompanyProfile): InsertCompany {
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

    // Parse numerical values safely
    const parseDecimal = (value: any): string => {
      return value ? parseFloat(value).toString() : "0";
    };
    
    const parseInteger = (value: any): number => {
      return value ? parseInt(value.toString().replace(/,/g, '')) : 0;
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
      logoUrl: profile?.image || this.getLogoUrl(fmpCompany.symbol, fmpCompany.companyName || fmpCompany.name),
      
      // Enhanced data from profile and quote
      industry: (profile as any)?.industry || null,
      sector: (profile as any)?.sector || null,
      website: (profile as any)?.website || null,
      description: (profile as any)?.description || null,
      ceo: (profile as any)?.ceo || null,
      employees: (profile as any)?.fullTimeEmployees ? parseInteger((profile as any).fullTimeEmployees) : null,
      
      // Key financial metrics (will be populated from quote data)
      peRatio: fmpCompany.pe ? parseDecimal(fmpCompany.pe) : null,
      eps: fmpCompany.eps ? parseDecimal(fmpCompany.eps) : null,
      beta: (profile as any)?.beta ? parseDecimal((profile as any).beta) : null,
      dividendYield: (profile as any)?.lastDiv ? parseDecimal((profile as any).lastDiv) : null,
      
      // Trading metrics (from quote data)
      volume: fmpCompany.volume || null,
      avgVolume: fmpCompany.avgVolume || null,
      dayLow: fmpCompany.dayLow ? parseDecimal(fmpCompany.dayLow) : null,
      dayHigh: fmpCompany.dayHigh ? parseDecimal(fmpCompany.dayHigh) : null,
      yearLow: fmpCompany.yearLow ? parseDecimal(fmpCompany.yearLow) : null,
      yearHigh: fmpCompany.yearHigh ? parseDecimal(fmpCompany.yearHigh) : null,
      
      // Financial statement data (from income statement)
      revenue: fmpCompany.financials?.revenue ? parseInteger(fmpCompany.financials.revenue) : null,
      grossProfit: fmpCompany.financials?.grossProfit ? parseInteger(fmpCompany.financials.grossProfit) : null,
      operatingIncome: fmpCompany.financials?.operatingIncome ? parseInteger(fmpCompany.financials.operatingIncome) : null,
      netIncome: fmpCompany.financials?.netIncome ? parseInteger(fmpCompany.financials.netIncome) : null,
      totalAssets: fmpCompany.financials?.totalAssets ? parseInteger(fmpCompany.financials.totalAssets) : null,
      totalEquity: (fmpCompany as any).financials?.totalStockholdersEquity ? parseInteger((fmpCompany as any).financials.totalStockholdersEquity) : null,
      totalDebt: fmpCompany.financials?.totalDebt ? parseInteger(fmpCompany.financials.totalDebt) : null,
      cashAndEquivalents: fmpCompany.financials?.cashAndCashEquivalents ? parseInteger(fmpCompany.financials.cashAndCashEquivalents) : null,
    };
  }

  private getLogoUrl(symbol: string, companyName: string): string {
    // Symbol-based logo mapping for better accuracy
    const symbolToLogoMap: Record<string, string> = {
      'AAPL': 'https://logo.clearbit.com/apple.com',
      'MSFT': 'https://logo.clearbit.com/microsoft.com', 
      'GOOGL': 'https://logo.clearbit.com/google.com',
      'GOOG': 'https://logo.clearbit.com/google.com',
      'AMZN': 'https://logo.clearbit.com/amazon.com',
      'TSLA': 'https://logo.clearbit.com/tesla.com',
      'META': 'https://logo.clearbit.com/meta.com',
      'NVDA': 'https://logo.clearbit.com/nvidia.com',
      'BRK-B': 'https://logo.clearbit.com/berkshirehathaway.com',
      'BRK.B': 'https://logo.clearbit.com/berkshirehathaway.com',
      'TSM': 'https://logo.clearbit.com/tsmc.com',
      'V': 'https://logo.clearbit.com/visa.com',
      'JPM': 'https://logo.clearbit.com/jpmorganchase.com',
      'JNJ': 'https://logo.clearbit.com/jnj.com',
      'WMT': 'https://logo.clearbit.com/walmart.com',
      'PG': 'https://logo.clearbit.com/pg.com',
      'MA': 'https://logo.clearbit.com/mastercard.com',
      'UNH': 'https://logo.clearbit.com/unitedhealthgroup.com',
      'HD': 'https://logo.clearbit.com/homedepot.com',
      'ORCL': 'https://logo.clearbit.com/oracle.com',
      'CVX': 'https://logo.clearbit.com/chevron.com',
      'KO': 'https://logo.clearbit.com/coca-cola.com',
      'PFE': 'https://logo.clearbit.com/pfizer.com',
      'BAC': 'https://logo.clearbit.com/bankofamerica.com',
      'ABBV': 'https://logo.clearbit.com/abbvie.com',
      'CRM': 'https://logo.clearbit.com/salesforce.com',
      'NFLX': 'https://logo.clearbit.com/netflix.com',
      'ADBE': 'https://logo.clearbit.com/adobe.com',
      'CSCO': 'https://logo.clearbit.com/cisco.com',
      'ACN': 'https://logo.clearbit.com/accenture.com',
      'TMO': 'https://logo.clearbit.com/thermofisher.com',
      'DHR': 'https://logo.clearbit.com/danaher.com',
      'DIS': 'https://logo.clearbit.com/disney.com',
      'MCD': 'https://logo.clearbit.com/mcdonalds.com',
      'VZ': 'https://logo.clearbit.com/verizon.com',
      'CMCSA': 'https://logo.clearbit.com/comcast.com',
      'NVO': 'https://logo.clearbit.com/novonordisk.com',
      'ASML': 'https://logo.clearbit.com/asml.com',
      'NKE': 'https://logo.clearbit.com/nike.com',
      'INTC': 'https://logo.clearbit.com/intel.com',
      'IBM': 'https://logo.clearbit.com/ibm.com',
      'GE': 'https://logo.clearbit.com/ge.com',
      'F': 'https://logo.clearbit.com/ford.com',
      'T': 'https://logo.clearbit.com/att.com',
      'GM': 'https://logo.clearbit.com/gm.com',
      'SBUX': 'https://logo.clearbit.com/starbucks.com',
      'PYPL': 'https://logo.clearbit.com/paypal.com',
      'UBER': 'https://logo.clearbit.com/uber.com',
      'SHOP': 'https://logo.clearbit.com/shopify.com'
    };

    // Try symbol first
    if (symbolToLogoMap[symbol]) {
      return symbolToLogoMap[symbol];
    }

    // Fallback to domain-based mapping
    return `https://logo.clearbit.com/${this.getDomainFromCompanyName(companyName)}`;
  }

  private getCountryFromExchange(exchange: string): string {
    const exchangeToCountry: Record<string, string> = {
      'NASDAQ': 'US',
      'NYSE': 'US', 
      'AMEX': 'US',
      'TSX': 'CA',
      'LSE': 'GB',
      'FRA': 'DE',
      'EPA': 'FR',
      'TYO': 'JP',
      'SHE': 'CN',
      'SHZ': 'CN',
      'KRX': 'KR',
      'BSE': 'IN',
      'NSE': 'IN',
      'ASX': 'AU',
      'SIX': 'CH',
      'AMS': 'NL',
      'BRU': 'BE',
      'HEL': 'FI',
      'STO': 'SE',
      'OSL': 'NO',
      'CPH': 'DK'
    };
    
    return exchangeToCountry[exchange] || 'US';
  }

  isIndexFundOrETF(symbol: string, companyName: string): boolean {
    // Comprehensive ETF and index fund patterns
    const excludePatterns = [
      // Core ETF patterns
      /ETF/i, /UCITS/i, /Index/i, /Fund/i, /Trust/i, /DR/i,
      
      // European ETF providers (major culprits)
      /Lyxor/i, /Xtrackers/i, /Amundi/i, /iShares/i, /Vanguard/i,
      /STOXX/i, /MSCI/i, /Core/i, /Prime/i, /ESG/i, /Broad/i, /CTB/i,
      
      // Exchange suffixes that indicate ETFs
      /\.L$/i, /\.PA$/i, /\.DE$/i, /\.MI$/i, /\.AS$/i, /\.SW$/i,
      
      // US ETF patterns
      /^(SPY|QQQ|IWM|EFA|EEM|VTI|VOO|VEA|VWO|AGG|LQD|TLT|GLD|SLV|USO)$/i,
      /^(XLF|XLE|XLI|XLK|XLV|XLY|XLP|XLB|XLU|XLRE|XBI|XME|XRT|IYR|SOXX)$/i,
      /^(ARKK|ARKQ|ARKW|ARKG|ARKF|JETS|KWEB|ICLN|BOTZ|ESPO)$/i,
      
      // Specific problem symbols we've seen
      /^(MEUD|XMEU|XSX6|CEUR|PRIR|0R15)$/i,
      
      // Numbered or coded symbols (often ETFs)
      /^[0-9][A-Z][0-9][0-9]/i, // Pattern like "0R15"
      /^[A-Z]{4,6}\.L$/i,        // London exchange ETFs
      
      // Common fund keywords
      /Solutions/i, /Select/i, /Choice/i, /Portfolio/i,
      // SPDR funds
      /^SPY|SPDR/i,
      // Other common patterns
      /Index.*Fund/i,
      /Target.*Date/i,
      /Institutional.*Plus/i,
      /Admiral.*Shares/i,
      /Investor.*Shares/i,
      /Fund.*Class/i,
      /Trust.*Series/i,
      // Mutual fund share classes
      /Class [A-Z]$/i,
      /Inst(?:itutional)?$/i,
      /Adm(?:iral)?$/i,
      /Inv(?:estor)?$/i,
      // Currency and commodity ETFs
      /Currency/i,
      /Gold|Silver|Oil|Gas|Coal/i,
      // Sector and strategy funds with generic names
      /Select.*Sector/i,
      /Global.*Fund/i,
      /International.*Fund/i,
      /Emerging.*Markets/i,
      /Small.*Cap/i,
      /Mid.*Cap/i,
      /Large.*Cap/i,
      /Growth.*Fund/i,
      /Value.*Fund/i,
      /Bond.*Fund/i,
      /Fixed.*Income/i,
      /Money.*Market/i,
      // REITs that are funds
      /REIT.*Fund/i,
      /Real.*Estate.*Fund/i
    ];

    // Check symbol and company name against patterns
    for (const pattern of excludePatterns) {
      if (pattern.test(symbol) || pattern.test(companyName)) {
        return true;
      }
    }

    // Additional checks for specific fund families
    const fundFamilyKeywords = [
      'Vanguard', 'Fidelity', 'iShares', 'SPDR', 'Invesco', 'Schwab',
      'ProShares', 'VanEck', 'First Trust', 'WisdomTree', 'PowerShares',
      'American Funds', 'Franklin', 'T. Rowe Price', 'Janus Henderson',
      'BlackRock', 'State Street', 'Northern Trust', 'Dimensional'
    ];

    // If company name contains fund family keywords and fund-like terms
    const hasFundFamily = fundFamilyKeywords.some(family => 
      companyName.toLowerCase().includes(family.toLowerCase())
    );
    
    const hasFundTerms = [
      'fund', 'etf', 'index', 'trust', 'portfolio', 'series', 'shares'
    ].some(term => companyName.toLowerCase().includes(term));

    return hasFundFamily && hasFundTerms;
  }

  private getDomainFromCompanyName(companyName: string): string {
    // Simple domain mapping for major companies
    const domainMap: Record<string, string> = {
      'Apple Inc.': 'apple.com',
      'Microsoft Corporation': 'microsoft.com',
      'Alphabet Inc.': 'google.com',
      'Amazon.com Inc.': 'amazon.com',
      'Amazon.com, Inc.': 'amazon.com',
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