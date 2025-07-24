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
    
    // Initialize with real financial data
    this.initializeCompanies();
  }

  private initializeCompanies() {
    const companiesData = [
      {
        name: "NVIDIA",
        symbol: "NVDA",
        marketCap: "4196000000000",
        price: "172.08",
        dailyChange: "1.30",
        dailyChangePercent: "0.76",
        country: "USA",
        countryCode: "us",
        rank: 1,
        logoUrl: "https://images.unsplash.com/photo-1633114128174-2f8aa49759b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64"
      },
      {
        name: "Microsoft",
        symbol: "MSFT",
        marketCap: "3778000000000",
        price: "508.32",
        dailyChange: "2.42",
        dailyChangePercent: "0.48",
        country: "USA",
        countryCode: "us",
        rank: 2,
        logoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64"
      },
      {
        name: "Apple",
        symbol: "AAPL",
        marketCap: "3203000000000",
        price: "214.48",
        dailyChange: "0.32",
        dailyChangePercent: "0.15",
        country: "USA",
        countryCode: "us",
        rank: 3,
        logoUrl: "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64"
      },
      {
        name: "Amazon",
        symbol: "AMZN",
        marketCap: "2462000000000",
        price: "231.91",
        dailyChange: "3.61",
        dailyChangePercent: "1.58",
        country: "USA",
        countryCode: "us",
        rank: 4,
        logoUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64"
      },
      {
        name: "Alphabet (Google)",
        symbol: "GOOG",
        marketCap: "2339000000000",
        price: "193.47",
        dailyChange: "1.95",
        dailyChangePercent: "1.02",
        country: "USA",
        countryCode: "us",
        rank: 5,
        logoUrl: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64"
      },
      {
        name: "Meta Platforms (Facebook)",
        symbol: "META",
        marketCap: "1806000000000",
        price: "718.62",
        dailyChange: "5.05",
        dailyChangePercent: "0.71",
        country: "USA",
        countryCode: "us",
        rank: 6,
        logoUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64"
      },
      {
        name: "Saudi Aramco",
        symbol: "2222.SR",
        marketCap: "1604000000000",
        price: "6.41",
        dailyChange: "0.05",
        dailyChangePercent: "0.74",
        country: "Saudi Arabia",
        countryCode: "sa",
        rank: 7,
        logoUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64"
      },
      {
        name: "Broadcom",
        symbol: "AVGO",
        marketCap: "1337000000000",
        price: "284.45",
        dailyChange: "0.76",
        dailyChangePercent: "0.27",
        country: "USA",
        countryCode: "us",
        rank: 8,
        logoUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64"
      },
      {
        name: "TSMC",
        symbol: "TSM",
        marketCap: "1238000000000",
        price: "238.86",
        dailyChange: "1.44",
        dailyChangePercent: "0.61",
        country: "Taiwan",
        countryCode: "tw",
        rank: 9,
        logoUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64"
      },
      {
        name: "Berkshire Hathaway",
        symbol: "BRK-B",
        marketCap: "1043000000000",
        price: "483.99",
        dailyChange: "1.34",
        dailyChangePercent: "0.28",
        country: "USA",
        countryCode: "us",
        rank: 10,
        logoUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64"
      },
      {
        name: "Tesla",
        symbol: "TSLA",
        marketCap: "981870000000",
        price: "304.84",
        dailyChange: "23.50",
        dailyChangePercent: "8.34",
        country: "USA",
        countryCode: "us",
        rank: 11,
        logoUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64"
      },
      {
        name: "Tencent",
        symbol: "TCEHY",
        marketCap: "640140000000",
        price: "70.57",
        dailyChange: "0.20",
        dailyChangePercent: "0.28",
        country: "China",
        countryCode: "cn",
        rank: 17,
        logoUrl: "https://images.unsplash.com/photo-1580327344181-c1163234e5a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64"
      }
    ];

    companiesData.forEach((companyData) => {
      const company: Company = {
        id: this.currentCompanyId++,
        ...companyData
      };
      this.companies.set(company.id, company);
    });
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
}

export const storage = new MemStorage();
