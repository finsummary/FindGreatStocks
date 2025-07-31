import { pgTable, text, serial, decimal, integer, boolean, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().unique(),
  marketCap: decimal("market_cap", { precision: 20, scale: 2 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  dailyChange: decimal("daily_change", { precision: 5, scale: 2 }).notNull(),
  dailyChangePercent: decimal("daily_change_percent", { precision: 5, scale: 2 }).notNull(),
  country: text("country").notNull(),
  countryCode: text("country_code").notNull(),
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
  dividendYield: decimal("dividend_yield", { precision: 5, scale: 4 }),
  
  // Trading metrics
  volume: bigint("volume", { mode: "number" }),
  avgVolume: bigint("avg_volume", { mode: "number" }),
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
  
  // Performance metrics (annualized returns as percentages)
  return3Year: decimal("return_3_year", { precision: 8, scale: 2 }),
  return5Year: decimal("return_5_year", { precision: 8, scale: 2 }),
  return10Year: decimal("return_10_year", { precision: 8, scale: 2 }),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// User schema for favorites functionality
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  companyId: integer("company_id").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
