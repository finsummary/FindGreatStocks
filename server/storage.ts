import { companies, favorites, users, type User, type InsertUser, type Company, type InsertCompany, type Favorite } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Company methods
  getCompanies(limit?: number, offset?: number, sortBy?: string, sortOrder?: 'asc' | 'desc', search?: string, country?: string): Promise<Company[]>;
  getCompanyCount(search?: string, country?: string): Promise<number>;
  getCompanyBySymbol(symbol: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(symbol: string, updates: Partial<Company>): Promise<void>;
  clearAllCompanies(): Promise<void>;
  
  // Favorites methods
  getFavorites(userId: number): Promise<Company[]>;
  addFavorite(userId: number, companyId: number): Promise<Favorite>;
  removeFavorite(userId: number, companyId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private companies: Map<number, Company>;
  private favorites: Map<string, Favorite>;
  private currentUserId: number;
  private currentCompanyId: number;
  private currentFavoriteId: number;

  constructor() {
    this.users = new Map();
    this.companies = new Map();
    this.favorites = new Map();
    this.currentUserId = 1;
    this.currentCompanyId = 1;
    this.currentFavoriteId = 1;
    
    // Start with empty storage - data will be loaded by scheduler
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

  async getFavorites(userId: number): Promise<Company[]> {
    const userFavorites = Array.from(this.favorites.values()).filter(
      (favorite) => favorite.userId === userId,
    );
    const favoriteCompanies: Company[] = [];
    
    for (const favorite of userFavorites) {
      const company = this.companies.get(favorite.companyId);
      if (company) {
        favoriteCompanies.push(company);
      }
    }
    
    return favoriteCompanies;
  }

  async addFavorite(userId: number, companyId: number): Promise<Favorite> {
    const id = this.currentFavoriteId++;
    const favorite: Favorite = { id, userId, companyId };
    this.favorites.set(`${userId}-${companyId}`, favorite);
    return favorite;
  }

  async removeFavorite(userId: number, companyId: number): Promise<void> {
    this.favorites.delete(`${userId}-${companyId}`);
  }

  async clearAllCompanies(): Promise<void> {
    this.companies.clear();
    this.currentCompanyId = 1;
  }
}

export const storage = new MemStorage();
