import { companies, nasdaq100Companies, watchlist, users, type User, type UpsertUser, type Company, type Nasdaq100Company, type InsertCompany, type InsertNasdaq100Company, type Watchlist, type InsertWatchlist, type DowJonesCompany, type InsertDowJonesCompany } from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, asc, and, or, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
  
  // Dow Jones methods
  getDowJonesCompanies(limit?: number, offset?: number, sortBy?: string, sortOrder?: 'asc' | 'desc', search?: string): Promise<DowJonesCompany[]>;
  getDowJonesCompanyCount(search?: string): Promise<number>;
  getDowJonesCompanyBySymbol(symbol: string): Promise<DowJonesCompany | undefined>;

  // FTSE 100 methods
  getFtse100Companies(limit?: number, offset?: number, sortBy?: string, sortOrder?: 'asc' | 'desc', search?: string): Promise<Ftse100Company[]>;
  getFtse100CompanyCount(search?: string): Promise<number>;
  getFtse100CompanyBySymbol(symbol: string): Promise<Ftse100Company | undefined>;
  
  // Watchlist methods
  getWatchlist(userId: string): Promise<Watchlist[]>;
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getCompanies(limit = 50, offset = 0, sortBy = 'rank', sortOrder: 'asc' | 'desc' = 'asc', search?: string): Promise<Company[]> {
    // Sanitize sortOrder to prevent SQL injection, though drizzle-orm's sql template should handle it.
    const direction = sortOrder === 'asc' ? sql`ASC NULLS FIRST` : sql`DESC NULLS LAST`;

    // This mapping uses raw SQL CASE statements for robust sorting, handling NULLs and empty strings
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
        'fcfGrowthRate': sql`CASE WHEN "fcf_growth_rate" IS NULL OR "fcf_growth_rate"::text = '' THEN -99999 ELSE CAST("fcf_growth_rate" AS NUMERIC) END`,
    };
    
    // Default to marketCap sorting if the key is invalid
    const sortColumn = sortColumnMap[sortBy] || sql`CASE WHEN "market_cap" IS NULL OR "market_cap" = '' THEN 0 ELSE CAST("market_cap" AS BIGINT) END`;

    let whereClause = sql``;
    if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        whereClause = sql`WHERE "name" ILIKE ${searchTerm} OR "symbol" ILIKE ${searchTerm}`;
    }

    const query = sql`
        SELECT * FROM companies
        ${whereClause}
        ORDER BY ${sortColumn} ${direction}
        LIMIT ${limit}
        OFFSET ${offset}
    `;

    const result = await db.execute(query);
    return result.rows.map(this.mapDbRowToCompany);
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
        fcfGrowthRate: row.fcf_growth_rate,
        fcfMedianGrowthRate: row.fcf_median_growth_rate,
    };
  }

  async getCompanyCount(search?: string): Promise<number> {
    let whereClause = sql``;
    if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        whereClause = sql`WHERE "name" ILIKE ${searchTerm} OR "symbol" ILIKE ${searchTerm}`;
    }

    const query = sql`SELECT count(*) FROM companies ${whereClause}`;
    const result = await db.execute(query);
    return Number(result.rows[0]?.count || 0);
  }

  async getCompaniesForEnhancement(): Promise<Pick<Company, 'symbol' | 'return3Year' | 'return5Year' | 'return10Year' | 'maxDrawdown3Year' | 'maxDrawdown5Year' | 'maxDrawdown10Year'>[]> {
        try {
            const result = await db.execute(sql`
                SELECT 
                    symbol, 
                    "return_3_year", 
                    "return_5_year", 
                    "return_10_year",
                    "max_drawdown_3_year",
                    "max_drawdown_5_year",
                    "max_drawdown_10_year"
                FROM companies
            `);
            // Manually map to the expected camelCase properties
            return result.rows.map((row: any) => ({
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
    const query = sql`SELECT * FROM companies WHERE symbol = ${symbol}`;
    const result = await db.execute(query);
    if (result.rows.length === 0) {
      return undefined;
    }
    return this.mapDbRowToCompany(result.rows[0]);
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values(insertCompany)
      .returning();
    return company;
  }

  async updateCompany(symbol: string, updates: Partial<Company>): Promise<void> {
    await db
      .update(companies)
      .set(updates)
      .where(eq(companies.symbol, symbol));
  }

  async clearAllCompanies(): Promise<void> {
    await db.delete(companies);
  }

  // Nasdaq 100 methods
  async getNasdaq100Companies(
    limit: number = 50,
    offset: number = 0,
    sortBy: string = 'marketCap',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string
  ): Promise<Nasdaq100Company[]> {
    // This is a direct copy of the robust getCompanies raw SQL implementation
    const direction = sortOrder === 'asc' ? sql`ASC NULLS FIRST` : sql`DESC NULLS LAST`;

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
        'fcfGrowthRate': sql`CASE WHEN "fcf_growth_rate" IS NULL OR "fcf_growth_rate"::text = '' THEN -99999 ELSE CAST("fcf_growth_rate" AS NUMERIC) END`,
    };
    
    const sortColumn = sortColumnMap[sortBy] || sql`CASE WHEN "market_cap" IS NULL OR "market_cap" = '' THEN 0 ELSE CAST("market_cap" AS BIGINT) END`;

    let whereClause = sql``;
    if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        whereClause = sql`WHERE "name" ILIKE ${searchTerm} OR "symbol" ILIKE ${searchTerm}`;
    }

    const query = sql`
        SELECT * FROM nasdaq100_companies
        ${whereClause}
        ORDER BY ${sortColumn} ${direction}
        LIMIT ${limit}
        OFFSET ${offset}
    `;

    const result = await db.execute(query);
    return result.rows.map(this.mapDbRowToCompany as (row: any) => Nasdaq100Company);
  }

  async getNasdaq100CompanyCount(search?: string): Promise<number> {
    let whereClause = sql``;
    if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        whereClause = sql`WHERE "name" ILIKE ${searchTerm} OR "symbol" ILIKE ${searchTerm}`;
    }

    const query = sql`SELECT count(*) FROM nasdaq100_companies ${whereClause}`;
    const result = await db.execute(query);
    return Number(result.rows[0]?.count || 0);
  }

  async getNasdaq100CompanyBySymbol(symbol: string): Promise<Nasdaq100Company | undefined> {
    const [company] = await db
      .select()
      .from(nasdaq100Companies)
      .where(eq(nasdaq100Companies.symbol, symbol));
    return company;
  }

  // Dow Jones methods
  async getDowJonesCompanies(
    limit: number = 50,
    offset: number = 0,
    sortBy: string = 'marketCap',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string
  ): Promise<DowJonesCompany[]> {
    const direction = sortOrder === 'asc' ? sql`ASC NULLS FIRST` : sql`DESC NULLS LAST`;
    const sortColumn = this.buildOrderByClause(sortBy);

    let whereClause = sql``;
    if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        whereClause = sql`WHERE "name" ILIKE ${searchTerm} OR "symbol" ILIKE ${searchTerm}`;
    }

    const query = sql`
        SELECT * FROM dow_jones_companies
        ${whereClause}
        ORDER BY ${sortColumn} ${direction}
        LIMIT ${limit}
        OFFSET ${offset}
    `;

    const result = await db.execute(query);
    return result.rows.map(this.mapDbRowToCompany as (row: any) => DowJonesCompany);
  }

  async getDowJonesCompanyCount(search?: string): Promise<number> {
    let whereClause = sql``;
    if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        whereClause = sql`WHERE "name" ILIKE ${searchTerm} OR "symbol" ILIKE ${searchTerm}`;
    }

    const query = sql`SELECT count(*) FROM dow_jones_companies ${whereClause}`;
    const result = await db.execute(query);
    return Number(result.rows[0]?.count || 0);
  }

  async getDowJonesCompanyBySymbol(symbol: string): Promise<DowJonesCompany | undefined> {
    const [company] = await db
      .select()
      .from(dowJonesCompanies)
      .where(eq(dowJonesCompanies.symbol, symbol));
    return company;
  }

  async getWatchlist(userId: string): Promise<Watchlist[]> {
    const result = await db.select().from(watchlist).where(eq(watchlist.userId, userId));
    return result;
  }

  async addToWatchlist(companySymbol: string, userId: string): Promise<Watchlist> {
    const [watchlistItem] = await db
      .insert(watchlist)
      .values({ 
        companySymbol, 
        userId
      })
      .returning();
    return watchlistItem;
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
        'fcfGrowthRate': sql`CASE WHEN "fcf_growth_rate" IS NULL OR "fcf_growth_rate"::text = '' THEN -99999 ELSE CAST("fcf_growth_rate" AS NUMERIC) END`,
    };
    return sortColumnMap[sortBy] || sql`CASE WHEN "market_cap" IS NULL OR "market_cap" = '' THEN 0 ELSE CAST("market_cap" AS BIGINT) END`;
  }
}

export const storage = new DatabaseStorage();
