// Local types for client app
export interface Company {
  id: number;
  symbol: string;
  name: string;
  marketCap: string | null;
  price: string | null;
  dailyChange: string | null;
  dailyChangePercent: string | null;
  country: string | null;
  rank: number | null;
  logo: string | null;
  logoUrl: string | null;
  peRatio: string | null;
  eps: string | null;
  dividendYield: string | null;
  priceToSalesRatio: string | null;
  revenue: string | null;
  netIncome: string | null;
  freeCashFlow: string | null;
  revenueGrowth3Y: string | null;
  revenueGrowth5Y: string | null;
  revenueGrowth10Y: string | null;
  return3Year: string | null;
  return5Year: string | null;
  return10Year: string | null;
  maxDrawdown3Year: string | null;
  maxDrawdown5Year: string | null;
  maxDrawdown10Year: string | null;
  arMddRatio: string | null;
  arMddRatio3Year: string | null;
  arMddRatio5Year: string | null;
  arMddRatio10Year: string | null;
  netProfitMargin: string | null;
  assetTurnover: string | null;
  financialLeverage: string | null;
  roe: string | null;
  dcfEnterpriseValue: string | null;
  marginOfSafety: string | null;
  dcfImpliedGrowth: string | null;
  latestFcf: string | null;
  isWatched?: boolean;
}

export interface User {
  id: string;
  email: string;
  subscriptionTier: 'free' | 'paid' | 'quarterly' | 'annual';
  createdAt: string;
  updatedAt: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface WatchlistItem {
  id: number;
  userId: string;
  symbol: string;
  createdAt: string;
}

export type Dataset = 'dowjones' | 'sp500' | 'nasdaq100';

export type DowJonesCompany = Company;
export type Sp500Company = Company;
export type Nasdaq100Company = Company;

export interface Watchlist {
  id: number;
  userId: string;
  symbol: string;
  name: string;
  createdAt: string | null;
  updatedAt: string | null;
}
