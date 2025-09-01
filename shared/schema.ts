import { pgTable, text, serial, decimal, integer, boolean, bigint, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from 'drizzle-orm';

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().unique(),
  marketCap: decimal("market_cap", { precision: 20, scale: 2 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  dailyChange: decimal("daily_change", { precision: 5, scale: 2 }),
  dailyChangePercent: decimal("daily_change_percent", { precision: 5, scale: 2 }),
  country: text("country").notNull(),
  countryCode: text("country_code"),
  rank: integer("rank").notNull(),
  logoUrl: text("logo_url"),
  
  // Enhanced financial data
  industry: text("industry"),
  sector: text("sector"),
  website: text("website"),
  description: text("description"),
  ceo: text("ceo"),
  employees: integer("employees"),
  
  // Key financial metrics
  peRatio: decimal("pe_ratio", { precision: 8, scale: 2 }),
  eps: decimal("eps", { precision: 8, scale: 2 }),
  beta: decimal("beta", { precision: 5, scale: 3 }),
  dividendYield: decimal("dividend_yield", { precision: 8, scale: 4 }),
  priceToSalesRatio: decimal("price_to_sales_ratio", { precision: 8, scale: 2 }),
  netProfitMargin: decimal("net_profit_margin", { precision: 8, scale: 4 }),
  returnOnEquity: decimal("return_on_equity", { precision: 8, scale: 4 }),
  returnOnAssets: decimal("return_on_assets", { precision: 8, scale: 4 }),
  debtToEquity: decimal("debt_to_equity", { precision: 8, scale: 4 }),
  
  // Trading metrics
  volume: decimal("volume", { precision: 20, scale: 2 }),
  avgVolume: decimal("avg_volume", { precision: 20, scale: 2 }),
  dayLow: decimal("day_low", { precision: 10, scale: 2 }),
  dayHigh: decimal("day_high", { precision: 10, scale: 2 }),
  yearLow: decimal("year_low", { precision: 10, scale: 2 }),
  yearHigh: decimal("year_high", { precision: 10, scale: 2 }),
  
  // Financial statement data
  revenue: decimal("revenue", { precision: 20, scale: 0 }),
  grossProfit: decimal("gross_profit", { precision: 20, scale: 0 }),
  operatingIncome: decimal("operating_income", { precision: 20, scale: 0 }),
  netIncome: decimal("net_income", { precision: 20, scale: 0 }),
  totalAssets: decimal("total_assets", { precision: 20, scale: 0 }),
  totalDebt: decimal("total_debt", { precision: 20, scale: 0 }),
  cashAndEquivalents: decimal("cash_and_equivalents", { precision: 20, scale: 0 }),
  freeCashFlow: decimal("free_cash_flow", { precision: 20, scale: 0 }),
  dcfEnterpriseValue: decimal('dcf_enterprise_value', { precision: 20, scale: 0 }),
  marginOfSafety: decimal('margin_of_safety', { precision: 10, scale: 4 }),
  dcfImpliedGrowth: decimal('dcf_implied_growth', { precision: 10, scale: 4 }),

  // Performance metrics (annualized returns as percentages)
  return3Year: decimal("return_3_year", { precision: 8, scale: 2 }),
  return5Year: decimal("return_5_year", { precision: 8, scale: 2 }),
  return10Year: decimal("return_10_year", { precision: 8, scale: 2 }),
  
  // Risk metrics
  maxDrawdown10Year: decimal("max_drawdown_10_year", { precision: 8, scale: 2 }),
  maxDrawdown5Year: decimal("max_drawdown_5_year", { precision: 8, scale: 2 }),
  maxDrawdown3Year: decimal("max_drawdown_3_year", { precision: 8, scale: 2 }),
  
  // Risk-adjusted performance metrics
  returnDrawdownRatio10Year: decimal("return_drawdown_ratio_10_year", { precision: 8, scale: 2 }),
  arMddRatio10Year: decimal("ar_mdd_ratio_10_year", { precision: 10, scale: 4 }),
  arMddRatio5Year: decimal("ar_mdd_ratio_5_year", { precision: 10, scale: 4 }),
  arMddRatio3Year: decimal("ar_mdd_ratio_3_year", { precision: 10, scale: 4 }),

  // Growth metrics
  revenueGrowth3Y: decimal("revenue_growth_3y", { precision: 8, scale: 2 }),
  revenueGrowth5Y: decimal("revenue_growth_5y", { precision: 8, scale: 2 }),
  revenueGrowth10Y: decimal("revenue_growth_10y", { precision: 8, scale: 2 }),
});

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  companySymbol: text("company_symbol").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  addedAt: timestamp("added_at").defaultNow(),
});

// Nasdaq 100 companies table (mirrors the structure of the main 'companies' table)
export const nasdaq100Companies = pgTable("nasdaq100_companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().unique(),
  marketCap: decimal("market_cap", { precision: 20, scale: 2 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  dailyChange: decimal("daily_change", { precision: 5, scale: 2 }),
  dailyChangePercent: decimal("daily_change_percent", { precision: 5, scale: 2 }),
  country: text("country").notNull(),
  countryCode: text("country_code"),
  rank: integer("rank").notNull(),
  logoUrl: text("logo_url"),
  
  // Enhanced financial data
  industry: text("industry"),
  sector: text("sector"),
  website: text("website"),
  description: text("description"),
  ceo: text("ceo"),
  employees: integer("employees"),
  
  // Key financial metrics
  peRatio: decimal("pe_ratio", { precision: 8, scale: 2 }),
  eps: decimal("eps", { precision: 8, scale: 2 }),
  beta: decimal("beta", { precision: 5, scale: 3 }),
  dividendYield: decimal("dividend_yield", { precision: 8, scale: 4 }),
  priceToSalesRatio: decimal("price_to_sales_ratio", { precision: 8, scale: 2 }),
  netProfitMargin: decimal("net_profit_margin", { precision: 8, scale: 4 }),
  returnOnEquity: decimal("return_on_equity", { precision: 8, scale: 4 }),
  returnOnAssets: decimal("return_on_assets", { precision: 8, scale: 4 }),
  debtToEquity: decimal("debt_to_equity", { precision: 8, scale: 4 }),
  
  // Trading metrics
  volume: decimal("volume", { precision: 20, scale: 2 }),
  avgVolume: decimal("avg_volume", { precision: 20, scale: 2 }),
  dayLow: decimal("day_low", { precision: 10, scale: 2 }),
  dayHigh: decimal("day_high", { precision: 10, scale: 2 }),
  yearLow: decimal("year_low", { precision: 10, scale: 2 }),
  yearHigh: decimal("year_high", { precision: 10, scale: 2 }),
  
  // Financial statement data
  revenue: decimal("revenue", { precision: 20, scale: 0 }),
  grossProfit: decimal("gross_profit", { precision: 20, scale: 0 }),
  operatingIncome: decimal("operating_income", { precision: 20, scale: 0 }),
  netIncome: decimal("net_income", { precision: 20, scale: 0 }),
  totalAssets: decimal("total_assets", { precision: 20, scale: 0 }),
  totalDebt: decimal("total_debt", { precision: 20, scale: 0 }),
  cashAndEquivalents: decimal("cash_and_equivalents", { precision: 20, scale: 0 }),
  freeCashFlow: decimal("free_cash_flow", { precision: 20, scale: 0 }),
  dcfEnterpriseValue: decimal('dcf_enterprise_value', { precision: 20, scale: 0 }),
  marginOfSafety: decimal('margin_of_safety', { precision: 10, scale: 4 }),
  dcfImpliedGrowth: decimal('dcf_implied_growth', { precision: 10, scale: 4 }),

  // Performance metrics (annualized returns as percentages)
  return3Year: decimal("return_3_year", { precision: 8, scale: 2 }),
  return5Year: decimal("return_5_year", { precision: 8, scale: 2 }),
  return10Year: decimal("return_10_year", { precision: 8, scale: 2 }),
  
  // Risk metrics
  maxDrawdown10Year: decimal("max_drawdown_10_year", { precision: 8, scale: 2 }),
  maxDrawdown5Year: decimal("max_drawdown_5_year", { precision: 8, scale: 2 }),
  maxDrawdown3Year: decimal("max_drawdown_3_year", { precision: 8, scale: 2 }),
  
  // Risk-adjusted performance metrics
  returnDrawdownRatio10Year: decimal("return_drawdown_ratio_10_year", { precision: 8, scale: 2 }),
  arMddRatio10Year: decimal("ar_mdd_ratio_10_year", { precision: 10, scale: 4 }),
  arMddRatio5Year: decimal("ar_mdd_ratio_5_year", { precision: 10, scale: 4 }),
  arMddRatio3Year: decimal("ar_mdd_ratio_3_year", { precision: 10, scale: 4 }),

  // Growth metrics
  revenueGrowth3Y: decimal("revenue_growth_3y", { precision: 8, scale: 2 }),
  revenueGrowth5Y: decimal("revenue_growth_5y", { precision: 8, scale: 2 }),
  revenueGrowth10Y: decimal("revenue_growth_10y", { precision: 8, scale: 2 }),
});

// Dow Jones companies table (mirrors the structure of the main 'companies' table)
export const dowJonesCompanies = pgTable("dow_jones_companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().unique(),
  marketCap: decimal("market_cap", { precision: 20, scale: 2 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  dailyChange: decimal("daily_change", { precision: 10, scale: 2 }),
  dailyChangePercent: decimal("daily_change_percent", { precision: 5, scale: 2 }),
  country: text("country"),
  countryCode: text("country_code"),
  rank: integer("rank"),
  logoUrl: text("logo_url"),
  
  // Enhanced financial data
  industry: text("industry"),
  sector: text("sector"),
  website: text("website"),
  description: text("description"),
  ceo: text("ceo"),
  employees: integer("employees"),
  
  // Key financial metrics
  peRatio: decimal("pe_ratio", { precision: 10, scale: 2 }),
  eps: decimal("eps", { precision: 10, scale: 2 }),
  beta: decimal("beta", { precision: 8, scale: 4 }),
  dividendYield: decimal("dividend_yield", { precision: 8, scale: 4 }),
  priceToSalesRatio: decimal("price_to_sales_ratio", { precision: 10, scale: 2 }),
  netProfitMargin: decimal("net_profit_margin", { precision: 8, scale: 4 }),
  
  // Trading metrics
  volume: decimal("volume", { precision: 20, scale: 0 }),
  avgVolume: decimal("avg_volume", { precision: 20, scale: 0 }),
  dayLow: decimal("day_low", { precision: 10, scale: 2 }),
  dayHigh: decimal("day_high", { precision: 10, scale: 2 }),
  yearLow: decimal("year_low", { precision: 10, scale: 2 }),
  yearHigh: decimal("year_high", { precision: 10, scale: 2 }),
  
  // Financial statement data
  revenue: decimal("revenue", { precision: 20, scale: 0 }),
  grossProfit: decimal("gross_profit", { precision: 20, scale: 0 }),
  operatingIncome: decimal("operating_income", { precision: 20, scale: 0 }),
  netIncome: decimal("net_income", { precision: 20, scale: 0 }),
  totalAssets: decimal("total_assets", { precision: 20, scale: 0 }),
  totalDebt: decimal("total_debt", { precision: 20, scale: 0 }),
  cashAndEquivalents: decimal("cash_and_equivalents", { precision: 20, scale: 0 }),
  freeCashFlow: decimal("free_cash_flow", { precision: 20, scale: 0 }),
  dcfEnterpriseValue: decimal('dcf_enterprise_value', { precision: 20, scale: 0 }),
  marginOfSafety: decimal('margin_of_safety', { precision: 10, scale: 4 }),
  dcfImpliedGrowth: decimal('dcf_implied_growth', { precision: 10, scale: 4 }),

  // Performance metrics (annualized returns as percentages)
  return3Year: decimal("return_3_year", { precision: 8, scale: 2 }),
  return5Year: decimal("return_5_year", { precision: 8, scale: 2 }),
  return10Year: decimal("return_10_year", { precision: 8, scale: 2 }),
  
  // Risk metrics
  maxDrawdown10Year: decimal("max_drawdown_10_year", { precision: 8, scale: 2 }),
  maxDrawdown5Year: decimal("max_drawdown_5_year", { precision: 8, scale: 2 }),
  maxDrawdown3Year: decimal("max_drawdown_3_year", { precision: 8, scale: 2 }),
  
  // Risk-adjusted performance metrics
  arMddRatio10Year: decimal("ar_mdd_ratio_10_year", { precision: 10, scale: 4 }),
  arMddRatio5Year: decimal("ar_mdd_ratio_5_year", { precision: 10, scale: 4 }),
  arMddRatio3Year: decimal("ar_mdd_ratio_3_year", { precision: 10, scale: 4 }),

  // Growth metrics
  revenueGrowth3Y: decimal("revenue_growth_3y", { precision: 8, scale: 2 }),
  revenueGrowth5Y: decimal("revenue_growth_5y", { precision: 8, scale: 2 }),
  revenueGrowth10Y: decimal("revenue_growth_10y", { precision: 8, scale: 2 }),
});


// --- Zod Schemas for API validation and type inference ---

// S&P 500 Companies
export const insertCompanySchema = createInsertSchema(companies);
export const selectCompanySchema = createSelectSchema(companies);
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = z.infer<typeof selectCompanySchema>;

// Nasdaq 100 Companies
export const insertNasdaq100CompanySchema = createInsertSchema(nasdaq100Companies);
export const selectNasdaq100CompanySchema = createSelectSchema(nasdaq100Companies);
export type InsertNasdaq100Company = z.infer<typeof insertNasdaq100CompanySchema>;
export type Nasdaq100Company = z.infer<typeof selectNasdaq100CompanySchema>;

// Dow Jones Companies
export const insertDowJonesCompanySchema = createInsertSchema(dowJonesCompanies);
export const selectDowJonesCompanySchema = createSelectSchema(dowJonesCompanies);
export type InsertDowJonesCompany = z.infer<typeof insertDowJonesCompanySchema>;
export type DowJonesCompany = z.infer<typeof selectDowJonesCompanySchema>;

// Users
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Watchlist
export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  addedAt: true,
});
export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
