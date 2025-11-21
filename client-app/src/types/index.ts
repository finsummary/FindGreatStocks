// Local types for client app
export interface Company {
  id: number;
  symbol: string;
  name: string;
  marketCap: number | string | null;
  price: number | string | null;
  dailyChange: number | string | null;
  dailyChangePercent: number | string | null;
  country: string | null;
  rank: number | null;
  logo: string | null;
  logoUrl: string | null;
  peRatio: number | string | null;
  eps: number | string | null;
  dividendYield: number | string | null;
  priceToSalesRatio: number | string | null;
  revenue: number | string | null;
  netIncome: number | string | null;
  totalAssets: number | string | null;
  totalEquity: number | string | null;
  freeCashFlow: number | string | null;
  revenueGrowth3Y: number | string | null;
  revenueGrowth5Y: number | string | null;
  revenueGrowth10Y: number | string | null;
  return3Year: number | string | null;
  return5Year: number | string | null;
  return10Year: number | string | null;
  maxDrawdown3Year: number | string | null;
  maxDrawdown5Year: number | string | null;
  maxDrawdown10Year: number | string | null;
  arMddRatio: number | string | null;
  arMddRatio3Year: number | string | null;
  arMddRatio5Year: number | string | null;
  arMddRatio10Year: number | string | null;
  netProfitMargin: number | string | null;
  assetTurnover: number | string | null;
  financialLeverage: number | string | null;
  roe: number | string | null;
  dcfEnterpriseValue: number | string | null;
  marginOfSafety: number | string | null;
  dcfImpliedGrowth: number | string | null;
  latestFcf: number | string | null;
  roic?: number | string | null;
  roic10YAvg?: number | string | null;
  roic10YStd?: number | string | null;
  roicStability?: number | string | null;
  roicStabilityScore?: number | string | null;
  isWatched?: boolean;
}

export interface User {
  id: string;
  email: string;
  subscriptionTier: 'free' | 'paid' | 'quarterly' | 'annual' | 'lifetime';
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
