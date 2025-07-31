import { storage } from './storage';

interface FinancialMetrics {
  symbol: string;
  revenue: number;
  netIncome: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  totalDebt: number;
  totalAssets: number;
  peRatio: number;
  eps: number;
  grossProfit: number;
  operatingIncome: number;
}

interface IncomeStatementData {
  date: string;
  symbol: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  epsdiluted: number;
}

interface CashFlowData {
  date: string;
  symbol: string;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
}

interface BalanceSheetData {
  date: string;
  symbol: string;
  totalAssets: number;
  totalDebt: number;
  totalStockholdersEquity: number;
}

interface QuoteData {
  symbol: string;
  pe: number;
  eps: number;
}

class FinancialDataEnhancer {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('FMP_API_KEY environment variable is required');
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const url = `https://financialmodelingprep.com/api/v3${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${this.apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FMP API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return response.json();
  }

  // Get financial metrics for a single company
  async getFinancialMetrics(symbol: string): Promise<FinancialMetrics | null> {
    try {
      console.log(`Fetching financial data for ${symbol}...`);
      
      // Fetch all required data in parallel
      const [incomeStatement, cashFlow, balanceSheet, quote] = await Promise.all([
        this.makeRequest(`/income-statement/${symbol}?limit=1`).catch(() => null),
        this.makeRequest(`/cash-flow-statement/${symbol}?limit=1`).catch(() => null),
        this.makeRequest(`/balance-sheet-statement/${symbol}?limit=1`).catch(() => null),
        this.makeRequest(`/quote/${symbol}`).catch(() => null)
      ]);

      const incomeData: IncomeStatementData = Array.isArray(incomeStatement) && incomeStatement.length > 0 ? incomeStatement[0] : null;
      const cashFlowData: CashFlowData = Array.isArray(cashFlow) && cashFlow.length > 0 ? cashFlow[0] : null;
      const balanceData: BalanceSheetData = Array.isArray(balanceSheet) && balanceSheet.length > 0 ? balanceSheet[0] : null;
      const quoteData: QuoteData = Array.isArray(quote) && quote.length > 0 ? quote[0] : null;

      return {
        symbol,
        revenue: incomeData?.revenue || 0,
        netIncome: incomeData?.netIncome || 0,
        grossProfit: incomeData?.grossProfit || 0,
        operatingIncome: incomeData?.operatingIncome || 0,
        operatingCashFlow: cashFlowData?.operatingCashFlow || 0,
        freeCashFlow: cashFlowData?.freeCashFlow || 0,
        totalDebt: balanceData?.totalDebt || 0,
        totalAssets: balanceData?.totalAssets || 0,
        peRatio: quoteData?.pe || 0,
        eps: quoteData?.eps || incomeData?.epsdiluted || 0
      };

    } catch (error) {
      console.error(`Error fetching financial data for ${symbol}:`, error);
      return null;
    }
  }

  // Enhance all companies with financial data
  async enhanceAllCompaniesFinancialData(): Promise<{ updated: number; errors: number }> {
    console.log("🏦 Starting financial data enhancement for all S&P 500 companies...");
    
    try {
      // Get all companies from database
      const companies = await storage.getCompanies(1000); // Get all companies
      console.log(`📊 Enhancing financial data for ${companies.length} companies`);
      
      let updated = 0;
      let errors = 0;
      
      // Process companies in batches to respect API limits
      const batchSize = 5; // Small batch size to avoid rate limits
      
      for (let i = 0; i < companies.length; i += batchSize) {
        const batch = companies.slice(i, i + batchSize);
        
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(companies.length/batchSize)}: ${batch.map(c => c.symbol).join(', ')}`);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (company) => {
          try {
            const metrics = await this.getFinancialMetrics(company.symbol);
            
            if (metrics) {
              await storage.updateCompany(company.symbol, {
                revenue: metrics.revenue.toString(),
                netIncome: metrics.netIncome.toString(),
                grossProfit: metrics.grossProfit.toString(),
                operatingIncome: metrics.operatingIncome.toString(),
                totalAssets: metrics.totalAssets.toString(),
                totalDebt: metrics.totalDebt.toString(),
                peRatio: metrics.peRatio.toString(),
                eps: metrics.eps.toString()
              });
              updated++;
              console.log(`✅ Updated ${company.symbol} with financial data`);
            } else {
              errors++;
              console.log(`❌ Failed to get financial data for ${company.symbol}`);
            }
          } catch (error) {
            errors++;
            console.error(`❌ Error processing ${company.symbol}:`, error);
          }
        });
        
        await Promise.allSettled(batchPromises);
        
        // Rate limiting between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Progress update every 50 companies
        if ((i + batchSize) % 50 === 0) {
          console.log(`📈 Progress: ${updated} companies updated, ${errors} errors so far`);
        }
      }
      
      console.log(`🎉 Financial data enhancement complete:`);
      console.log(`✅ Updated: ${updated} companies`);
      console.log(`❌ Errors: ${errors} companies`);
      
      return { updated, errors };
      
    } catch (error) {
      console.error("Error enhancing financial data:", error);
      throw error;
    }
  }

  // Quick enhancement for specific symbols
  async enhanceSpecificCompanies(symbols: string[]): Promise<{ updated: number; errors: number }> {
    console.log(`🏦 Enhancing financial data for specific companies: ${symbols.join(', ')}`);
    
    let updated = 0;
    let errors = 0;
    
    for (const symbol of symbols) {
      try {
        const metrics = await this.getFinancialMetrics(symbol);
        
        if (metrics) {
          await storage.updateCompany(symbol, {
            revenue: metrics.revenue.toString(),
            netIncome: metrics.netIncome.toString(),
            grossProfit: metrics.grossProfit.toString(),
            operatingIncome: metrics.operatingIncome.toString(),
            totalAssets: metrics.totalAssets.toString(),
            totalDebt: metrics.totalDebt.toString(),
            peRatio: metrics.peRatio.toString(),
            eps: metrics.eps.toString()
          });
          updated++;
          console.log(`✅ Enhanced ${symbol} with financial data`);
        } else {
          errors++;
          console.log(`❌ Failed to enhance ${symbol}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error enhancing ${symbol}:`, error);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return { updated, errors };
  }
}

export const financialDataEnhancer = new FinancialDataEnhancer();

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  financialDataEnhancer.enhanceAllCompaniesFinancialData()
    .then(result => {
      console.log("Financial data enhancement completed:", result);
      process.exit(0);
    })
    .catch(error => {
      console.error("Financial data enhancement failed:", error);
      process.exit(1);
    });
}