import { companies, nasdaq100Companies, watchlist, users, type User, type UpsertUser, type Company, type Nasdaq100Company, type InsertCompany, type InsertNasdaq100Company, type Watchlist, type InsertWatchlist } from "@shared/schema";
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

  async getCompanies(limit = 50, offset = 0, sortBy = 'rank', sortOrder: 'asc' | 'desc' = 'asc', search?: string, country?: string): Promise<Company[]> {
    // Apply sorting based on selected criteria
    const orderDirection = sortOrder === 'desc' ? desc : asc;
    
    let baseQuery = db.select().from(companies);
    
    // Apply search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      baseQuery = baseQuery.where(
        or(
          ilike(companies.symbol, searchTerm),
          ilike(companies.name, searchTerm)
        )
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'rank':
      case 'marketCap':
        baseQuery = baseQuery.orderBy(desc(sql`CASE WHEN ${companies.marketCap} IS NULL OR ${companies.marketCap} = '0' THEN 0 ELSE CAST(${companies.marketCap} AS BIGINT) END`));
        break;
      case 'revenue':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${companies.revenue} IS NULL OR ${companies.revenue} = '0' THEN 0 ELSE CAST(${companies.revenue} AS BIGINT) END`));
        break;
      case 'return3Year':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${companies.return3Year} IS NULL OR ${companies.return3Year} = '0' THEN -999 ELSE CAST(${companies.return3Year} AS NUMERIC) END`));
        break;
      case 'return5Year':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${companies.return5Year} IS NULL OR ${companies.return5Year} = '0' THEN -999 ELSE CAST(${companies.return5Year} AS NUMERIC) END`));
        break;
      case 'return10Year':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${companies.return10Year} IS NULL OR ${companies.return10Year} = '0' THEN -999 ELSE CAST(${companies.return10Year} AS NUMERIC) END`));
        break;
      case 'maxDrawdown10Year':
        baseQuery = baseQuery.orderBy(asc(sql`CASE WHEN ${companies.maxDrawdown10Year} IS NULL OR ${companies.maxDrawdown10Year} = '0' THEN 999 ELSE CAST(${companies.maxDrawdown10Year} AS NUMERIC) END`));
        break;
      case 'returnDrawdownRatio10Year':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${companies.returnDrawdownRatio10Year} IS NULL OR ${companies.returnDrawdownRatio10Year} = '0' THEN -999 ELSE CAST(${companies.returnDrawdownRatio10Year} AS NUMERIC) END`));
        break;
      case 'peRatio':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${companies.peRatio} IS NULL OR ${companies.peRatio} = '0' THEN 999 ELSE CAST(${companies.peRatio} AS NUMERIC) END`));
        break;

      case 'dailyChangePercent':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${companies.dailyChangePercent} IS NULL THEN 0 ELSE CAST(${companies.dailyChangePercent} AS NUMERIC) END`));
        break;
      case 'name':
        baseQuery = baseQuery.orderBy(orderDirection(companies.name));
        break;
      case 'price':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CAST(${companies.price} AS NUMERIC)`));
        break;
      default:
        // Default to market cap descending
        baseQuery = baseQuery.orderBy(desc(sql`CASE WHEN ${companies.marketCap} IS NULL OR ${companies.marketCap} = '0' THEN 0 ELSE CAST(${companies.marketCap} AS BIGINT) END`));
    }
    
    // Apply pagination
    const result = await baseQuery.limit(limit).offset(offset);
    return result;
  }

  async getCompanyCount(search?: string, country?: string): Promise<number> {
    let baseQuery = db.select({ count: sql`count(*)` }).from(companies);
    
    // Apply search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      baseQuery = baseQuery.where(
        or(
          ilike(companies.symbol, searchTerm),
          ilike(companies.name, searchTerm)
        )
      );
    }
    
    const result = await baseQuery;
    return Number(result[0]?.count || 0);
  }

  async getCompanyBySymbol(symbol: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.symbol, symbol));
    return company || undefined;
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
    let baseQuery = db.select().from(nasdaq100Companies);

    if (search) {
      baseQuery = baseQuery.where(
        or(
          ilike(nasdaq100Companies.name, `%${search}%`),
          ilike(nasdaq100Companies.symbol, `%${search}%`),
          ilike(nasdaq100Companies.sector, `%${search}%`)
        )
      );
    }

    const orderDirection = sortOrder === 'desc' ? desc : asc;

    switch (sortBy) {
      case 'marketCap':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${nasdaq100Companies.marketCap} IS NULL THEN 0 ELSE CAST(${nasdaq100Companies.marketCap} AS BIGINT) END`));
        break;
      case 'price':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${nasdaq100Companies.price} IS NULL THEN 0 ELSE CAST(${nasdaq100Companies.price} AS NUMERIC) END`));
        break;
      case 'revenue':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${nasdaq100Companies.revenue} IS NULL THEN 0 ELSE CAST(${nasdaq100Companies.revenue} AS BIGINT) END`));
        break;
      case 'netIncome':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${nasdaq100Companies.netIncome} IS NULL THEN 0 ELSE CAST(${nasdaq100Companies.netIncome} AS BIGINT) END`));
        break;
      case 'peRatio':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${nasdaq100Companies.peRatio} IS NULL OR ${nasdaq100Companies.peRatio} = '0' THEN 999 ELSE CAST(${nasdaq100Companies.peRatio} AS NUMERIC) END`));
        break;
      case 'dailyChangePercent':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${nasdaq100Companies.dailyChangePercent} IS NULL THEN 0 ELSE CAST(${nasdaq100Companies.dailyChangePercent} AS NUMERIC) END`));
        break;
      case 'name':
        baseQuery = baseQuery.orderBy(orderDirection(nasdaq100Companies.name));
        break;
      case 'symbol':
        baseQuery = baseQuery.orderBy(orderDirection(nasdaq100Companies.symbol));
        break;
      case 'return3Year':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${nasdaq100Companies.return3Year} IS NULL THEN -999 ELSE CAST(${nasdaq100Companies.return3Year} AS NUMERIC) END`));
        break;
      case 'return5Year':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${nasdaq100Companies.return5Year} IS NULL THEN -999 ELSE CAST(${nasdaq100Companies.return5Year} AS NUMERIC) END`));
        break;
      case 'return10Year':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${nasdaq100Companies.return10Year} IS NULL THEN -999 ELSE CAST(${nasdaq100Companies.return10Year} AS NUMERIC) END`));
        break;
      case 'maxDrawdown10Year':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${nasdaq100Companies.maxDrawdown10Year} IS NULL THEN 999 ELSE CAST(${nasdaq100Companies.maxDrawdown10Year} AS NUMERIC) END`));
        break;
      case 'returnDrawdownRatio10Year':
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${nasdaq100Companies.returnDrawdownRatio10Year} IS NULL THEN -999 ELSE CAST(${nasdaq100Companies.returnDrawdownRatio10Year} AS NUMERIC) END`));
        break;
      default:
        baseQuery = baseQuery.orderBy(orderDirection(sql`CASE WHEN ${nasdaq100Companies.marketCap} IS NULL THEN 0 ELSE CAST(${nasdaq100Companies.marketCap} AS BIGINT) END`));
    }

    return baseQuery.limit(limit).offset(offset);
  }

  async getNasdaq100CompanyCount(search?: string): Promise<number> {
    let baseQuery = db.select({ count: sql`count(*)` }).from(nasdaq100Companies);

    if (search) {
      baseQuery = baseQuery.where(
        or(
          ilike(nasdaq100Companies.name, `%${search}%`),
          ilike(nasdaq100Companies.symbol, `%${search}%`),
          ilike(nasdaq100Companies.sector, `%${search}%`)
        )
      );
    }

    const result = await baseQuery;
    return Number(result[0].count);
  }

  async getNasdaq100CompanyBySymbol(symbol: string): Promise<Nasdaq100Company | undefined> {
    const [company] = await db
      .select()
      .from(nasdaq100Companies)
      .where(eq(nasdaq100Companies.symbol, symbol));
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private companies: Map<number, Company>;
  private watchlist: Watchlist[];
  private currentUserId: number;
  private currentCompanyId: number;
  private currentWatchlistId: number;

  constructor() {
    this.users = new Map();
    this.companies = new Map();
    this.watchlist = [];
    this.currentUserId = 1;
    this.currentCompanyId = 1;
    this.currentWatchlistId = 1;
    
    // Storage starts empty - scheduler will load data from API
    console.log('MemStorage initialized - waiting for scheduler to load data');
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getCompanies(limit = 50, offset = 0, sortBy = 'rank', sortOrder: 'asc' | 'desc' = 'asc', search?: string, country?: string): Promise<Company[]> {
    let companiesArray = Array.from(this.companies.values());

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      companiesArray = companiesArray.filter(company => 
        company.name.toLowerCase().includes(searchLower) ||
        company.symbol.toLowerCase().includes(searchLower)
      );
    }

    // Apply country filter
    if (country) {
      companiesArray = companiesArray.filter(company => 
        company.countryCode === country
      );
    }

    // Apply sorting
    companiesArray.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Company];
      let bValue: any = b[sortBy as keyof Company];

      // Convert to numbers for numeric fields
      if (['marketCap', 'price', 'dailyChange', 'dailyChangePercent', 'rank'].includes(sortBy)) {
        aValue = parseFloat(String(aValue));
        bValue = parseFloat(String(bValue));
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Apply pagination
    return companiesArray.slice(offset, offset + limit);
  }

  async getCompanyCount(search?: string, country?: string): Promise<number> {
    let companiesArray = Array.from(this.companies.values());

    if (search) {
      const searchLower = search.toLowerCase();
      companiesArray = companiesArray.filter(company => 
        company.name.toLowerCase().includes(searchLower) ||
        company.symbol.toLowerCase().includes(searchLower)
      );
    }

    if (country) {
      companiesArray = companiesArray.filter(company => 
        company.countryCode === country
      );
    }

    return companiesArray.length;
  }

  async getCompanyBySymbol(symbol: string): Promise<Company | undefined> {
    return Array.from(this.companies.values()).find(
      (company) => company.symbol === symbol,
    );
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = this.currentCompanyId++;
    const company: Company = { 
      ...insertCompany, 
      id,
      logoUrl: insertCompany.logoUrl || null
    };
    this.companies.set(id, company);
    return company;
  }

  async updateCompany(symbol: string, updates: Partial<Company>): Promise<void> {
    const company = await this.getCompanyBySymbol(symbol);
    if (company) {
      const updatedCompany = { ...company, ...updates };
      this.companies.set(company.id, updatedCompany);
    }
  }

  async getWatchlist(userId: string = "guest"): Promise<Watchlist[]> {
    return this.watchlist.filter(w => w.userId === userId);
  }

  async addToWatchlist(companySymbol: string, userId: string = "guest"): Promise<Watchlist> {
    const watchlistItem: Watchlist = { 
      id: this.currentWatchlistId++,
      companySymbol, 
      userId,
      addedAt: new Date().toISOString()
    };
    this.watchlist.push(watchlistItem);
    return watchlistItem;
  }

  async removeFromWatchlist(companySymbol: string, userId: string = "guest"): Promise<void> {
    this.watchlist = this.watchlist.filter(w => !(w.userId === userId && w.companySymbol === companySymbol));
  }

  async isInWatchlist(companySymbol: string, userId: string = "guest"): Promise<boolean> {
    return this.watchlist.some(w => w.userId === userId && w.companySymbol === companySymbol);
  }

  async clearAllCompanies(): Promise<void> {
    this.companies.clear();
    this.currentCompanyId = 1;
  }
}

export const storage = new DatabaseStorage();
