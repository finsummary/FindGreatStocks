import { companies, nasdaq100Companies, sp500Companies, watchlist, users, type User, type UpsertUser, type Company, type Nasdaq100Company, type InsertCompany, type InsertNasdaq100Company, type Watchlist, type InsertWatchlist, type DowJonesCompany, type InsertDowJonesCompany, dowJonesCompanies } from "@shared/schema";
import { db, supabase } from "./db";
import { eq, sql, desc, asc, and, or, ilike, inArray, SQL } from "drizzle-orm";

// Add a lightweight FTSE 100 type alias to avoid schema dependency
export type Ftse100Company = any;

export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<void>;
  
  // Company methods
  getCompanies(limit?: number, offset?: number, sortBy?: string, sortOrder?: 'asc' | 'desc', search?: string, country?: string): Promise<Company[]>;
  getCompanyCount(search?: string, country?: string): Promise<number>;
  getCompanyBySymbol(symbol: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(symbol: string, updates: Partial<Company>): Promise<void>;
  clearAllCompanies(): Promise<void>;
  
  // Nasdaq 100 methods
  getNasdaq100Companies(limit?: number, offset?: number, sortBy?: string, sortOrder?: 'asc' | 'desc', search?: string): Promise<Nasdaq100Company[]>;
  getNasdaq100CompanyCount(search?: string): Promise<number>;
  getNasdaq100CompanyBySymbol(symbol: string): Promise<Nasdaq100Company | undefined>;
  
  // S&P 500 methods
  getSp500Companies(limit?: number, offset?: number, sortBy?: string, sortOrder?: 'asc' | 'desc', search?: string): Promise<any[]>;
  getSp500CompanyCount(search?: string): Promise<number>;

  // Dow Jones methods
  getDowJonesCompanies(limit?: number, offset?: number, sortBy?: string, sortOrder?: 'asc' | 'desc', search?: string): Promise<DowJonesCompany[]>;
  getDowJonesCompanyCount(search?: string): Promise<number>;
  getDowJonesCompanyBySymbol(symbol: string): Promise<DowJonesCompany | undefined>;
  
  // FTSE 100 methods
  getFtse100Companies(limit?: number, offset?: number, sortBy?: string, sortOrder?: 'asc' | 'desc', search?: string): Promise<Ftse100Company[]>;
  getFtse100CompanyCount(search?: string): Promise<number>;
  getFtse100CompanyBySymbol(symbol: string): Promise<Ftse100Company | undefined>;

  /** SEO: get company by ticker from any index (sp500, nasdaq100, dowjones, ftse100) */
  getCompanyByTickerFromAnyIndex(symbol: string): Promise<any | undefined>;

  // Watchlist methods
  getWatchlist(userId: string): Promise<Watchlist[]>;
  getWatchlistCompanies(userId: string): Promise<Company[]>;
  addToWatchlist(companySymbol: string, userId: string): Promise<Watchlist>;
  removeFromWatchlist(companySymbol: string, userId: string): Promise<void>;
  isInWatchlist(companySymbol: string, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(user: UpsertUser): Promise<void> {
    console.log(`Upserting user: ${user.id} (${user.email})`);
    await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        updatedAt: new Date(),
        subscriptionTier: user.subscriptionTier || 'free',
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          updatedAt: new Date(),
        },
      });
    console.log(`Upsert successful for user: ${user.id}`);
  }

  async getCompanies(limit = 50, offset = 0, sortBy = 'rank', sortOrder: 'asc' | 'desc' = 'asc', search?: string): Promise<Company[]> {
    const normalize = (value: unknown) => {
      if (value == null || value === '') return null;
      const num = Number(value);
      return Number.isNaN(num) ? value : num;
    };

    const compare = (a: any, b: any) => {
      const av = normalize(a);
      const bv = normalize(b);
      if (av == null && bv == null) return 0;
      if (av == null) return sortOrder === 'asc' ? -1 : 1;
      if (bv == null) return sortOrder === 'asc' ? 1 : -1;
      if (typeof av === 'number' && typeof bv === 'number') return sortOrder === 'asc' ? av - bv : bv - av;
      const res = String(av).localeCompare(String(bv));
      return sortOrder === 'asc' ? res : -res;
    };

    const orderColMap: Record<string, string> = {
      rank: 'rank',
      name: 'name',
      marketCap: 'market_cap',
      price: 'price',
      revenue: 'revenue',
      netIncome: 'net_income',
      peRatio: 'pe_ratio',
      dividendYield: 'dividend_yield',
      freeCashFlow: 'free_cash_flow',
      revenueGrowth10Y: 'revenue_growth_10y',
      return3Year: 'return_3_year',
      return5Year: 'return_5_year',
      return10Year: 'return_10_year',
      maxDrawdown3Year: 'max_drawdown_3_year',
      maxDrawdown5Year: 'max_drawdown_5_year',
      maxDrawdown10Year: 'max_drawdown_10_year',
      dcfImpliedGrowth: 'dcf_implied_growth',
      marginOfSafety: 'margin_of_safety',
      roic: 'roic',
      roe: 'roe',
    };

    const queryData = async () => {
      let query = supabase.from('companies').select('*').order(orderColMap[sortBy] || 'market_cap', { ascending: sortOrder === 'asc', nullsFirst: false });
      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,symbol.ilike.%${search.trim()}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    };

    const data = await queryData().catch(async (error) => {
      console.error('Error fetching companies from main table:', error);
      return [];
    });

    if (data.length > 0) {
      const rows = data.map((row: any) => this.mapDbRowToCompany(row));
      rows.sort((a, b) => compare((a as any)[sortBy], (b as any)[sortBy]));
      return rows.slice(offset, offset + limit);
    }

    // Fallback: combine the populated index tables when `companies` is empty.
    const [sp500, nasdaq, dowJones, ftse100] = await Promise.all([
      supabase.from('sp500_companies').select('*'),
      supabase.from('nasdaq100_companies').select('*'),
      supabase.from('dow_jones_companies').select('*'),
      supabase.from('ftse100_companies').select('*'),
    ]);

    const merged = [...(sp500.data || []), ...(nasdaq.data || []), ...(dowJones.data || []), ...(ftse100.data || [])];
    const unique = new Map<string, any>();
    for (const row of merged) {
      const symbol = String(row?.symbol || '').toUpperCase();
      if (!symbol || unique.has(symbol)) continue;
      unique.set(symbol, row);
    }

    let rows = Array.from(unique.values()).map((row: any) => this.mapDbRowToCompany(row));
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((row: any) => String(row.name || '').toLowerCase().includes(q) || String(row.symbol || '').toLowerCase().includes(q));
    }
    rows.sort((a, b) => compare((a as any)[sortBy], (b as any)[sortBy]));
    return rows.slice(offset, offset + limit);
  }

  private mapDbRowToCompany(row: any): Company {
    // This function is crucial. It maps the snake_case columns from the database
    // to the camelCase properties expected by our TypeScript types and the frontend.
    return {
        id: row.id,
        name: row.name,
        symbol: row.symbol,
        marketCap: row.market_cap,
        price: row.price,
        dailyChange: row.daily_change,
        dailyChangePercent: row.daily_change_percent,
        country: row.country,
        countryCode: row.country_code,
        rank: row.rank,
        logoUrl: row.logo_url,
        industry: row.industry,
        sector: row.sector,
        website: row.website,
        description: row.description,
        ceo: row.ceo,
        employees: row.employees,
        peRatio: row.pe_ratio,
        eps: row.eps,
        beta: row.beta,
        dividendYield: row.dividend_yield,
        priceToSalesRatio: row.price_to_sales_ratio,
        netProfitMargin: row.net_profit_margin,
        revenueGrowth3Y: row.revenue_growth_3y,
        revenueGrowth5Y: row.revenue_growth_5y,
        revenueGrowth10Y: row.revenue_growth_10y,
        volume: row.volume,
        avgVolume: row.avg_volume,
        dayLow: row.day_low,
        dayHigh: row.day_high,
        yearLow: row.year_low,
        yearHigh: row.year_high,
        revenue: row.revenue,
        grossProfit: row.gross_profit,
        operatingIncome: row.operating_income,
        netIncome: row.net_income,
        totalAssets: row.total_assets,
        totalDebt: row.total_debt,
        cashAndEquivalents: row.cash_and_equivalents,
        return3Year: row.return_3_year,
        return5Year: row.return_5_year,
        return10Year: row.return_10_year,
        maxDrawdown10Year: row.max_drawdown_10_year,
        maxDrawdown5Year: row.max_drawdown_5_year,
        maxDrawdown3Year: row.max_drawdown_3_year,
        arMddRatio10Year: row.ar_mdd_ratio_10_year,
        arMddRatio5Year: row.ar_mdd_ratio_5_year,
        arMddRatio3Year: row.ar_mdd_ratio_3_year,
        freeCashFlow: row.free_cash_flow,
        returnDrawdownRatio10Year: row.return_drawdown_ratio_10_year,
        dcfEnterpriseValue: row.dcf_enterprise_value,
        marginOfSafety: row.margin_of_safety,
        dcfImpliedGrowth: row.dcf_implied_growth,
        totalAssets: row.total_assets,
        totalEquity: row.total_equity,
        roe: row.roe,
        assetTurnover: row.asset_turnover,
        financialLeverage: row.financial_leverage,
        // Note: Add any new fields here to ensure they are passed to the frontend
    };
  }

  async getCompanyCount(search?: string): Promise<number> {
    try {
      let query = supabase.from('companies').select('id', { count: 'exact', head: true });
      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,symbol.ilike.%${search.trim()}%`);
      }
      const { count, error } = await query;
      if (error) throw error;
      if ((count || 0) > 0) return count || 0;
    } catch (error) {
      console.error('Error getting company count from main table:', error);
    }

    const [sp500, nasdaq, dowJones, ftse100] = await Promise.all([
      supabase.from('sp500_companies').select('symbol'),
      supabase.from('nasdaq100_companies').select('symbol'),
      supabase.from('dow_jones_companies').select('symbol'),
      supabase.from('ftse100_companies').select('symbol'),
    ]);

    const merged = [...(sp500.data || []), ...(nasdaq.data || []), ...(dowJones.data || []), ...(ftse100.data || [])];
    const unique = new Set<string>();
    for (const row of merged) {
      const symbol = String((row as any)?.symbol || '').toUpperCase();
      if (!symbol) continue;
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        const matches = symbol.toLowerCase().includes(q) || String((row as any)?.name || '').toLowerCase().includes(q);
        if (!matches) continue;
      }
      unique.add(symbol);
    }
    return unique.size;
  }

  async getCompaniesForEnhancement(): Promise<Pick<Company, 'symbol' | 'return3Year' | 'return5Year' | 'return10Year' | 'maxDrawdown3Year' | 'maxDrawdown5Year' | 'maxDrawdown10Year'>[]> {
        try {
            const { data, error } = await supabase
              .from('companies')
              .select('symbol, return_3_year, return_5_year, return_10_year, max_drawdown_3_year, max_drawdown_5_year, max_drawdown_10_year');
            if (error) {
              throw error;
            }
            return (data || []).map((row: any) => ({
              symbol: row.symbol,
              return3Year: row.return_3_year,
              return5Year: row.return_5_year,
              return10Year: row.return_10_year,
              maxDrawdown3Year: row.max_drawdown_3_year,
              maxDrawdown5Year: row.max_drawdown_5_year,
              maxDrawdown10Year: row.max_drawdown_10_year,
            }));
        } catch (error) {
            console.error("Error fetching companies for enhancement:", error);
            throw error;
        }
  }

  async getCompanyBySymbol(symbol: string): Promise<Company | undefined> {
    const upper = String(symbol || '').toUpperCase();
    try {
      const { data, error } = await supabase.from('companies').select('*').eq('symbol', upper).maybeSingle();
      if (!error && data) return this.mapDbRowToCompany(data);
    } catch (error) {
      console.error('Error fetching company from main table:', error);
    }

    const tables = ['sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').eq('symbol', upper).maybeSingle();
      if (!error && data) return this.mapDbRowToCompany(data);
    }
    return undefined;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const payload: Record<string, any> = {
      name: insertCompany.name,
      symbol: insertCompany.symbol,
      market_cap: insertCompany.marketCap,
      price: insertCompany.price,
      daily_change: insertCompany.dailyChange,
      daily_change_percent: insertCompany.dailyChangePercent,
      country: insertCompany.country,
      country_code: insertCompany.countryCode,
      rank: insertCompany.rank,
      logo_url: insertCompany.logoUrl,
      industry: insertCompany.industry,
      sector: insertCompany.sector,
      website: insertCompany.website,
      description: insertCompany.description,
      ceo: insertCompany.ceo,
      employees: insertCompany.employees,
      pe_ratio: insertCompany.peRatio,
      eps: insertCompany.eps,
      beta: insertCompany.beta,
      dividend_yield: insertCompany.dividendYield,
      volume: insertCompany.volume,
      avg_volume: insertCompany.avgVolume,
      day_low: insertCompany.dayLow,
      day_high: insertCompany.dayHigh,
      year_low: insertCompany.yearLow,
      year_high: insertCompany.yearHigh,
      revenue: insertCompany.revenue,
      gross_profit: insertCompany.grossProfit,
      operating_income: insertCompany.operatingIncome,
      net_income: insertCompany.netIncome,
      total_assets: insertCompany.totalAssets,
      total_debt: insertCompany.totalDebt,
      cash_and_equivalents: insertCompany.cashAndEquivalents,
      return_3_year: insertCompany.return3Year,
      return_5_year: insertCompany.return5Year,
      return_10_year: insertCompany.return10Year,
      max_drawdown_10_year: insertCompany.maxDrawdown10Year,
      return_drawdown_ratio_10_year: insertCompany.returnDrawdownRatio10Year,
      ar_mdd_ratio_10_year: insertCompany.arMddRatio10Year,
      max_drawdown_5_year: insertCompany.maxDrawdown5Year,
      max_drawdown_3_year: insertCompany.maxDrawdown3Year,
      ar_mdd_ratio_5_year: insertCompany.arMddRatio5Year,
      ar_mdd_ratio_3_year: insertCompany.arMddRatio3Year,
      price_to_sales_ratio: insertCompany.priceToSalesRatio,
      net_profit_margin: insertCompany.netProfitMargin,
      return_on_equity: insertCompany.returnOnEquity,
      return_on_assets: insertCompany.returnOnAssets,
      debt_to_equity: insertCompany.debtToEquity,
      revenue_growth_3y: insertCompany.revenueGrowth3Y,
      revenue_growth_5y: insertCompany.revenueGrowth5Y,
      revenue_growth_10y: insertCompany.revenueGrowth10Y,
      free_cash_flow: insertCompany.freeCashFlow,
      margin_of_safety: insertCompany.marginOfSafety,
      dcf_implied_growth: insertCompany.dcfImpliedGrowth,
      dcf_enterprise_value: insertCompany.dcfEnterpriseValue,
      total_equity: insertCompany.totalEquity,
      asset_turnover: insertCompany.assetTurnover,
      financial_leverage: insertCompany.financialLeverage,
      dupont_roe: insertCompany.dupontRoe,
      roe: insertCompany.roe,
      roic: insertCompany.roic,
      roic_10y_avg: insertCompany.roic10YAvg,
      roic_10y_std: insertCompany.roic10YStd,
      latest_fcf: insertCompany.latestFcf,
      shares_outstanding: insertCompany.sharesOutstanding,
    };

    const { data, error } = await supabase.from('companies').insert(payload).select('*').single();
    if (error) throw error;
    return this.mapDbRowToCompany(data);
  }

  async updateCompany(symbol: string, updates: Partial<Company>): Promise<void> {
    // Map camelCase keys to snake_case columns used in Supabase
    const map: Record<string, string> = {
      marketCap: 'market_cap',
      dailyChange: 'daily_change',
      dailyChangePercent: 'daily_change_percent',
      countryCode: 'country_code',
      logoUrl: 'logo_url',
      peRatio: 'pe_ratio',
      dividendYield: 'dividend_yield',
      priceToSalesRatio: 'price_to_sales_ratio',
      netProfitMargin: 'net_profit_margin',
      revenueGrowth3Y: 'revenue_growth_3y',
      revenueGrowth5Y: 'revenue_growth_5y',
      revenueGrowth10Y: 'revenue_growth_10y',
      return3Year: 'return_3_year',
      return5Year: 'return_5_year',
      return10Year: 'return_10_year',
      maxDrawdown10Year: 'max_drawdown_10_year',
      maxDrawdown5Year: 'max_drawdown_5_year',
      maxDrawdown3Year: 'max_drawdown_3_year',
      arMddRatio10Year: 'ar_mdd_ratio_10_year',
      arMddRatio5Year: 'ar_mdd_ratio_5_year',
      arMddRatio3Year: 'ar_mdd_ratio_3_year',
      freeCashFlow: 'free_cash_flow',
      returnDrawdownRatio10Year: 'return_drawdown_ratio_10_year',
      dcfEnterpriseValue: 'dcf_enterprise_value',
      marginOfSafety: 'margin_of_safety',
      dcfImpliedGrowth: 'dcf_implied_growth',
      totalAssets: 'total_assets',
      totalEquity: 'total_equity',
    };
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(updates)) {
      const target = map[k] || k;
      payload[target] = v;
    }
    const { error } = await supabase
      .from('companies')
      .update(payload)
      .eq('symbol', symbol);
    if (error) {
      console.error('Supabase updateCompany error:', error);
      throw error;
    }
  }

  async clearAllCompanies(): Promise<void> {
    const { error } = await supabase.from('companies').delete().neq('id', 0);
    if (error) {
      console.error('Supabase clearAllCompanies error:', error);
      throw error;
    }
  }

  // Nasdaq 100 methods
  async getNasdaq100Companies(
    limit: number = 50,
    offset: number = 0,
    sortBy: string = 'marketCap',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string
  ): Promise<Nasdaq100Company[]> {
    try {
      const sortMap: Record<string, string> = {
        rank: 'rank',
        name: 'name',
        marketCap: 'market_cap',
        price: 'price',
        revenue: 'revenue',
        netIncome: 'net_income',
        peRatio: 'pe_ratio',
        dividendYield: 'dividend_yield',
        freeCashFlow: 'free_cash_flow',
        revenueGrowth3Y: 'revenue_growth_3y',
        revenueGrowth5Y: 'revenue_growth_5y',
        revenueGrowth10Y: 'revenue_growth_10y',
        return3Year: 'return_3_year',
        return5Year: 'return_5_year',
        return10Year: 'return_10_year',
        maxDrawdown3Year: 'max_drawdown_3_year',
        maxDrawdown5Year: 'max_drawdown_5_year',
        maxDrawdown10Year: 'max_drawdown_10_year',
        roic: 'roic',
        roe: 'roe',
        dcfImpliedGrowth: 'dcf_implied_growth',
        marginOfSafety: 'margin_of_safety',
      };
      const orderCol = sortMap[sortBy] || 'market_cap';

      let query = supabase
        .from('nasdaq100_companies')
        .select('*')
        .order(orderCol, { ascending: sortOrder === 'asc', nullsFirst: false })
        .range(offset, offset + limit - 1);

      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,symbol.ilike.%${search.trim()}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching Nasdaq 100 companies:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNasdaq100Companies:', error);
      return [];
    }
  }

  async getNasdaq100CompanyCount(search?: string): Promise<number> {
    try {
      let query = supabase
        .from('nasdaq100_companies')
        .select('*', { count: 'exact', head: true });

      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,symbol.ilike.%${search.trim()}%`);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching Nasdaq 100 company count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getNasdaq100CompanyCount:', error);
      return 0;
    }
  }

  async getNasdaq100CompanyBySymbol(symbol: string): Promise<Nasdaq100Company | undefined> {
    const [company] = await db
      .select()
      .from(nasdaq100Companies)
      .where(eq(nasdaq100Companies.symbol, symbol));
    return company;
  }

  // S&P 500 methods
  async getSp500Companies(
    limit: number = 50,
    offset: number = 0,
    sortBy: string = 'marketCap',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string
  ): Promise<any[]> {
    try {
      const sortMap: Record<string, string> = {
        rank: 'rank',
        name: 'name',
        marketCap: 'market_cap',
        price: 'price',
        revenue: 'revenue',
        netIncome: 'net_income',
        peRatio: 'pe_ratio',
        dividendYield: 'dividend_yield',
        freeCashFlow: 'free_cash_flow',
        revenueGrowth3Y: 'revenue_growth_3y',
        revenueGrowth5Y: 'revenue_growth_5y',
        revenueGrowth10Y: 'revenue_growth_10y',
        return3Year: 'return_3_year',
        return5Year: 'return_5_year',
        return10Year: 'return_10_year',
        maxDrawdown3Year: 'max_drawdown_3_year',
        maxDrawdown5Year: 'max_drawdown_5_year',
        maxDrawdown10Year: 'max_drawdown_10_year',
        roic: 'roic',
        roe: 'roe',
        dcfImpliedGrowth: 'dcf_implied_growth',
        marginOfSafety: 'margin_of_safety',
      };
      const orderCol = sortMap[sortBy] || 'market_cap';

      let query = supabase
        .from('sp500_companies')
        .select('*')
        .order(orderCol, { ascending: sortOrder === 'asc', nullsFirst: false })
        .range(offset, offset + limit - 1);

      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,symbol.ilike.%${search.trim()}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching S&P 500 companies:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSp500Companies:', error);
      return [];
    }
  }

  async getSp500CompanyCount(search?: string): Promise<number> {
    try {
      let query = supabase
        .from('sp500_companies')
        .select('*', { count: 'exact', head: true });

      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,symbol.ilike.%${search.trim()}%`);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching S&P 500 company count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getSp500CompanyCount:', error);
      return 0;
    }
  }

  // Dow Jones methods
  async getDowJonesCompanies(
    limit: number = 50,
    offset: number = 0,
    sortBy: string = 'marketCap',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string
  ): Promise<DowJonesCompany[]> {
    try {
      const sortMap: Record<string, string> = {
        rank: 'rank',
        name: 'name',
        marketCap: 'market_cap',
        price: 'price',
        revenue: 'revenue',
        netIncome: 'net_income',
        peRatio: 'pe_ratio',
        dividendYield: 'dividend_yield',
        freeCashFlow: 'free_cash_flow',
        revenueGrowth3Y: 'revenue_growth_3y',
        revenueGrowth5Y: 'revenue_growth_5y',
        revenueGrowth10Y: 'revenue_growth_10y',
        return3Year: 'return_3_year',
        return5Year: 'return_5_year',
        return10Year: 'return_10_year',
        maxDrawdown3Year: 'max_drawdown_3_year',
        maxDrawdown5Year: 'max_drawdown_5_year',
        maxDrawdown10Year: 'max_drawdown_10_year',
        roic: 'roic',
        roe: 'roe',
        dcfImpliedGrowth: 'dcf_implied_growth',
        marginOfSafety: 'margin_of_safety',
      };
      const orderCol = sortMap[sortBy] || 'market_cap';

      let query = supabase
        .from('dow_jones_companies')
        .select('*')
        .order(orderCol, { ascending: sortOrder === 'asc', nullsFirst: false })
        .range(offset, offset + limit - 1);

      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,symbol.ilike.%${search.trim()}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching Dow Jones companies:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getDowJonesCompanies:', error);
      return [];
    }
  }

  async getDowJonesCompanyCount(search?: string): Promise<number> {
    try {
      let query = supabase
        .from('dow_jones_companies')
        .select('*', { count: 'exact', head: true });

      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,symbol.ilike.%${search.trim()}%`);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching Dow Jones company count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getDowJonesCompanyCount:', error);
      return 0;
    }
  }

  async getDowJonesCompanyBySymbol(symbol: string): Promise<DowJonesCompany | undefined> {
    const [company] = await db
      .select()
      .from(dowJonesCompanies)
      .where(eq(dowJonesCompanies.symbol, symbol));
    return company;
  }

  // FTSE 100 methods
  async getFtse100Companies(
    limit: number = 50,
    offset: number = 0,
    sortBy: string = 'marketCap',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string
  ): Promise<Ftse100Company[]> {
    try {
      const sortMap: Record<string, string> = {
        rank: 'rank',
        name: 'name',
        marketCap: 'market_cap',
        price: 'price',
        revenue: 'revenue',
        netIncome: 'net_income',
        peRatio: 'pe_ratio',
        dividendYield: 'dividend_yield',
        freeCashFlow: 'free_cash_flow',
        revenueGrowth3Y: 'revenue_growth_3y',
        revenueGrowth5Y: 'revenue_growth_5y',
        revenueGrowth10Y: 'revenue_growth_10y',
        return3Year: 'return_3_year',
        return5Year: 'return_5_year',
        return10Year: 'return_10_year',
        maxDrawdown3Year: 'max_drawdown_3_year',
        maxDrawdown5Year: 'max_drawdown_5_year',
        maxDrawdown10Year: 'max_drawdown_10_year',
        roic: 'roic',
        roe: 'roe',
        dcfImpliedGrowth: 'dcf_implied_growth',
        marginOfSafety: 'margin_of_safety',
      };
      const orderCol = sortMap[sortBy] || 'market_cap';

      let query = supabase
        .from('ftse100_companies')
        .select('*')
        .order(orderCol, { ascending: sortOrder === 'asc', nullsFirst: false })
        .range(offset, offset + limit - 1);
      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,symbol.ilike.%${search.trim()}%`);
      }
      // Supabase REST sorts can be added if columns differ; client applies extra sort when needed
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching FTSE 100 companies:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error in getFtse100Companies:', error);
      return [];
    }
  }

  async getFtse100CompanyCount(search?: string): Promise<number> {
    try {
      let query = supabase
        .from('ftse100_companies')
        .select('*', { count: 'exact', head: true });
      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,symbol.ilike.%${search.trim()}%`);
      }
      const { count, error } = await query;
      if (error) {
        console.error('Error fetching FTSE 100 company count:', error);
        return 0;
      }
      return count || 0;
    } catch (error) {
      console.error('Error in getFtse100CompanyCount:', error);
      return 0;
    }
  }

  async getFtse100CompanyBySymbol(symbol: string): Promise<Ftse100Company | undefined> {
    try {
      const { data, error } = await supabase
        .from('ftse100_companies')
        .select('*')
        .eq('symbol', symbol)
        .single();
      if (error) {
        return undefined;
      }
      return data as any;
    } catch {
      return undefined;
    }
  }

  async getCompanyByTickerFromAnyIndex(symbol: string): Promise<any | undefined> {
    const upper = (symbol || '').toUpperCase();
    if (!upper) return undefined;
    const [sp, na, dow, ftse] = await Promise.all([
      supabase.from('sp500_companies').select('*').eq('symbol', upper).maybeSingle(),
      supabase.from('nasdaq100_companies').select('*').eq('symbol', upper).maybeSingle(),
      supabase.from('dow_jones_companies').select('*').eq('symbol', upper).maybeSingle(),
      supabase.from('ftse100_companies').select('*').eq('symbol', upper).maybeSingle(),
    ]);
    return (sp.data ?? na.data ?? dow.data ?? ftse.data) ?? undefined;
  }

  async getWatchlist(userId: string): Promise<Watchlist[]> {
    const result = await db.select().from(watchlist).where(eq(watchlist.userId, userId));
    return result;
  }

  async addToWatchlist(companySymbol: string, userId: string): Promise<Watchlist> {
    // First, check if the item already exists
    const existingItems = await db.select().from(watchlist).where(
      and(
        eq(watchlist.userId, userId),
        eq(watchlist.companySymbol, companySymbol)
      )
    );

    if (existingItems.length > 0) {
      console.log(`[addToWatchlist] Item ${companySymbol} already exists for user ${userId}. Returning existing.`);
      return existingItems[0];
    }

    // If it doesn't exist, insert it
    console.log(`[addToWatchlist] Item ${companySymbol} does not exist for user ${userId}. Inserting new.`);
    const [newWatchlistItem] = await db
      .insert(watchlist)
      .values({ 
        companySymbol, 
        userId
      })
      .returning();
      
    console.log(`[addToWatchlist] Successfully inserted. New ID: ${newWatchlistItem.id}`);
    return newWatchlistItem;
  }

  async removeFromWatchlist(companySymbol: string, userId: string): Promise<void> {
    await db
      .delete(watchlist)
      .where(and(eq(watchlist.companySymbol, companySymbol), eq(watchlist.userId, userId)));
  }

  async isInWatchlist(companySymbol: string, userId: string): Promise<boolean> {
    const result = await db.select().from(watchlist)
      .where(and(eq(watchlist.companySymbol, companySymbol), eq(watchlist.userId, userId)));
    return result.length > 0;
  }

  async getWatchlistCompanies(userId: string): Promise<Company[]> {
    // First, get all the symbols from the user's watchlist
    const watchlistItems = await this.getWatchlist(userId);
    const symbols = watchlistItems.map(item => item.companySymbol);
 
    if (symbols.length === 0) {
      return [];
    }
 
    // This is a bit complex. We need to find the full company data for each symbol.
    // The company could be in the S&P 500 table, Nasdaq 100, or Dow Jones.
    // We'll query all of them and merge the results. A UNION query is good for this.
    // Note: We are assuming a symbol is unique across all tables.
 
    const sp500Query = db.select().from(sp500Companies).where(inArray(sp500Companies.symbol, symbols));
    const nasdaqQuery = db.select().from(nasdaq100Companies).where(inArray(nasdaq100Companies.symbol, symbols));
    const dowJonesQuery = db.select().from(dowJonesCompanies).where(inArray(dowJonesCompanies.symbol, symbols));
 
    // Drizzle doesn't have a built-in UNION for different table types, so we execute them
    // in parallel and merge the results in code.
    const [sp500Results, nasdaqResults, dowJonesResults] = await Promise.all([
      sp500Query,
      nasdaqQuery,
      dowJonesQuery,
    ]);
 
    const allCompanies = [
      ...sp500Results,
      ...nasdaqResults,
      ...dowJonesResults,
    ];
 
    // It's possible for a company to be in multiple lists (e.g., S&P 500 and Nasdaq 100).
    // We'll create a map to ensure each symbol appears only once in the final result.
    const companyMap = new Map<string, Company>();
    allCompanies.forEach(company => {
      if (company.symbol && !companyMap.has(company.symbol)) {
        companyMap.set(company.symbol, company as Company);
      }
    });
 
    return Array.from(companyMap.values());
  }
 
  private buildOrderByClause(sortBy: string): SQL {
    const sortColumnMap: Record<string, SQL> = {
        'rank': sql`CASE WHEN "rank" IS NULL THEN 0 ELSE "rank" END`,
        'name': sql`"name"`,
        'marketCap': sql`CASE WHEN "market_cap" IS NULL OR "market_cap"::text = '' THEN 0 ELSE CAST("market_cap" AS BIGINT) END`,
        'price': sql`CASE WHEN "price" IS NULL OR "price"::text = '' THEN 0 ELSE CAST("price" AS NUMERIC) END`,
        'revenue': sql`CASE WHEN "revenue" IS NULL OR "revenue"::text = '' THEN 0 ELSE CAST("revenue" AS BIGINT) END`,
        'peRatio': sql`CASE WHEN "pe_ratio" IS NULL OR "pe_ratio"::text = '' THEN 99999 ELSE CAST("pe_ratio" AS NUMERIC) END`,
        'priceToSalesRatio': sql`CASE WHEN "price_to_sales_ratio" IS NULL OR "price_to_sales_ratio"::text = '' THEN 99999 ELSE CAST("price_to_sales_ratio" AS NUMERIC) END`,
        'netProfitMargin': sql`CASE WHEN "net_profit_margin" IS NULL OR "net_profit_margin"::text = '' THEN -99999 ELSE CAST("net_profit_margin" AS NUMERIC) END`,
        'dividendYield': sql`CASE WHEN "dividend_yield" IS NULL OR "dividend_yield"::text = '' THEN -99999 ELSE CAST("dividend_yield" AS NUMERIC) END`,
        'revenueGrowth3Y': sql`CASE WHEN "revenue_growth_3y" IS NULL OR "revenue_growth_3y"::text = '' THEN -99999 ELSE CAST("revenue_growth_3y" AS NUMERIC) END`,
        'revenueGrowth5Y': sql`CASE WHEN "revenue_growth_5y" IS NULL OR "revenue_growth_5y"::text = '' THEN -99999 ELSE CAST("revenue_growth_5y" AS NUMERIC) END`,
        'revenueGrowth10Y': sql`CASE WHEN "revenue_growth_10y" IS NULL OR "revenue_growth_10y"::text = '' THEN -99999 ELSE CAST("revenue_growth_10y" AS NUMERIC) END`,
        'return3Year': sql`CASE WHEN "return_3_year" IS NULL OR "return_3_year"::text = '' THEN -99999 ELSE CAST("return_3_year" AS NUMERIC) END`,
        'return5Year': sql`CASE WHEN "return_5_year" IS NULL OR "return_5_year"::text = '' THEN -99999 ELSE CAST("return_5_year" AS NUMERIC) END`,
        'return10Year': sql`CASE WHEN "return_10_year" IS NULL OR "return_10_year"::text = '' THEN -99999 ELSE CAST("return_10_year" AS NUMERIC) END`,
        'maxDrawdown3Year': sql`CASE WHEN "max_drawdown_3_year" IS NULL OR "max_drawdown_3_year"::text = '' THEN 99999 ELSE CAST("max_drawdown_3_year" AS NUMERIC) END`,
        'maxDrawdown5Year': sql`CASE WHEN "max_drawdown_5_year" IS NULL OR "max_drawdown_5_year"::text = '' THEN 99999 ELSE CAST("max_drawdown_5_year" AS NUMERIC) END`,
        'maxDrawdown10Year': sql`CASE WHEN "max_drawdown_10_year" IS NULL OR "max_drawdown_10_year"::text = '' THEN 99999 ELSE CAST("max_drawdown_10_year" AS NUMERIC) END`,
        'arMddRatio3Year': sql`CASE WHEN "ar_mdd_ratio_3_year" IS NULL OR "ar_mdd_ratio_3_year"::text = '' THEN -99999 ELSE CAST("ar_mdd_ratio_3_year" AS NUMERIC) END`,
        'arMddRatio5Year': sql`CASE WHEN "ar_mdd_ratio_5_year" IS NULL OR "ar_mdd_ratio_5_year"::text = '' THEN -99999 ELSE CAST("ar_mdd_ratio_5_year" AS NUMERIC) END`,
        'arMddRatio10Year': sql`CASE WHEN "ar_mdd_ratio_10_year" IS NULL OR "ar_mdd_ratio_10_year"::text = '' THEN -99999 ELSE CAST("ar_mdd_ratio_10_year" AS NUMERIC) END`,
        'freeCashFlow': sql`CASE WHEN "free_cash_flow" IS NULL OR "free_cash_flow"::text = '' THEN 0 ELSE CAST("free_cash_flow" AS BIGINT) END`,
        'dcfEnterpriseValue': sql`CASE WHEN "dcf_enterprise_value" IS NULL OR "dcf_enterprise_value"::text = '' THEN 0 ELSE CAST("dcf_enterprise_value" AS BIGINT) END`,
        'marginOfSafety': sql`CASE WHEN "margin_of_safety" IS NULL OR "margin_of_safety"::text = '' THEN -99999 ELSE CAST("margin_of_safety" AS NUMERIC) END`,
        'dcfImpliedGrowth': sql`CASE WHEN "dcf_implied_growth" IS NULL OR "dcf_implied_growth"::text = '' THEN -99999 ELSE CAST("dcf_implied_growth" AS NUMERIC) END`,
        'roe': sql`CASE WHEN "roe" IS NULL OR "roe"::text = '' THEN -99999 ELSE CAST("roe" AS NUMERIC) END`,
        'assetTurnover': sql`CASE WHEN "asset_turnover" IS NULL OR "asset_turnover"::text = '' THEN -99999 ELSE CAST("asset_turnover" AS NUMERIC) END`,
        'financialLeverage': sql`CASE WHEN "financial_leverage" IS NULL OR "financial_leverage"::text = '' THEN -99999 ELSE CAST("financial_leverage" AS NUMERIC) END`,
    };
    return sortColumnMap[sortBy] || sql`CASE WHEN "market_cap" IS NULL OR "market_cap" = '' THEN 0 ELSE CAST("market_cap" AS BIGINT) END`;
  }
}

export const storage = new DatabaseStorage();
