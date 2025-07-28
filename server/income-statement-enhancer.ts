import type { InsertCompany } from "@shared/schema";

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const FMP_API_KEY = process.env.FMP_API_KEY;

export interface IncomeStatementData {
  symbol: string;
  date: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  researchAndDevelopmentExpenses: number;
  generalAndAdministrativeExpenses: number;
  sellingAndMarketingExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
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

export class IncomeStatementEnhancer {
  private async makeRequest(endpoint: string): Promise<any> {
    if (!FMP_API_KEY) {
      throw new Error("FMP_API_KEY is not configured");
    }

    const url = `${FMP_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${FMP_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async getIncomeStatement(symbol: string): Promise<IncomeStatementData | null> {
    try {
      const incomeStatements = await this.makeRequest(`/income-statement/${symbol}?limit=1`);
      
      if (Array.isArray(incomeStatements) && incomeStatements.length > 0) {
        return incomeStatements[0];
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching income statement for ${symbol}:`, error);
      return null;
    }
  }

  async enhanceCompanyWithIncomeStatement(symbol: string, existingCompany: any): Promise<Partial<InsertCompany>> {
    const incomeStatement = await this.getIncomeStatement(symbol);
    
    if (!incomeStatement) {
      return {};
    }

    // Calculate key financial ratios
    const grossMargin = incomeStatement.grossProfitRatio * 100;
    const operatingMargin = incomeStatement.operatingIncomeRatio * 100;
    const netMargin = incomeStatement.netIncomeRatio * 100;
    const ebitdaMargin = incomeStatement.ebitdaratio * 100;

    return {
      // Core income statement items
      revenue: incomeStatement.revenue,
      grossProfit: incomeStatement.grossProfit,
      operatingIncome: incomeStatement.operatingIncome,
      netIncome: incomeStatement.netIncome,
      
      // Additional financial metrics that can be stored
      industry: existingCompany.industry || `Revenue: $${(incomeStatement.revenue / 1e9).toFixed(1)}B`,
      sector: existingCompany.sector || `Net Margin: ${netMargin.toFixed(1)}%`,
      description: existingCompany.description || 
        `Revenue: $${(incomeStatement.revenue / 1e9).toFixed(1)}B | ` +
        `Gross Profit: $${(incomeStatement.grossProfit / 1e9).toFixed(1)}B | ` +
        `Operating Income: $${(incomeStatement.operatingIncome / 1e9).toFixed(1)}B | ` +
        `Net Income: $${(incomeStatement.netIncome / 1e9).toFixed(1)}B | ` +
        `EBITDA: $${(incomeStatement.ebitda / 1e9).toFixed(1)}B | ` +
        `Gross Margin: ${grossMargin.toFixed(1)}% | ` +
        `Operating Margin: ${operatingMargin.toFixed(1)}% | ` +
        `Net Margin: ${netMargin.toFixed(1)}% | ` +
        `EPS: $${incomeStatement.eps.toFixed(2)}`
    };
  }

  async batchEnhanceCompanies(symbols: string[], existingCompanies: Map<string, any>): Promise<Map<string, Partial<InsertCompany>>> {
    const results = new Map<string, Partial<InsertCompany>>();
    
    console.log(`Enhancing income statement data for ${symbols.length} companies...`);
    
    for (const symbol of symbols) {
      try {
        const existingCompany = existingCompanies.get(symbol) || {};
        const enhancement = await this.enhanceCompanyWithIncomeStatement(symbol, existingCompany);
        results.set(symbol, enhancement);
        
        if (enhancement.revenue) {
          console.log(`✓ ${symbol}: Revenue $${(enhancement.revenue / 1e9).toFixed(1)}B, Net Income $${((enhancement.netIncome || 0) / 1e9).toFixed(1)}B`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`Error enhancing ${symbol}:`, error);
        results.set(symbol, {});
      }
    }
    
    return results;
  }
}

export const incomeStatementEnhancer = new IncomeStatementEnhancer();