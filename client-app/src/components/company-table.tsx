import { useState, useEffect, useMemo } from "react";
import React from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, Star, Download, Search, Settings2, X, Lock, Unlock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UpgradeModal } from './UpgradeModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatMarketCap, formatPercentage, formatPrice, formatEarnings, formatNumber, formatPercentageFromDecimal } from "@/lib/format";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import type { Company, Nasdaq100Company } from "../types";

type DisplayCompany = Company & { isWatched?: boolean };
import { authFetch } from "@/lib/authFetch";
import { loadStripe } from '@stripe/stripe-js';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

// Load Stripe.js outside of the component to avoid recreating it on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface ColumnConfig {
  id: keyof Company | 'rank' | 'name' | 'watchlist' | 'none'; // 'none' for the placeholder
  label: string;
  width: string;
  defaultVisible: boolean;
}

export const ALL_COLUMNS: ColumnConfig[] = [
  { id: 'watchlist', label: 'Watchlist', width: 'w-[50px]', defaultVisible: true },
  { id: 'rank', label: 'Rank', width: 'w-[30px]', defaultVisible: true },
  { id: 'name', label: 'Company Name', width: 'w-[200px]', defaultVisible: true },
  { id: 'marketCap', label: 'Market Cap', width: 'w-[110px]', defaultVisible: true },
  { id: 'price', label: 'Price', width: 'w-[80px]', defaultVisible: true },
  { id: 'revenue', label: 'Revenue', width: 'w-[110px]', defaultVisible: true },
  { id: 'netIncome', label: 'Earnings', width: 'w-[90px]', defaultVisible: true },
  { id: 'peRatio', label: 'P/E Ratio', width: 'w-[75px]', defaultVisible: true },
  { id: 'priceToSalesRatio', label: 'P/S Ratio', width: 'w-[75px]', defaultVisible: false },
  { id: 'dividendYield', label: 'Dividend Yield', width: 'w-[100px]', defaultVisible: true },
  { id: 'netProfitMargin', label: 'Net Profit Margin', width: 'w-[120px]', defaultVisible: false },
  { id: 'freeCashFlow', label: 'Free Cash Flow', width: 'w-[120px]', defaultVisible: true },
  { id: 'revenueGrowth3Y', label: 'Rev G 3Y', width: 'w-[90px]', defaultVisible: false },
  { id: 'revenueGrowth5Y', label: 'Rev G 5Y', width: 'w-[90px]', defaultVisible: false },
  { id: 'revenueGrowth10Y', label: 'Rev G 10Y', width: 'w-[90px]', defaultVisible: true },
  { id: 'return3Year', label: '3Y Return', width: 'w-[85px]', defaultVisible: true },
  { id: 'return5Year', label: '5Y Return', width: 'w-[85px]', defaultVisible: true },
  { id: 'return10Year', label: '10Y Return', width: 'w-[85px]', defaultVisible: true },
  { id: 'maxDrawdown3Year', label: '3Y Max Drawdown', width: 'w-[120px]', defaultVisible: false },
  { id: 'maxDrawdown5Year', label: '5Y Max Drawdown', width: 'w-[120px]', defaultVisible: false },
  { id: 'maxDrawdown10Year', label: '10Y Max Drawdown', width: 'w-[120px]', defaultVisible: true },
  { id: 'arMddRatio3Year', label: '3Y AR/MDD Ratio', width: 'w-[120px]', defaultVisible: false },
  { id: 'arMddRatio5Year', label: '5Y AR/MDD Ratio', width: 'w-[120px]', defaultVisible: false },
  { id: 'arMddRatio10Year', label: '10Y AR/MDD Ratio', width: 'w-[120px]', defaultVisible: true },
  { id: 'dcfEnterpriseValue', label: 'DCF Enterprise Value', width: 'w-[130px]', defaultVisible: true },
  { id: 'marginOfSafety', label: 'Margin of Safety', width: 'w-[110px]', defaultVisible: true },
  { id: 'dcfImpliedGrowth', label: 'DCF Implied Growth', width: 'w-[130px]', defaultVisible: true },
  { id: 'assetTurnover', label: 'Asset Turnover', width: 'w-[110px]', defaultVisible: true },
  { id: 'financialLeverage', label: 'Financial Leverage', width: 'w-[110px]', defaultVisible: true },
  { id: 'roe', label: 'ROE %', width: 'w-[110px]', defaultVisible: true },
];

const PRESET_LAYOUTS = {
  'returnOnRisk': {
    name: 'Return on Risk (3, 5, 10 Years)',
    columns: ['watchlist', 'rank', 'name', 'marketCap', 'price', 'return10Y', 'maxDrawdown10Y', 'arMddRatio10Year', 'return5Y', 'maxDrawdown5Y', 'arMddRatio5Year', 'return3Y', 'maxDrawdown3Y', 'arMddRatio3Year'],
  },
  'dcfValuation': {
    name: 'DCF Valuation',
    columns: ['watchlist', 'rank', 'name', 'marketCap', 'price', 'revenue', 'revenueGrowth10Y', 'dcfEnterpriseValue', 'marginOfSafety'],
  },
  'reverseDcf': {
    name: 'Reverse DCF',
    columns: ['watchlist', 'rank', 'name', 'marketCap', 'price', 'revenue', 'revenueGrowth10Y', 'dcfImpliedGrowth'],
  },
  'dupontRoe': {
    name: 'DuPont ROE Decomposition',
    columns: ['watchlist', 'rank', 'name', 'marketCap', 'revenue', 'netIncome', 'netProfitMargin', 'assetTurnover', 'financialLeverage', 'roe'],
  },
};

const LAYOUT_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  'returnOnRisk': {
    title: "Return on Risk Analysis",
    description: "This layout helps you evaluate investment efficiency. It compares the annualized returns of stocks against their maximum drawdowns (the largest drop from a peak). The AR/MDD Ratio is a key metric here: a higher ratio suggests a better return for the amount of risk taken. This is useful for finding resilient stocks that have performed well without extreme volatility."
  },
  'dcfValuation': {
    title: "DCF Valuation Analysis",
    description: "This layout focuses on a company's intrinsic value using a Discounted Cash Flow (DCF) model. It estimates the company's value today based on projections of its future free cash flow. The 'Margin of Safety' shows the difference between the estimated DCF value and the current market price, helping you identify potentially undervalued stocks."
  },
  'reverseDcf': {
    title: "Reverse DCF Analysis",
    description: "This layout uses a Reverse DCF model to determine the growth expectations priced into a stock. The 'DCF Implied Growth' shows the future free cash flow growth rate required to justify the stock's current market price. You can compare this to historical growth rates (like 10Y Revenue Growth) to gauge whether the market's expectations are realistic."
  },
  'dupontRoe': {
      title: "DuPont ROE Decomposition",
      description: "This layout breaks down Return on Equity (ROE) into its key components: Net Profit Margin (profitability), Asset Turnover (efficiency), and Financial Leverage (debt). It helps to understand the drivers behind a company's ROE."
  }
};

const columnTooltips: Partial<Record<keyof Company | 'rank' | 'name' | 'watchlist' | 'none', string>> = {
  watchlist: 'Add to your personal watchlist. Click the star to add or the lock to sign in.',
  rank: 'Rank based on the current sorting criteria.',
  name: 'Company name and stock ticker symbol.',
  marketCap: 'The total market value of a company\'s outstanding shares.',
  price: 'The latest closing price of the stock.',
  revenue: 'The total amount of income generated by the sale of goods or services.',
  netIncome: 'The company\'s total earnings or profit.',
  peRatio: 'Price-to-Earnings ratio. A measure of the company\'s valuation.',
  priceToSalesRatio: 'Price-to-Sales ratio. Compares the stock price to its revenues.',
  dividendYield: 'The annual dividend per share as a percentage of the stock\'s price.',
  netProfitMargin: 'How much net income is generated as a percentage of revenue.',
  freeCashFlow: 'The cash a company generates after accounting for cash outflows to support operations and maintain its capital assets.',
  revenueGrowth3Y: 'The annualized revenue growth rate over the last 3 years.',
  revenueGrowth5Y: 'The annualized revenue growth rate over the last 5 years.',
  revenueGrowth10Y: 'The annualized revenue growth rate over the last 10 years.',
  return3Year: 'Annualized total return over the last 3 years.',
  return5Year: 'Annualized total return over the last 5 years.',
  return10Year: 'Annualized total return over the last 10 years.',
  maxDrawdown3Year: 'The largest peak-to-trough decline in the stock price over the last 3 years.',
  maxDrawdown5Year: 'The largest peak-to-trough decline in the stock price over the last 5 years.',
  maxDrawdown10Year: 'The largest peak-to-trough decline in the stock price over the last 10 years.',
  arMddRatio3Year: '3-Year Annualized Return divided by 3-Year Max Drawdown. Higher is better.',
  arMddRatio5Year: '5-Year Annualized Return divided by 5-Year Max Drawdown. Higher is better.',
  arMddRatio10Year: '10-Year Annualized Return divided by 10-Year Max Drawdown. Higher is better.',
  dcfEnterpriseValue: 'The estimated total value of the company based on projected future free cash flows, discounted to their present value.',
  marginOfSafety: 'The percentage difference between the DCF Enterprise Value and the current Market Cap. A positive value suggests undervaluation.',
  dcfImpliedGrowth: 'The Free Cash Flow growth rate required to justify the current stock price. Compared visually to the 10Y Revenue Growth.',
  assetTurnover: 'Measures how efficiently a company uses its assets to generate revenue. Calculated as Total Revenue / Total Assets.',
  financialLeverage: 'Measures the extent to which a company uses debt to finance its assets. Calculated as Total Assets / Total Equity.',
  roe: 'Return on Equity measures a company\'s profitability in relation to stockholders\' equity. Calculated as Net Income / Total Equity.',
};


interface CompanyTableProps {
  searchQuery: string;
  dataset: 'sp500' | 'nasdaq100' | 'ftse100' | 'dowjones';
  activeTab: 'sp500' | 'nasdaq100' | 'dowjones';
}

export function CompanyTable({ searchQuery, dataset, activeTab }: CompanyTableProps) {
  const [sortBy, setSortBy] = useState<string>('none'); // Default to 'none' for placeholder
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [watchlistPending, setWatchlistPending] = useState<Record<string, boolean>>({});
  const [watchOverrides, setWatchOverrides] = useState<Record<string, boolean>>({});
  const { user, session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isLoggedIn = !!user || !!session;
  const isPaidUser = user?.subscriptionTier === 'paid' || user?.subscriptionTier === 'quarterly' || user?.subscriptionTier === 'annual';

  useEffect(() => {
    setSelectedLayout(null);
  }, [dataset]);

  useEffect(() => {
    if (authLoading) return;
    if (selectedLayout) return;

    const lockedColumns = [
      'maxDrawdown5Year', 'maxDrawdown10Year',
      'arMddRatio3Year', 'arMddRatio5Year', 'arMddRatio10Year',
      'dcfEnterpriseValue', 'marginOfSafety', 'dcfImpliedGrowth',
      'assetTurnover', 'financialLeverage', 'roe'
    ];

    const defaultVisibility = ALL_COLUMNS.reduce((acc, col) => {
      const isLocked = !isPaidUser && dataset !== 'dowjones' && lockedColumns.includes(col.id as string);
      acc[col.id] = isLocked ? false : col.defaultVisible;
      return acc;
    }, {} as VisibilityState);

    setColumnVisibility(defaultVisibility);
  }, [authLoading, isPaidUser, dataset, selectedLayout]);

  console.log('[Auth Debug] In CompanyTable:', {
    authLoading,
    user,
    isLoggedIn,
    isPaidUser,
    showUpgradeButton: !authLoading && !isPaidUser
  });

  const handleUpgradeClick = async (priceId: string) => {
    console.log(`[1/5] handleUpgradeClick triggered with priceId: ${priceId}`);

    if (!session) {
      console.error("[FAIL] Aborted: No user session found in auth context.");
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upgrade. Please log in and try again.",
        variant: "destructive",
      });
      return;
    }

    if (!priceId) {
      console.error("[FAIL] Aborted: priceId is missing or undefined.");
      toast({
        title: "Configuration Error",
        description: "Price ID is missing. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    console.log("[2/5] Closing the upgrade modal.");
    setIsUpgradeModalOpen(false);

    try {
      console.log("[3/5] Calling authFetch to create Stripe session...");
      const response = await authFetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      }, session.access_token);

      console.log("[4/5] Received response from authFetch:", response);

      if (!response || !response.sessionId) {
        console.error("[FAIL] Invalid session data received from server:", response);
        throw new Error("Failed to create checkout session. Server response was invalid.");
      }

      const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      const stripe = await stripePromise;

      if (stripe) {
        console.log("[5/5] Redirecting to Stripe checkout...");
        const result = await stripe.redirectToCheckout({
            sessionId: response.sessionId,
        });

        if (result.error) {
          console.error('[FAIL] Stripe redirect error:', result.error);
          toast({
            title: "Payment Error",
            description: result.error.message,
            variant: "destructive",
          });
        }
      } else {
        console.error("[FAIL] Stripe.js failed to load.");
      }
    } catch (error) {
      console.error("[FAIL] Upgrade process error:", error);
      toast({
        title: "Upgrade Failed",
        description: (error as Error).message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Watchlist mutations (only fetch if authenticated)
  const { data: watchlistData } = useQuery<Array<{ companySymbol: string }>>({
    queryKey: ['/api/watchlist'],
    queryFn: () => authFetch('/api/watchlist'),
    enabled: !!isLoggedIn,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const { mutate: addToWatchlist } = useMutation({
    mutationFn: (companySymbol: string) => authFetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companySymbol }),
    }),
    onMutate: async (companySymbol: string) => {
      setWatchlistPending(prev => ({ ...prev, [companySymbol]: true }));
      setWatchOverrides(prev => ({ ...prev, [companySymbol]: true }));
      // Snapshot previous values (для возможного отката)
      const prevList = queryClient.getQueryData<Array<{ companySymbol: string }>>(['/api/watchlist']);
      const prevCompanies = queryClient.getQueryData<{ companies: any[], total: number, hasMore: boolean }>([apiEndpoint, page, sortBy, sortOrder, searchQuery]);
      // Optimistic update
      queryClient.setQueryData<Array<{ companySymbol: string }>>(['/api/watchlist'], (old) => {
        const curr = old || [];
        if (curr.some(i => i.companySymbol === companySymbol)) return curr;
        return [...curr, { companySymbol }];
      });
      queryClient.setQueryData<{ companies: any[], total: number, hasMore: boolean }>([apiEndpoint, page, sortBy, sortOrder, searchQuery], (old) => {
        if (!old) return old as any;
        return { ...old, companies: old.companies.map(c => c.symbol === companySymbol ? { ...c, isWatched: true } : c) };
      });
      return { prevList, prevCompanies };
    },
    onError: (_err, companySymbol, ctx) => {
      // Rollback on error
      if (ctx?.prevList) queryClient.setQueryData(['/api/watchlist'], ctx.prevList);
      if (ctx?.prevCompanies) queryClient.setQueryData([apiEndpoint, page, sortBy, sortOrder, searchQuery], ctx.prevCompanies);
      setWatchOverrides(prev => ({ ...prev, [companySymbol]: false }));
      toast({ title: "Error", description: `Failed to add ${companySymbol} to watchlist.`, variant: "destructive" });
    },
    onSuccess: (_data, companySymbol) => {
      // Keep cache consistent
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/companies'] });
      toast({ title: "Success", description: `${companySymbol} added to watchlist.` });
    },
    onSettled: (_data, _err, companySymbol) => {
      if (companySymbol) setWatchlistPending(prev => ({ ...prev, [companySymbol]: false }));
    }
  });

  const { mutate: removeFromWatchlist } = useMutation({
    mutationFn: (companySymbol: string) => authFetch(`/api/watchlist/${companySymbol}`, { method: 'DELETE' }),
    onMutate: async (companySymbol: string) => {
      setWatchlistPending(prev => ({ ...prev, [companySymbol]: true }));
      setWatchOverrides(prev => ({ ...prev, [companySymbol]: false }));
      const prevList = queryClient.getQueryData<Array<{ companySymbol: string }>>(['/api/watchlist']);
      const prevCompanies = queryClient.getQueryData<{ companies: any[], total: number, hasMore: boolean }>([apiEndpoint, page, sortBy, sortOrder, searchQuery]);
      queryClient.setQueryData<Array<{ companySymbol: string }>>(['/api/watchlist'], (old) => (old || []).filter(i => i.companySymbol !== companySymbol));
      queryClient.setQueryData<{ companies: any[], total: number, hasMore: boolean }>([apiEndpoint, page, sortBy, sortOrder, searchQuery], (old) => {
        if (!old) return old as any;
        return { ...old, companies: old.companies.map(c => c.symbol === companySymbol ? { ...c, isWatched: false } : c) };
      });
      return { prevList, prevCompanies };
    },
    onError: (_err, companySymbol, ctx) => {
      if (ctx?.prevList) queryClient.setQueryData(['/api/watchlist'], ctx.prevList);
      if (ctx?.prevCompanies) queryClient.setQueryData([apiEndpoint, page, sortBy, sortOrder, searchQuery], ctx.prevCompanies);
      setWatchOverrides(prev => ({ ...prev, [companySymbol]: true }));
      toast({ title: "Error", description: `Failed to remove ${companySymbol} from watchlist.`, variant: "destructive" });
    },
    onSuccess: (_data, companySymbol) => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/companies'] });
      toast({ title: "Success", description: `${companySymbol} removed from watchlist.` });
    },
    onSettled: (_data, _err, companySymbol) => {
      if (companySymbol) setWatchlistPending(prev => ({ ...prev, [companySymbol]: false }));
    }
  });

  const handleWatchlistToggle = (symbol: string, isCurrentlyWatched: boolean) => {
    if (!isLoggedIn) {
      toast({
        title: "🔒 Sign In Required",
        description: "You need to sign in to add companies to your personal watchlist. Click the 'Sign In' button in the top right corner.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    if (isCurrentlyWatched) {
      removeFromWatchlist(symbol);
    } else {
      addToWatchlist(symbol);
    }
  };

  let apiEndpoint: string;
  switch (dataset) {
    case 'sp500':
      apiEndpoint = '/api/sp500';
      break;
    case 'nasdaq100':
      apiEndpoint = '/api/nasdaq100';
      break;
    case 'dowjones':
      apiEndpoint = '/api/dowjones';
      break;
    default:
      apiEndpoint = '/api/companies';
  }

  const { data, isLoading, error } = useQuery<{ companies: Company[], total: number, hasMore: boolean }>({
    queryKey: [apiEndpoint, page, sortBy, sortOrder, searchQuery],
    queryFn: async ({ queryKey }) => {
      const [url, page, currentSortBy, sortOrder, search] = queryKey as [
        string,
        number,
        string,
        string,
        string,
      ];

      const params = new URLSearchParams({
        offset: String(page * limit),
        limit: String(limit),
      });

      // Only add sorting parameters if a sort order is actually selected
      if (currentSortBy && currentSortBy !== 'none') {
        params.append("sortBy", currentSortBy);
        params.append("sortOrder", sortOrder);
      }

      if (search) {
        params.append("search", search);
      }

      params.append("_", new Date().getTime().toString());

      const response = await fetch(`https://findgreatstocks-production.up.railway.app${url}?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }
      const raw = await response.json();
      const toStr = (v: any): string | null => (v === null || v === undefined ? null : String(v));
      const mapRow = (row: any): Company => ({
        id: row.id,
        symbol: row.symbol,
        name: row.name,
        marketCap: toStr(row.marketCap ?? row.market_cap),
        price: toStr(row.price),
        dailyChange: toStr(row.dailyChange ?? row.daily_change),
        dailyChangePercent: toStr(row.dailyChangePercent ?? row.daily_change_percent),
        country: row.country ?? null,
        rank: row.rank ?? null,
        logo: row.logo ?? null,
        logoUrl: row.logoUrl ?? row.logo_url ?? null,
        peRatio: toStr(row.peRatio ?? row.pe_ratio),
        eps: toStr(row.eps),
        dividendYield: toStr(row.dividendYield ?? row.dividend_yield),
        priceToSalesRatio: toStr(row.priceToSalesRatio ?? row.price_to_sales_ratio),
        revenue: toStr(row.revenue),
        netIncome: toStr(row.netIncome ?? row.net_income),
        freeCashFlow: toStr(row.freeCashFlow ?? row.free_cash_flow),
        revenueGrowth3Y: toStr(row.revenueGrowth3Y ?? row.revenue_growth_3y),
        revenueGrowth5Y: toStr(row.revenueGrowth5Y ?? row.revenue_growth_5y),
        revenueGrowth10Y: toStr(row.revenueGrowth10Y ?? row.revenue_growth_10y),
        return3Year: toStr(row.return3Year ?? row.return_3_year),
        return5Year: toStr(row.return5Year ?? row.return_5_year),
        return10Year: toStr(row.return10Year ?? row.return_10_year),
        maxDrawdown3Year: toStr(row.maxDrawdown3Year ?? row.max_drawdown_3_year),
        maxDrawdown5Year: toStr(row.maxDrawdown5Year ?? row.max_drawdown_5_year),
        maxDrawdown10Year: toStr(row.maxDrawdown10Year ?? row.max_drawdown_10_year),
        arMddRatio: toStr(row.arMddRatio ?? row.ar_mdd_ratio),
        arMddRatio3Year: toStr(row.arMddRatio3Year ?? row.ar_mdd_ratio_3_year),
        arMddRatio5Year: toStr(row.arMddRatio5Year ?? row.ar_mdd_ratio_5_year),
        arMddRatio10Year: toStr(row.arMddRatio10Year ?? row.ar_mdd_ratio_10_year),
        netProfitMargin: toStr(row.netProfitMargin ?? row.net_profit_margin),
        assetTurnover: toStr(row.assetTurnover),
        financialLeverage: toStr(row.financialLeverage),
        roe: toStr(row.roe),
        dcfEnterpriseValue: toStr(row.dcfEnterpriseValue ?? row.dcf_enterprise_value),
        marginOfSafety: toStr(row.marginOfSafety ?? row.margin_of_safety),
        dcfImpliedGrowth: toStr(row.dcfImpliedGrowth ?? row.dcf_implied_growth),
        latestFcf: toStr(row.latestFcf ?? row.latest_fcf),
      });
      return {
        ...raw,
        companies: Array.isArray(raw.companies) ? raw.companies.map(mapRow) : [],
      };
    },
    // Кэширование и моментальная отдача данных без скелетонов
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const tableData = useMemo(() => {
    if (data?.companies) {
      const watchlistSymbols = new Set(watchlistData?.map((item) => item.companySymbol) || []);
      return data.companies.map(company => {
        const override = watchOverrides[company.symbol];
        const explicit = (company as any).isWatched;
        const base = typeof explicit === 'boolean' ? explicit : watchlistSymbols.has(company.symbol);
        const isWatched = typeof override === 'boolean' ? override : base;
        return { ...company, isWatched } as any;
      });
    }
    return [];
  }, [data, watchlistData, watchOverrides]);

  // Синхронизация: при изменении серверного списка Watchlist сбрасываем локальные overrides,
  // чтобы звезды отражали актуальное состояние (например, после удаления во вкладке Watchlist)
  useEffect(() => {
    setWatchOverrides({});
  }, [watchlistData]);

  const columns = useMemo<ColumnDef<DisplayCompany>[]>(() => {
    return ALL_COLUMNS.map(colConfig => {
      const columnDef: ColumnDef<DisplayCompany> = {
        accessorKey: colConfig.id,
        header: () => (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center ${colConfig.id === 'name' ? 'justify-start' : 'justify-center'} gap-1`}>
                  {colConfig.id === 'watchlist' ? <Star className="h-4 w-4" /> : colConfig.label}
                  {colConfig.id !== 'watchlist' && <SortIcon column={colConfig.id} />}
                </div>
              </TooltipTrigger>
              {columnTooltips[colConfig.id] && (
                <TooltipContent side="bottom" align="center" className="max-w-xs z-50">
                  <p>{columnTooltips[colConfig.id]}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ),
        cell: (info) => {
          const row = info.row.original;
          let cellContent;
          switch (colConfig.id) {
            case 'watchlist':
              const isWatched = row.isWatched || false;
              cellContent = (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`p-1 h-auto transition-colors ${
                          isWatched
                            ? 'text-yellow-500 hover:text-yellow-600'
                            : isLoggedIn
                              ? 'text-muted-foreground hover:text-yellow-500'
                              : 'text-muted-foreground opacity-60 cursor-not-allowed'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isLoggedIn) {
                            handleWatchlistToggle(row.symbol, isWatched);
                          }
                        }}
                        disabled={!!watchlistPending[row.symbol]}
                      >
                        {isLoggedIn ? (
                          <Star className={`h-4 w-4 ${isWatched ? 'fill-current' : ''}`} />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {isLoggedIn 
                          ? (isWatched ? 'Remove from watchlist' : 'Add to watchlist')
                          : 'Sign in to add to watchlist'
                        }
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
              break;
            case 'rank':
              cellContent = <div className="font-medium">{(page * limit) + info.row.index + 1}</div>;
              break;
            case 'name':
              cellContent = (
                <div className="flex items-center gap-2">
                  <img
                    src={(row.logoUrl && String(row.logoUrl).trim() !== '') ? row.logoUrl : `https://financialmodelingprep.com/image-stock/${row.symbol.replace('-', '.')}.png`}
                    alt={`${row.symbol} logo`}
                    className="h-6 w-6 rounded object-contain bg-white/80 border border-gray-100 dark:border-gray-800 dark:bg-gray-900/80 p-0.5 flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32'; }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium group-hover:text-primary transition-colors truncate text-sm">{row.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{row.symbol}</div>
                  </div>
                </div>
              );
              break;
            case 'marketCap':
              cellContent = <div className="font-mono font-medium">{formatMarketCap(row.marketCap)}</div>;
              break;
            case 'price':
              cellContent = <div className="font-mono">{formatPrice(row.price)}</div>;
              break;
            case 'revenue':
              cellContent = <div className="font-mono">{row.revenue ? formatMarketCap(row.revenue) : <span className="text-muted-foreground">-</span>}</div>;
              break;
            case 'netIncome':
                cellContent = <div className="font-mono">{formatEarnings(row.netIncome)}</div>;
                break;
            case 'peRatio':
              cellContent = <div className="font-mono">{formatNumber(row.peRatio, 1)}</div>;
              break;
            case 'priceToSalesRatio':
              cellContent = <div className="font-mono">{formatNumber(row.priceToSalesRatio, 1)}</div>;
              break;
            case 'dividendYield':
              cellContent = <div className="font-mono">{formatPercentage(row.dividendYield, false, 2)}</div>;
              break;
            case 'netProfitMargin':
              const npmValue = row.netProfitMargin as number | null;
              if (npmValue === null || npmValue === undefined) {
                  cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
              } else {
                  let badgeClass = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                  if (npmValue > 20) {
                    badgeClass = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950";
                  } else if (npmValue >= 5) {
                    badgeClass = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                  }
                  cellContent = <Badge variant="outline" className={`${badgeClass} font-mono`}>{formatPercentage(npmValue, false, 1)}</Badge>;
              }
              break;
            case 'freeCashFlow':
              cellContent = <div className="font-mono">{formatMarketCap(row.freeCashFlow)}</div>;
              break;
            case 'revenueGrowth3Y':
              cellContent = <div className="font-mono">{formatPercentage(row.revenueGrowth3Y, false, 1)}</div>;
              break;
            case 'revenueGrowth5Y':
              cellContent = <div className="font-mono">{formatPercentage(row.revenueGrowth5Y, false, 1)}</div>;
              break;
            case 'revenueGrowth10Y':
              cellContent = <div className="font-mono">{formatPercentage(row.revenueGrowth10Y, false, 1)}</div>;
              break;
            case 'return3Year':
            case 'return5Year':
            case 'return10Year':
              cellContent = row[colConfig.id] ? (
                <Badge variant="outline" className={`font-mono ${parseFloat(row[colConfig.id] as string) >= 0 ? 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950' : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'}`}>{formatPercentage(row[colConfig.id] as string, true)}</Badge>
              ) : <span className="text-muted-foreground">-</span>;
              break;
            case 'maxDrawdown3Year':
            case 'maxDrawdown5Year':
            case 'maxDrawdown10Year':
              cellContent = row[colConfig.id] ? (
                <Badge variant="outline" className="font-mono text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950">-{formatPercentage(row[colConfig.id] as string, false, 2)}</Badge>
              ) : <span className="text-muted-foreground">-</span>;
              break;
            case 'arMddRatio3Year':
            case 'arMddRatio5Year':
            case 'arMddRatio10Year':
                cellContent = row[colConfig.id] ? (
                  <Badge variant="outline" className={`font-mono ${parseFloat(row[colConfig.id] as string) >= 0.5 ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950' : parseFloat(row[colConfig.id] as string) >= 0.2 ? 'text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950' : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'}`}>{formatNumber(row[colConfig.id] as string, 2)}</Badge>
                  ) : <span className="text-muted-foreground">-</span>;
                  break;
            case 'dcfEnterpriseValue':
              cellContent = <div className="font-mono">{row.dcfEnterpriseValue ? formatMarketCap(row.dcfEnterpriseValue) : <span className="text-muted-foreground">-</span>}</div>;
              break;
            case 'marginOfSafety':
              cellContent = row.marginOfSafety ? (
                <Badge variant="outline" className={`font-mono ${
                  parseFloat(row.marginOfSafety as string) >= 0.25
                    ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950'
                    : parseFloat(row.marginOfSafety as string) > 0
                    ? 'text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950'
                    : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'
                }`}>{formatPercentageFromDecimal(row.marginOfSafety, true)}</Badge>
              ) : <span className="text-muted-foreground">-</span>;
              break;
            case 'dcfImpliedGrowth':
              const impliedGrowth = row.dcfImpliedGrowth ? parseFloat(row.dcfImpliedGrowth) : null;
              const revenueGrowth10Y = row.revenueGrowth10Y ? parseFloat(row.revenueGrowth10Y) / 100 : null;
              let badgeClass = '';
              if (impliedGrowth !== null && revenueGrowth10Y !== null) {
                if (impliedGrowth < revenueGrowth10Y) {
                  badgeClass = 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950';
                } else {
                  badgeClass = 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950';
                }
              }
              cellContent = row.dcfImpliedGrowth ? (
                <Badge variant="outline" className={`font-mono ${badgeClass}`}>
                  {formatPercentageFromDecimal(row.dcfImpliedGrowth, false)}
                </Badge>
              ) : <span className="text-muted-foreground">-</span>;
              break;
            case 'assetTurnover':
              const atValue = row.assetTurnover as number | null;
              if (atValue === null || atValue === undefined) {
                  cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
              } else {
                  let badgeClass = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                  if (atValue > 1.0) {
                    badgeClass = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950";
                  } else if (atValue >= 0.5) {
                    badgeClass = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                  }
                  cellContent = <Badge variant="outline" className={`${badgeClass} font-mono`}>{formatNumber(atValue, 2)}</Badge>;
              }
              break;
            case 'financialLeverage':
              const flValue = row.financialLeverage as number | null;
              if (flValue === null || flValue === undefined) {
                  cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
              } else {
                  let badgeClass = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950"; // Green is default (low leverage)
                  if (flValue > 4.0) {
                    badgeClass = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                  } else if (flValue >= 2.0) {
                    badgeClass = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                  }
                  cellContent = <Badge variant="outline" className={`${badgeClass} font-mono`}>{formatNumber(flValue, 2)}</Badge>;
              }
              break;
            case 'roe':
                const roeValue = row.roe as number | null;
                if (roeValue === null || roeValue === undefined) {
                    cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
                } else {
                    const roe = roeValue * 100;
                    let roeBadgeClass = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                    if (roe > 15) {
                      roeBadgeClass = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950";
                    } else if (roe >= 5) {
                      roeBadgeClass = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                    }
                    cellContent = <Badge variant="outline" className={`${roeBadgeClass} font-mono`}>{formatPercentage(roe, true, 1)}</Badge>;
                }
                break;
            default:
                cellContent = <span className="text-muted-foreground">-</span>;
              break;
          }
          return cellContent;
        },
        meta: {
          columnConfig: colConfig,
        },
      };
      return columnDef;
    });
  }, [page, limit, watchlistData]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting: [
        {
          id: sortBy,
          desc: sortOrder === 'desc',
        },
      ],
      columnVisibility,
      pagination: {
        pageIndex: page,
        pageSize: limit,
      },
    },
    onSortingChange: (updater) => {
      if (typeof updater === 'function') {
        const newSorting = updater(table.getState().sorting);
        if (newSorting.length > 0) {
          setSortBy(newSorting[0].id);
          setSortOrder(newSorting[0].desc ? 'desc' : 'asc');
        } else {
          setSortBy('none');
        }
      } else {
        const newSorting = updater;
        if (newSorting.length > 0) {
          setSortBy(newSorting[0].id);
          setSortOrder(newSorting[0].desc ? 'desc' : 'asc');
        } else {
          setSortBy('none');
        }
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: data?.total ? Math.ceil(data.total / limit) : -1,
    onRowSelectionChange: setRowSelection,
    manualSorting: true,
  });

  // Prefetch данных для соседних вкладок, чтобы переключение было мгновенным
  useEffect(() => {
    const datasets: Array<{ key: CompanyTableProps['dataset']; endpoint: string }> = [
      { key: 'sp500', endpoint: '/api/sp500' },
      { key: 'nasdaq100', endpoint: '/api/nasdaq100' },
      { key: 'dowjones', endpoint: '/api/dowjones' },
    ];
    // Prefetch для текущего датасета: следующие страницы (page+1, page+2)
    const current = datasets.find(d => d.key === dataset)!;
    const pagesToPrefetchCurrent = [page + 1, page + 2].filter(p => p >= 0);
    for (const p of pagesToPrefetchCurrent) {
      const params = new URLSearchParams({ offset: String(p * limit), limit: String(limit) });
      if (sortBy && sortBy !== 'none') { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
      if (searchQuery) params.append('search', searchQuery);
      const qk = [current.endpoint, p, sortBy, sortOrder, searchQuery] as const;
      queryClient.prefetchQuery({
        queryKey: qk as any,
        queryFn: async () => {
          const res = await fetch(`https://findgreatstocks-production.up.railway.app${current.endpoint}?${params.toString()}`);
          if (!res.ok) throw new Error('Failed to prefetch companies');
          return res.json();
        },
        staleTime: 5 * 60 * 1000,
      });
    }

    // Prefetch для соседних датасетов: первые 3 страницы (0..2)
    const others = datasets.filter(d => d.key !== dataset);
    for (const d of others) {
      for (const p of [0, 1, 2]) {
        const params = new URLSearchParams({ offset: String(p * limit), limit: String(limit) });
        if (sortBy && sortBy !== 'none') { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
        if (searchQuery) params.append('search', searchQuery);
        const qk = [d.endpoint, p, sortBy, sortOrder, searchQuery] as const;
        queryClient.prefetchQuery({
          queryKey: qk as any,
          queryFn: async () => {
            const res = await fetch(`https://findgreatstocks-production.up.railway.app${d.endpoint}?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to prefetch companies');
            return res.json();
          },
          staleTime: 5 * 60 * 1000,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, sortBy, sortOrder, searchQuery]);


  // This effect is no longer needed with the correct react-table implementation
  // useEffect(() => {
  //   ...
  // }, [columnVisibility]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(0); // Reset to first page when sorting changes
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ChevronUp className="h-4 w-4 opacity-30" />;
    return sortOrder === 'asc' ?
      <ChevronUp className="h-4 w-4" /> :
      <ChevronDown className="h-4 w-4" />;
  };

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-500">Failed to load company data. Please try again.</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
          Reload
        </Button>
      </Card>
    );
  }

  const showSkeletons = isLoading || authLoading;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
          <Select value={sortBy} onValueChange={(value) => {
            if (value === 'none') return;
            setSortBy(value);
            setSortOrder('desc'); // Default to descending for most metrics
            setPage(0); // Reset to first page when sorting changes
          }}>
            <SelectTrigger className="w-full sm:w-48 text-sm">
              <SelectValue placeholder="Rank by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>Rank by...</SelectItem>
              {ALL_COLUMNS
                .filter(c => c.id !== 'watchlist' && c.id !== 'rank' && c.id !== 'name' && c.id !== 'none')
                .map(col => {
                  const lockedColumns = [
                    'maxDrawdown5Year', 'maxDrawdown10Year',
                    'arMddRatio3Year', 'arMddRatio5Year', 'arMddRatio10Year',
                    'dcfEnterpriseValue', 'marginOfSafety', 'dcfImpliedGrowth',
                    'assetTurnover', 'financialLeverage', 'roe'
                  ];
                  const isLocked = !isPaidUser && dataset !== 'dowjones' && lockedColumns.includes(col.id);

                  return (
                    <SelectItem key={col.id} value={col.id} disabled={isLocked}>
                      <div className="flex items-center justify-between w-full">
                        <span>{col.label}</span>
                        {isLocked && <Lock className="h-4 w-4 text-muted-foreground ml-2" />}
                      </div>
                    </SelectItem>
                  );
              })}
            </SelectContent>
          </Select>

          <div className="flex-1 flex justify-end items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto text-sm">
                  <Settings2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Visible Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-80 overflow-y-auto">
                  {ALL_COLUMNS
                    .filter(c => !['watchlist', 'rank', 'name'].includes(c.id))
                    .map((colConfig) => {
                      const column = table.getColumn(colConfig.id);
                      if (!column) return null;

                      const lockedColumns = [
                        'maxDrawdown5Year', 'maxDrawdown10Year',
                        'arMddRatio3Year', 'arMddRatio5Year', 'arMddRatio10Year',
                        'dcfEnterpriseValue', 'marginOfSafety', 'dcfImpliedGrowth',
                        'assetTurnover', 'financialLeverage', 'roe'
                      ];

                      const isLocked = !isPaidUser && dataset !== 'dowjones' && lockedColumns.includes(colConfig.id);

                      return (
                        <DropdownMenuCheckboxItem
                          key={colConfig.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                          disabled={isLocked}
                          onSelect={(e) => e.preventDefault()}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{colConfig.label}</span>
                            {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <span className="flex items-center">
                    Choose Layout
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Table Layouts</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(PRESET_LAYOUTS).map(([key, layout]) => {
                  const isPaidLayout = ['dcfValuation', 'dupontRoe', 'returnOnRisk', 'reverseDcf'].includes(key);
                  const isLocked = !isPaidUser && dataset !== 'dowjones' && isPaidLayout;
                  return (
                    <DropdownMenuItem
                      key={key}
                      disabled={isLocked}
                      onSelect={() => {
                        if (isLocked) return;
                        const newVisibility = ALL_COLUMNS.reduce((acc, col) => {
                          if (['watchlist', 'rank', 'name'].includes(col.id)) {
                            acc[col.id] = true;
                          } else {
                            acc[col.id] = layout.columns.includes(col.id);
                          }
                          return acc;
                        }, {} as VisibilityState);
                        setColumnVisibility(newVisibility);
                        setSelectedLayout(key);
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{layout.name}</span>
                        {isLocked && <Lock className="h-4 w-4 text-muted-foreground ml-2" />}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            {!authLoading && !isPaidUser && (
               <Button onClick={() => setIsUpgradeModalOpen(true)}>
                <Unlock className="mr-2 h-4 w-4" />
                Upgrade
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Layout Description Box */}
      {selectedLayout && LAYOUT_DESCRIPTIONS[selectedLayout] && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 transition-all">
           <div className="flex justify-between items-start gap-4">
            <div>
              <h4 className="font-semibold text-blue-800 dark:text-blue-200">{LAYOUT_DESCRIPTIONS[selectedLayout].title}</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {LAYOUT_DESCRIPTIONS[selectedLayout].description}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => setSelectedLayout(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="w-full min-w-[1200px] table-fixed">
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id} className="bg-muted/50">
                  {headerGroup.headers.map(header => (
                    <TableHead
                      key={header.id}
                      className={`text-right cursor-pointer hover:bg-muted/80 transition-colors ${ (header.column.columnDef.meta as any)?.columnConfig.width } ${
                        sortBy === header.id ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300' : ''
                      }`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
              <TableBody>
                {showSkeletons ? (
                  // Loading skeleton
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {table.getVisibleFlatColumns().map(column => (
                        <TableCell key={column.id} className={
                          (column.columnDef.meta as any)?.columnConfig.id === 'rank' || (column.columnDef.meta as any)?.columnConfig.id === 'watchlist'
                            ? 'text-center'
                            : (column.columnDef.meta as any)?.columnConfig.id === 'name'
                            ? ''
                            : 'text-right'
                        }>
                          <Skeleton className="h-6" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={table.getVisibleFlatColumns().length} className="text-center py-12">
                      <div className="text-muted-foreground">
                        {searchQuery ?
                          'No companies found matching your search.' :
                          'No companies available.'
                        }
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <TableRow
                      key={row.id}
                      className="hover:bg-muted/50 cursor-pointer group transition-colors"
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className={
                          (cell.column.columnDef.meta as any)?.columnConfig.id === 'rank' || (cell.column.columnDef.meta as any)?.columnConfig.id === 'watchlist'
                            ? 'text-center'
                            : (cell.column.columnDef.meta as any)?.columnConfig.id === 'name'
                            ? ''
                            : 'text-right'
                        }>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {page * limit + 1} to {Math.min((page + 1) * limit, data.total)} of {data.total} companies
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.hasMore}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgrade={handleUpgradeClick}
      />
    </div>
  );
}