import { useState, useEffect, useMemo } from "react";
import React from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, Star, Download, Search, Settings2, X, Lock, Unlock, MoreVertical, Move, Copy, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UpgradeModal } from './UpgradeModal';
import { WatchlistManager } from './WatchlistManager';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatMarketCap, formatPercentage, formatPrice, formatEarnings, formatNumber, formatPercentageFromDecimal } from "@/lib/format";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/providers/AuthProvider";
import { useFlag } from "@/providers/FeatureFlagsProvider";
import { useToast } from "@/hooks/use-toast";
import type { Company, Nasdaq100Company } from "../types";
import { supabase } from "@/lib/supabaseClient";

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
  id: keyof Company | 'rank' | 'name' | 'watchlist' | 'none' | 'dcfVerdict'; // 'none' for the placeholder
  label: string;
  width: string;
  defaultVisible: boolean;
}

export const ALL_COLUMNS: ColumnConfig[] = [
  { id: 'watchlist', label: 'Watchlist', width: 'w-[40px] sm:w-[50px]', defaultVisible: true },
  { id: 'rank', label: 'Rank', width: 'w-[24px] sm:w-[30px]', defaultVisible: true },
  { id: 'name', label: 'Company Name', width: 'w-[140px] sm:w-[220px]', defaultVisible: true },
  { id: 'marketCap', label: 'Market Cap', width: 'w-[80px] sm:w-[110px]', defaultVisible: true },
  { id: 'price', label: 'Price', width: 'w-[60px] sm:w-[80px]', defaultVisible: true },
  { id: 'revenue', label: 'Revenue', width: 'w-[90px] sm:w-[110px]', defaultVisible: true },
  { id: 'netIncome', label: 'Earnings', width: 'w-[90px] sm:w-[110px]', defaultVisible: true },
  { id: 'totalAssets', label: 'Total Assets', width: 'w-[110px] sm:w-[140px]', defaultVisible: false },
  { id: 'totalEquity', label: 'Total Equity', width: 'w-[110px] sm:w-[140px]', defaultVisible: false },
  { id: 'peRatio', label: 'P/E Ratio', width: 'w-[60px] sm:w-[75px]', defaultVisible: true },
  { id: 'priceToSalesRatio', label: 'P/S Ratio', width: 'w-[60px] sm:w-[75px]', defaultVisible: false },
  { id: 'dividendYield', label: 'Dividend Yield', width: 'w-[80px] sm:w-[100px]', defaultVisible: true },
  { id: 'netProfitMargin', label: 'Net Profit Margin', width: 'w-[96px] sm:w-[120px]', defaultVisible: false },
  { id: 'freeCashFlow', label: 'Free Cash Flow', width: 'w-[100px] sm:w-[120px]', defaultVisible: true },
  { id: 'fcfMargin', label: 'FCF Margin %', width: 'w-[90px] sm:w-[110px]', defaultVisible: false },
  { id: 'fcfMarginMedian10Y', label: 'FCF Margin 10Y Median %', width: 'w-[120px] sm:w-[150px]', defaultVisible: false },
  { id: 'debtToEquity', label: 'Debt-to-Equity', width: 'w-[100px] sm:w-[120px]', defaultVisible: false },
  { id: 'interestCoverage', label: 'Interest Coverage', width: 'w-[110px] sm:w-[130px]', defaultVisible: false },
  { id: 'cashFlowToDebt', label: 'Cash Flow to Debt', width: 'w-[110px] sm:w-[130px]', defaultVisible: false },
  { id: 'revenueGrowth3Y', label: 'Rev G 3Y', width: 'w-[72px] sm:w-[90px]', defaultVisible: false },
  { id: 'revenueGrowth5Y', label: 'Rev G 5Y', width: 'w-[72px] sm:w-[90px]', defaultVisible: false },
  { id: 'revenueGrowth10Y', label: 'Rev G 10Y', width: 'w-[72px] sm:w-[90px]', defaultVisible: true },
  { id: 'return3Year', label: '3Y Return', width: 'w-[72px] sm:w-[85px]', defaultVisible: true },
  { id: 'return5Year', label: '5Y Return', width: 'w-[72px] sm:w-[85px]', defaultVisible: true },
  { id: 'return10Year', label: '10Y Return', width: 'w-[72px] sm:w-[85px]', defaultVisible: true },
  { id: 'maxDrawdown3Year', label: '3Y Max Drawdown', width: 'w-[100px] sm:w-[120px]', defaultVisible: false },
  { id: 'maxDrawdown5Year', label: '5Y Max Drawdown', width: 'w-[100px] sm:w-[120px]', defaultVisible: false },
  { id: 'maxDrawdown10Year', label: '10Y Max Drawdown', width: 'w-[100px] sm:w-[120px]', defaultVisible: true },
  { id: 'arMddRatio3Year', label: '3Y Return/Risk', width: 'w-[100px] sm:w-[120px]', defaultVisible: false },
  { id: 'arMddRatio5Year', label: '5Y Return/Risk', width: 'w-[100px] sm:w-[120px]', defaultVisible: false },
  { id: 'arMddRatio10Year', label: '10Y Return/Risk', width: 'w-[100px] sm:w-[120px]', defaultVisible: true },
  { id: 'dcfEnterpriseValue', label: 'DCF Enterprise Value', width: 'w-[110px] sm:w-[130px]', defaultVisible: true },
  { id: 'marginOfSafety', label: 'Margin of Safety', width: 'w-[96px] sm:w-[110px]', defaultVisible: true },
  { id: 'dcfImpliedGrowth', label: 'DCF Implied Growth', width: 'w-[96px] sm:w-[130px]', defaultVisible: true },
  { id: 'dcfVerdict', label: 'Model Verdict', width: 'w-[110px] sm:w-[130px]', defaultVisible: true },
  { id: 'assetTurnover', label: 'Asset Turnover', width: 'w-[84px] sm:w-[110px]', defaultVisible: true },
  { id: 'financialLeverage', label: 'Financial Leverage', width: 'w-[84px] sm:w-[110px]', defaultVisible: true },
  { id: 'roe', label: 'ROE %', width: 'w-[84px] sm:w-[110px]', defaultVisible: true },
  { id: 'roic', label: 'ROIC % (Latest)', width: 'w-[84px] sm:w-[110px]', defaultVisible: false },
  { id: 'roic10YAvg', label: 'ROIC 10Y Avg %', width: 'w-[110px] sm:w-[130px]', defaultVisible: false },
  { id: 'roic10YStd', label: 'ROIC Volatility %', width: 'w-[130px] sm:w-[150px]', defaultVisible: false },
  { id: 'roicStability', label: 'ROIC Stability Ratio', width: 'w-[120px] sm:w-[140px]', defaultVisible: false },
  { id: 'roicStabilityScore', label: 'ROIC Stability Score', width: 'w-[130px] sm:w-[150px]', defaultVisible: false },
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
    columns: ['watchlist', 'rank', 'name', 'marketCap', 'price', 'revenue', 'revenueGrowth10Y', 'dcfImpliedGrowth', 'dcfVerdict'],
  },
  'dupontRoe': {
    name: 'DuPont ROE Decomposition',
    columns: ['watchlist', 'rank', 'name', 'marketCap', 'revenue', 'netIncome', 'totalAssets', 'totalEquity', 'netProfitMargin', 'assetTurnover', 'financialLeverage', 'roe'],
  },
  // Placeholder: we'll expand with ROIC etc. later; safe existing columns for now
  'compounders': {
    name: 'Compounders (ROIC, FCF)',
    columns: ['watchlist', 'rank', 'name', 'marketCap', 'price', 'freeCashFlow', 'fcfMargin', 'fcfMarginMedian10Y', 'revenueGrowth10Y', 'roic', 'roic10YAvg', 'roic10YStd', 'roicStability', 'roicStabilityScore', 'debtToEquity', 'cashFlowToDebt', 'interestCoverage'],
  },
};

const LAYOUT_DESCRIPTIONS: Record<string, { title: string; description: string; link: string }> = {
  'returnOnRisk': {
    title: "Return on Risk Analysis",
    description: "This layout helps you evaluate investment efficiency. It compares the annualized returns of stocks against their maximum drawdowns (the largest drop from a peak). The AR/MDD Ratio is a key metric here: a higher ratio suggests a better return for the amount of risk taken. This is useful for finding resilient stocks that have performed well without extreme volatility.",
    link: "https://blog.findgreatstocks.com/return-on-risk-how-we-measure-it-at-findgreatstockscom"
  },
  'dcfValuation': {
    title: "DCF Valuation Analysis",
    description: "This layout focuses on a company's intrinsic value using a Discounted Cash Flow (DCF) model. It estimates the company's value today based on projections of its future free cash flow. The 'Margin of Safety' shows the difference between the estimated DCF value and the current market price, helping you identify potentially undervalued stocks.",
    link: "https://blog.findgreatstocks.com/dcf-valuation-analysis-how-we-estimate-intrinsic-value-at-findgreatstockscom"
  },
  'reverseDcf': {
    title: "Reverse DCF Analysis",
    description: "This layout uses a Reverse DCF model to determine the growth expectations priced into a stock. The 'DCF Implied Growth' shows the future free cash flow growth rate required to justify the stock's current market price. You can compare this to historical growth rates (like 10Y Revenue Growth) to gauge whether the market's expectations are realistic.",
    link: "https://blog.findgreatstocks.com/how-to-use-reverse-dcf-to-spot-undervalued-stocks-fast"
  },
  'dupontRoe': {
      title: "DuPont ROE Decomposition",
      description: "This layout breaks down Return on Equity (ROE) into its key components: Net Profit Margin (profitability), Asset Turnover (efficiency), and Financial Leverage (debt). It helps to understand the drivers behind a company's ROE.",
      link: "https://blog.findgreatstocks.com/dupont-roe-analysis-breaking-down-what-drives-profitability"
  }
};

const columnTooltips: Partial<Record<keyof Company | 'rank' | 'name' | 'watchlist' | 'none' | 'dcfVerdict', string>> = {
  watchlist: 'Add to your personal watchlist. Click the star to add or the lock to sign in.',
  rank: 'Rank based on the current sorting criteria.',
  name: 'Company name and stock ticker symbol.',
  marketCap: 'The total market value of a company\'s outstanding shares.',
  price: 'The latest closing price of the stock.',
  revenue: 'The total amount of income generated by the sale of goods or services.',
  netIncome: 'The company\'s total earnings or profit.',
  totalAssets: 'Total Assets from the latest balance sheet.',
  totalEquity: 'Shareholders\' Equity from the latest balance sheet.',
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
  arMddRatio3Year: '3Y Return/Risk = AR (annualized return) ÷ MDD (max drawdown). Higher is better.',
  arMddRatio5Year: '5Y Return/Risk = AR (annualized return) ÷ MDD (max drawdown). Higher is better.',
  arMddRatio10Year: '10Y Return/Risk = AR (annualized return) ÷ MDD (max drawdown). Higher is better.',
  dcfEnterpriseValue: 'The estimated total value of the company based on projected future free cash flows, discounted to their present value.',
  marginOfSafety: 'The percentage difference between the DCF Enterprise Value and the current Market Cap. A positive value suggests undervaluation.',
  dcfImpliedGrowth: 'The Free Cash Flow growth rate required to justify the current stock price. Compared visually to the 10Y Revenue Growth.',
  // Verdict: single-word valuation by DCF (Margin of Safety)
  dcfVerdict: 'Model verdict by DCF: Undervalued (green) or Overvalued (red).',
  assetTurnover: 'Measures how efficiently a company uses its assets to generate revenue. Calculated as Total Revenue / Total Assets.',
  financialLeverage: 'Measures the extent to which a company uses debt to finance its assets. Calculated as Total Assets / Total Equity.',
  roe: 'Return on Equity measures a company\'s profitability in relation to stockholders\' equity. Calculated as Net Income / Total Equity.',
  fcfMargin: 'Free Cash Flow Margin = Free Cash Flow ÷ Revenue. Shows how much cash is generated from each dollar of sales.',
  fcfMarginMedian10Y: 'Median FCF margin over the last 10 fiscal years (FCF ÷ Revenue each year). Higher median indicates consistently strong cash conversion.',
  roic: 'ROIC % (Latest) = Return on Invested Capital using the most recent fiscal year. Shows how efficiently a company generates returns on its invested capital.',
  roic10YAvg: 'Average ROIC % over the last 10 fiscal years (or available history). Higher means consistently strong capital efficiency.',
  roic10YStd: 'ROIC Volatility % = Standard deviation of annual ROIC over the last 10 years. Lower values mean more stable returns.',
  roicStability: 'ROIC Stability Ratio = ROIC 10Y Average ÷ ROIC Volatility. Higher indicates strong returns with low variability.',
  roicStabilityScore: 'ROIC Stability Score = min(100, ROIC Stability Ratio × 30). Green ≥70, Yellow 30-69, Red <30.',
  debtToEquity: 'Debt-to-Equity Ratio = Total Debt ÷ Total Equity. Measures a company\'s financial leverage. Lower is generally better (green <0.5, yellow 0.5-1.0, red >1.0).',
  interestCoverage: 'Interest Coverage Ratio = EBIT ÷ Interest Expense. Measures a company\'s ability to pay interest on its debt. Higher is better (green ≥5, yellow 2-5, red <2).',
  cashFlowToDebt: 'Cash Flow to Debt Ratio = Operating Cash Flow ÷ Total Debt. Measures a company\'s ability to pay off its debt with operating cash flow. Higher is better (green ≥0.5, yellow 0.2-0.5, red <0.2).',
};


interface CompanyTableProps {
  searchQuery: string;
  dataset:
    | 'sp500' | 'nasdaq100' | 'dowjones' | 'watchlist'
    | 'ftse100' | 'spmid400' | 'tsx60' | 'asx200' | 'dax40' | 'cac40'
    | 'ibex35' | 'nikkei225' | 'hangseng' | 'nifty50' | 'ibovespa';
  activeTab:
    | 'sp500' | 'nasdaq100' | 'dowjones' | 'watchlist'
    | 'ftse100' | 'spmid400' | 'tsx60' | 'asx200' | 'dax40' | 'cac40'
    | 'ibex35' | 'nikkei225' | 'hangseng' | 'nifty50' | 'ibovespa';
  watchlistId?: number;
}

export function CompanyTable({ searchQuery, dataset, activeTab, watchlistId }: CompanyTableProps) {
  // Log watchlistId changes for debugging
  useEffect(() => {
    if (dataset === 'watchlist') {
      console.log('[CompanyTable] watchlistId prop changed:', { watchlistId, dataset, activeTab });
    }
  }, [watchlistId, dataset, activeTab]);
  
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('none'); // Default to 'none' for placeholder
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tableScrollRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLTableElement>(null);
  // Store current watchlistId in ref to avoid closure issues
  const watchlistIdRef = React.useRef<number | undefined>(watchlistId);
  useEffect(() => {
    watchlistIdRef.current = watchlistId;
  }, [watchlistId]);
  const [limit] = useState(50);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [watchlistPending, setWatchlistPending] = useState<Record<string, boolean>>({});
  const [watchOverrides, setWatchOverrides] = useState<Record<string, boolean>>({});
  const [didLoadPrefs, setDidLoadPrefs] = useState(false);
  const [watchlistDialogOpen, setWatchlistDialogOpen] = useState(false);
  const [selectedSymbolForWatchlist, setSelectedSymbolForWatchlist] = useState<string | null>(null);
  const [moveCompanyDialogOpen, setMoveCompanyDialogOpen] = useState(false);
  const [companyToMove, setCompanyToMove] = useState<{ symbol: string; watchlistId?: number; mode?: 'move' | 'copy' } | null>(null);
  const { user, session, loading: authLoading } = useAuth();
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isLoggedIn = !!user || !!session;
  const tier = (user?.subscriptionTier as any);
  const premiumAllow = useFlag('premium:allow'); // allow premium via feature flag allowlist
  const isPaidUser = (tier === 'paid' || tier === 'quarterly' || tier === 'annual' || tier === 'lifetime' || premiumAllow);
  // Layout access via flags (admin allowlist or rollout)
  const layoutAccess: Record<string, boolean> = {
    dcfValuation: useFlag('layout:dcf'),
    dupontRoe: useFlag('layout:dupont_roe'),
    returnOnRisk: useFlag('layout:return_on_risk'),
    reverseDcf: useFlag('layout:reverse_dcf'),
    compounders: useFlag('layout:compounders'),
  };
  const compoundersOn = layoutAccess.compounders;

  useEffect(() => {
    setSelectedLayout(null);
    setDidLoadPrefs(false);
  }, [dataset]);

  useEffect(() => {
    if (authLoading) return;
    if (selectedLayout) return;
    if (didLoadPrefs) return;

    const lockedColumns = [
      'maxDrawdown3Year', 'maxDrawdown5Year', 'maxDrawdown10Year',
      'arMddRatio3Year', 'arMddRatio5Year', 'arMddRatio10Year',
      'dcfEnterpriseValue', 'marginOfSafety', 'dcfImpliedGrowth',
            'assetTurnover', 'financialLeverage', 'roe', 'roic', 'roic10YAvg', 'roic10YStd', 'roicStability', 'roicStabilityScore', 'fcfMargin', 'fcfMarginMedian10Y', 'debtToEquity', 'interestCoverage', 'cashFlowToDebt', 'dcfVerdict'
    ];

    const defaultVisibility = ALL_COLUMNS.reduce((acc, col) => {
      const isLocked = !isPaidUser && dataset !== 'dowjones' && lockedColumns.includes(col.id as string);
      acc[col.id] = isLocked ? false : col.defaultVisible;
      return acc;
    }, {} as VisibilityState);

    // Ensure core fundamentals are visible by default
    for (const id of ['marketCap','price','revenue','netIncome','dividendYield','freeCashFlow'] as const) {
      (defaultVisibility as any)[id] = true;
    }

    setColumnVisibility(defaultVisibility);

    // Default sorting: Market Cap desc for S&P 500 and Nasdaq 100
    if (dataset === 'sp500' || dataset === 'nasdaq100') {
      setSortBy('marketCap');
      setSortOrder('desc');
    }
  }, [authLoading, isPaidUser, dataset, selectedLayout, didLoadPrefs]);

  // Load saved preferences (columns visibility, sort) from localStorage once per dataset
  useEffect(() => {
    if (authLoading || didLoadPrefs) return;
    try {
      const key = `fgs:prefs:${dataset}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const prefs = JSON.parse(raw || '{}') as {
          sortBy?: string;
          sortOrder?: 'asc' | 'desc';
          // selectedLayout intentionally ignored to avoid auto-showing layout description boxes
          // selectedLayout?: string | null;
          columnVisibility?: VisibilityState;
        };
        if (prefs.sortBy) setSortBy(prefs.sortBy);
        if (prefs.sortOrder) setSortOrder(prefs.sortOrder);
        // Do not restore selectedLayout automatically

        const lockedColumns = [
          'maxDrawdown3Year', 'maxDrawdown5Year', 'maxDrawdown10Year',
          'arMddRatio3Year', 'arMddRatio5Year', 'arMddRatio10Year',
          'dcfEnterpriseValue', 'marginOfSafety', 'dcfImpliedGrowth',
          'assetTurnover', 'financialLeverage', 'roe', 'roic', 'roic10YAvg', 'roic10YStd', 'roicStability', 'roicStabilityScore', 'fcfMargin', 'fcfMarginMedian10Y', 'dcfVerdict'
        ];
        const vis = { ...(prefs.columnVisibility || {}) } as VisibilityState;
        if (!isPaidUser && dataset !== 'dowjones') {
          for (const id of lockedColumns) {
            (vis as any)[id] = false;
          }
        }
        // Guard against broken prefs: always enable core fundamentals
        for (const id of ['marketCap','price','revenue','netIncome','dividendYield','freeCashFlow'] as const) {
          (vis as any)[id] = true;
        }
        if (Object.keys(vis).length) setColumnVisibility(vis);
      } else {
        // No prefs stored: enforce default Market Cap sorting for S&P 500 / Nasdaq 100
        if (dataset === 'sp500' || dataset === 'nasdaq100') {
          setSortBy('marketCap');
          setSortOrder('desc');
        }
      }
    } catch {}
    setDidLoadPrefs(true);
  }, [authLoading, isPaidUser, dataset, didLoadPrefs]);

  // Save preferences to localStorage on changes
  useEffect(() => {
    try {
      const key = `fgs:prefs:${dataset}`;
      const payload = {
        sortBy,
        sortOrder,
        selectedLayout,
        columnVisibility,
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {}
  }, [dataset, sortBy, sortOrder, selectedLayout, columnVisibility]);

  console.log('[Auth Debug] In CompanyTable:', {
    authLoading,
    user,
    isLoggedIn,
    isPaidUser,
    showUpgradeButton: !authLoading && !isPaidUser
  });

  const handleUpgradeClick = async ({ priceId, plan }: { priceId?: string; plan: 'annual' | 'quarterly' | 'lifetime' }) => {
    console.log(`[1/5] handleUpgradeClick triggered with priceId: ${priceId}`);

    if (!session) {
      // redirect unauthenticated users to login/signup flow
      window.location.href = '/login';
      return;
    }

    // priceId может подставиться на бэке по плану

    console.log("[2/5] Closing the upgrade modal.");
    setIsUpgradeModalOpen(false);
    try { (window as any).phCapture?.('upgrade_clicked', { plan }); } catch {}

    try {
      console.log("[3/5] Calling authFetch to create Stripe session...");
      const response = await authFetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId, plan }),
      }, session.access_token);

      console.log("[4/5] Received response from authFetch:", response);

      if (!response || !response.sessionId) {
        console.error("[FAIL] Invalid session data received from server:", response);
        throw new Error("Failed to create checkout session. Server response was invalid.");
      }

      try { (window as any).phCapture?.('checkout_started', { plan, priceId, sessionId: response.sessionId }); } catch {}

      // give PostHog a brief moment to flush before redirecting to Stripe
      await new Promise((res) => setTimeout(res, 300));

      const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      const stripe = await stripePromise;

      if (stripe) {
        console.log("[5/5] Redirecting to Stripe checkout...");
        const result = await stripe.redirectToCheckout({
            sessionId: response.sessionId,
        });

        if (result.error) {
          console.error('[FAIL] Stripe redirect error:', result.error);
          (toast as any) && toast({
            title: "Payment Error",
            description: result.error.message,
            variant: "destructive",
          });
          try { (window as any).phCapture?.('api_error', { area: 'checkout_redirect', message: result.error.message }); } catch {}
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
      try { (window as any).phCapture?.('api_error', { area: 'upgrade', message: (error as any)?.message }); } catch {}
    }
  };

  // Watchlist mutations (only fetch if authenticated)
  // Fetch ALL watchlist items for the user (not just current watchlist) to find watchlistId for any company
  const { data: watchlistData } = useQuery<Array<{ companySymbol: string; watchlistId?: number }>>({
    queryKey: ['/api/watchlist', 'all'],
    queryFn: () => {
      // Fetch all watchlist items from all watchlists to get watchlistId for any company
      return authFetch('/api/watchlist?all=true');
    },
    enabled: !!isLoggedIn,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const { mutate: addToWatchlist } = useMutation({
    mutationFn: ({ companySymbol, watchlistId }: { companySymbol: string; watchlistId?: number }) => authFetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companySymbol, watchlistId }),
    }),
    onMutate: async ({ companySymbol }: { companySymbol: string; watchlistId?: number }) => {
      setWatchlistPending(prev => ({ ...prev, [companySymbol]: true }));
      setWatchOverrides(prev => ({ ...prev, [companySymbol]: true }));
      try { (window as any).phCapture?.('watchlist_add', { symbol: companySymbol, dataset }); } catch {}
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
    onError: (_err, { companySymbol }, ctx) => {
      // Rollback on error
      if (ctx?.prevList) queryClient.setQueryData(['/api/watchlist'], ctx.prevList);
      if (ctx?.prevCompanies) queryClient.setQueryData([apiEndpoint, page, sortBy, sortOrder, searchQuery], ctx.prevCompanies);
      setWatchOverrides(prev => ({ ...prev, [companySymbol]: false }));
      toast({ title: "Error", description: `Failed to add ${companySymbol} to watchlist.`, variant: "destructive" });
      try { (window as any).phCapture?.('api_error', { area: 'watchlist_add', symbol: companySymbol }); } catch {}
    },
    onSuccess: (_data, { companySymbol }) => {
      // Keep cache consistent
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/companies'] });
      toast({ title: "Success", description: `${companySymbol} added to watchlist.` });
    },
    onSettled: (_data, _err, { companySymbol }) => {
      if (companySymbol) setWatchlistPending(prev => ({ ...prev, [companySymbol]: false }));
    }
  });

  const { mutate: removeFromWatchlist } = useMutation({
    mutationFn: (companySymbol: string) => authFetch(`/api/watchlist/${companySymbol}`, { method: 'DELETE' }),
    onMutate: async (companySymbol: string) => {
      setWatchlistPending(prev => ({ ...prev, [companySymbol]: true }));
      setWatchOverrides(prev => ({ ...prev, [companySymbol]: false }));
      try { (window as any).phCapture?.('watchlist_remove', { symbol: companySymbol, dataset }); } catch {}
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
      try { (window as any).phCapture?.('api_error', { area: 'watchlist_remove', symbol: companySymbol }); } catch {}
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

  const handleWatchlistSelect = (watchlistId: number) => {
    if (selectedSymbolForWatchlist) {
      addToWatchlist({ companySymbol: selectedSymbolForWatchlist, watchlistId });
      setSelectedSymbolForWatchlist(null);
    }
  };

  const handleMoveCompany = (symbol: string) => {
    // Get current watchlist ID for this company
    const watchlistItem = watchlistData?.find((item: any) => item.companySymbol === symbol);
    setCompanyToMove({ symbol, watchlistId: watchlistItem?.watchlistId });
    setMoveCompanyDialogOpen(true);
  };

  const handleMoveToWatchlist = (toWatchlistId: number) => {
    if (!companyToMove) {
      toast({ title: "Error", description: "No company selected", variant: "destructive" });
      return;
    }
    // Use current watchlistId if not set in companyToMove
    const fromWatchlistId = companyToMove.watchlistId || watchlistId;
    if (!fromWatchlistId) {
      toast({ title: "Error", description: "Cannot determine source watchlist", variant: "destructive" });
      return;
    }
    console.log('Moving company:', { symbol: companyToMove.symbol, fromWatchlistId, toWatchlistId });
    authFetch('/api/watchlist/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companySymbol: companyToMove.symbol,
        fromWatchlistId,
        toWatchlistId,
      }),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watchlists'] });
      toast({ title: "Success", description: "Company moved" });
      setMoveCompanyDialogOpen(false);
      setCompanyToMove(null);
    }).catch((error: any) => {
      console.error('Move error:', error);
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to move company",
        variant: "destructive" 
      });
    });
  };

  const handleCopyToWatchlist = (toWatchlistId: number) => {
    if (!companyToMove) {
      toast({ title: "Error", description: "No company selected", variant: "destructive" });
      return;
    }
    // Use current watchlistId if not set in companyToMove
    const fromWatchlistId = companyToMove.watchlistId || watchlistId;
    if (!fromWatchlistId) {
      toast({ title: "Error", description: "Cannot determine source watchlist", variant: "destructive" });
      return;
    }
    console.log('Copying company:', { symbol: companyToMove.symbol, fromWatchlistId, toWatchlistId });
    authFetch('/api/watchlist/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companySymbol: companyToMove.symbol,
        fromWatchlistId,
        toWatchlistId,
      }),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/companies'] });
      toast({ title: "Success", description: "Company copied" });
      setMoveCompanyDialogOpen(false);
      setCompanyToMove(null);
    }).catch((error: any) => {
      console.error('Copy error:', error);
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to copy company",
        variant: "destructive" 
      });
    });
  };

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
      // For premium users, show watchlist selection dialog
      // For now, allow all authenticated users to use multiple watchlists
      // TODO: Restrict to premium users later if needed
      if (isPaidUser) {
        setSelectedSymbolForWatchlist(symbol);
        setWatchlistDialogOpen(true);
      } else {
        // For free users, add to default watchlist
        addToWatchlist({ companySymbol: symbol });
      }
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
    case 'watchlist':
      apiEndpoint = '/api/watchlist/companies';
      break;
    case 'ftse100':
      apiEndpoint = '/api/ftse100';
      break;
    default:
      apiEndpoint = '/api/companies';
  }

  const { data, isLoading, error } = useQuery<any>({
    queryKey: [apiEndpoint, page, sortBy, sortOrder, searchQuery, watchlistId],
    queryFn: async ({ queryKey }) => {
      const [url, page, currentSortBy, sortOrder, search, wlId] = queryKey as [
        string,
        number,
        string,
        string,
        string,
        number | undefined,
      ];

      const isDerived = currentSortBy === 'roicStability' || currentSortBy === 'roicStabilityScore' || currentSortBy === 'fcfMargin';
      const params = new URLSearchParams({
        offset: String(isDerived ? 0 : (page * limit)),
        // fetch all to sort client-side when derived sorting is requested
        limit: String(isDerived ? 5000 : limit),
      });

      // Only add server-side sorting if not a derived column
      if (currentSortBy && currentSortBy !== 'none' && !isDerived) {
        params.append("sortBy", currentSortBy);
        params.append("sortOrder", sortOrder);
      }

      if (search) {
        params.append("search", search);
      }

      params.append("_", new Date().getTime().toString());

      // Add watchlistId to params if provided
      if (wlId && url.startsWith('/api/watchlist/companies')) {
        params.append('watchlistId', String(wlId));
      }

      const qs = params.toString();
      // Watchlist endpoints требуют авторизации — используем authFetch
      if (url.startsWith('/api/watchlist')) {
        if (!session?.access_token) throw new Error('Unauthorized');
        // Use the proper endpoint with watchlistId
        if (url === '/api/watchlist/companies') {
          const wlRes = await authFetch(`${url}?${qs}`, undefined, session.access_token);
          return wlRes;
        }
        // Абсолютно независим от бэкенда: строим список из /api/watchlist + /api/companies-all и сортируем/пагинируем на клиенте
        const wlArr = await authFetch('/api/watchlist', undefined, session.access_token);
        const wlSymbols: string[] = Array.isArray(wlArr) ? wlArr.map((i: any) => i.companySymbol).filter(Boolean) : [];
        const allRes = await fetch(`/api/companies-all?limit=1000&_=${Date.now()}`, { cache: 'no-store' });
        if (!allRes.ok) throw new Error('Failed to fetch companies-all');
        const allJson = await allRes.json();
        const allBySym = new Map((allJson?.companies || []).map((c: any) => [c.symbol, c]));
        let rows = wlSymbols.map(sym => allBySym.get(sym)).filter(Boolean).map((c: any) => {
          const avg = (c.roic10YAvg != null) ? Number(c.roic10YAvg) : (c.roic_10y_avg != null ? Number(c.roic_10y_avg) : null);
          const std = (c.roic10YStd != null) ? Number(c.roic10YStd) : (c.roic_10y_std != null ? Number(c.roic_10y_std) : null);
          const ratio = (avg != null && std != null && isFinite(std) && std > 0) ? (avg / std) : null;
          const score = (ratio != null) ? Math.min(100, Math.max(0, ratio * 30)) : null;
          const revenue = c.revenue != null ? Number(c.revenue) : (c.revenue_ttm != null ? Number(c.revenue_ttm) : null);
          const fcf = c.freeCashFlow != null ? Number(c.freeCashFlow) : (c.free_cash_flow != null ? Number(c.free_cash_flow) : null);
          const fcfMargin = (revenue !== null && revenue !== 0 && fcf != null) ? (fcf / revenue) : null;
          const median = (c.fcf_margin_median_10y != null) ? Number(c.fcf_margin_median_10y) : (c.fcfMarginMedian10Y != null ? Number(c.fcfMarginMedian10Y) : null);
          return { ...c, roicStability: ratio, roicStabilityScore: score, fcfMargin, fcfMarginMedian10Y: median };
        });
        // Фильтрация по поиску (если задан)
        if (search) {
          const s = String(search).toLowerCase();
          rows = rows.filter((r: any) => String(r.name || '').toLowerCase().includes(s) || String(r.symbol || '').toLowerCase().includes(s));
        }
        // Клиентская сортировка по ключу currentSortBy
        const sortKey = currentSortBy && currentSortBy !== 'none' ? currentSortBy : 'marketCap';
        const asc = (String(sortOrder).toLowerCase() === 'asc');
        const getVal = (r: any) => r?.[sortKey];
        rows.sort((a: any, b: any) => {
          const va = getVal(a); const vb = getVal(b);
          const na = Number(va); const nb = Number(vb);
          const aNull = (va === null || va === undefined);
          const bNull = (vb === null || vb === undefined);
          if (aNull && bNull) return 0; if (aNull) return 1; if (bNull) return -1; // nulls last
          if (!Number.isNaN(na) && !Number.isNaN(nb)) return asc ? (na - nb) : (nb - na);
          return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
        const limitNum = Number(params.get('limit') || 50);
        const offsetNum = Number(params.get('offset') || 0);
        const pageRows = rows.slice(offsetNum, offsetNum + limitNum);
        return { companies: pageRows, total: rows.length, limit: limitNum, offset: offsetNum, hasMore: (offsetNum + limitNum) < rows.length };
      }
      // Client-side fallback for FTSE 100 while server endpoint may be unavailable
      if (url === '/api/ftse100') {
        // Build Supabase filter and pagination
        const offsetNum = Number(params.get('offset') || 0);
        const limitNum = Number(params.get('limit') || 50);
        let supa = supabase.from('ftse100_companies').select('*', { count: 'exact' });
        if (search) {
          supa = supa.or(`name.ilike.%${search}%,symbol.ilike.%${search}%`);
        }
        const { data: rows, error: err } = await supabase
          .from('ftse100_companies')
          .select('*')
          .range(offsetNum, offsetNum + limitNum - 1)
          .or(search ? `name.ilike.%${search}%,symbol.ilike.%${search}%` : undefined as any);
        if (err) throw err;
        const mapRow = (row: any) => ({
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
          totalEquity: row.total_equity,
          roe: row.roe,
          roic: row.roic,
          roic10YAvg: row.roic_10y_avg,
          roic10YStd: row.roic_10y_std,
          fcfMarginMedian10Y: row.fcf_margin_median_10y,
          assetTurnover: row.asset_turnover,
          financialLeverage: row.financial_leverage,
        });
        const companies = (rows || []).map(mapRow).map((c) => {
          const avg = c.roic10YAvg != null ? Number(c.roic10YAvg) : null;
          const std = c.roic10YStd != null ? Number(c.roic10YStd) : null;
          const ratio = (avg !== null && std !== null && isFinite(std) && std > 0) ? (avg / std) : null;
          const score = (ratio != null) ? Math.min(100, Math.max(0, ratio * 30)) : null;
          const revenue = c.revenue != null ? Number(c.revenue) : null;
          const fcf = c.freeCashFlow != null ? Number(c.freeCashFlow) : null;
          const fcfMargin = (revenue !== null && revenue !== 0 && fcf != null) ? (fcf / revenue) : null;
          const median = c.fcfMarginMedian10Y != null ? Number(c.fcfMarginMedian10Y) : null;
          return { ...c, roicStability: ratio, roicStabilityScore: score, fcfMargin, fcfMarginMedian10Y: median };
        });
        // Client-side sort, same as below
        if (currentSortBy && currentSortBy !== 'none') {
          const asc = (String(sortOrder).toLowerCase() === 'asc');
          const toNum = (v: any) => {
            if (v === null || v === undefined) return Number.NEGATIVE_INFINITY;
            if (typeof v === 'number') return v;
            const n = parseFloat(String(v).replace(/[%,$\s]/g, ''));
            return Number.isNaN(n) ? Number.NEGATIVE_INFINITY : n;
          };
          companies.sort((a: any, b: any) => {
            const na = toNum((a as any)[currentSortBy]);
            const nb = toNum((b as any)[currentSortBy]);
            if (na === nb) return 0;
            return asc ? (na - nb) : (nb - na);
          });
        }
        const hasMore = (rows || []).length === limitNum; // optimistic
        const total = offsetNum + (rows?.length || 0) + (hasMore ? 1 : 0);
        return { companies, total, limit: limitNum, offset: offsetNum, hasMore };
      }
      const response = await fetch(`${url}?${qs}`, { cache: 'no-store' });
      if (!response.ok) { try { (window as any).phCapture?.('api_error', { endpoint: url, status: response.status, dataset }); } catch {}; throw new Error("Failed to fetch companies"); }
      const json = await response.json();

      // Enrich missing Total Assets / Total Equity directly from Supabase index tables (client-side fallback)
      try {
        const rows = Array.isArray(json?.companies) ? json.companies : [];
        const symbols: string[] = rows.map((r: any) => r?.symbol).filter(Boolean);
        if (symbols.length) {
          const tableByDataset: Record<string, string> = {
            sp500: 'sp500_companies',
            nasdaq100: 'nasdaq100_companies',
            dowjones: 'dow_jones_companies',
          };
          const tableName = tableByDataset[dataset] || 'companies';
          const { data: supaRows, error: supaErr } = await supabase
            .from(tableName)
            .select('symbol, total_assets, total_equity')
            .in('symbol', symbols);
          if (!supaErr && Array.isArray(supaRows)) {
            const map = new Map<string, any>();
            for (const r of supaRows) {
              if (r?.symbol) map.set(r.symbol, r);
            }
            for (const r of rows) {
              const m = map.get(r.symbol);
              if (!m) continue;
              if (r.totalAssets == null && m.total_assets != null) r.totalAssets = m.total_assets;
              if (r.totalEquity == null && m.total_equity != null) r.totalEquity = m.total_equity;
            }
          }
        }
      } catch {}
      try {
        // Derive runtime fields needed for client-side sorting (e.g., stability/score)
        if (json?.companies) {
          json.companies = json.companies.map((c: any) => {
            const avg = (c.roic10YAvg != null) ? Number(c.roic10YAvg) : (c.roic_10y_avg != null ? Number(c.roic_10y_avg) : null);
            const std = (c.roic10YStd != null) ? Number(c.roic10YStd) : (c.roic_10y_std != null ? Number(c.roic_10y_std) : null);
            const ratio = (avg != null && std != null && isFinite(std) && std > 0) ? (avg / std) : null;
            const score = (ratio != null) ? Math.min(100, Math.max(0, ratio * 30)) : null;
            const revenue = c.revenue != null ? Number(c.revenue) : (c.revenue_ttm != null ? Number(c.revenue_ttm) : null);
            const fcf = c.freeCashFlow != null ? Number(c.freeCashFlow) : (c.free_cash_flow != null ? Number(c.free_cash_flow) : null);
            const fcfMargin = (revenue !== null && revenue !== 0 && fcf != null) ? (fcf / revenue) : null;
            const median = (c.fcf_margin_median_10y != null) ? Number(c.fcf_margin_median_10y) : (c.fcfMarginMedian10Y != null ? Number(c.fcfMarginMedian10Y) : null);
            return { ...c, roicStability: ratio, roicStabilityScore: score, fcfMargin, fcfMarginMedian10Y: median };
          });
        }
        if (json?.companies && currentSortBy && currentSortBy !== 'none') {
          const rows = [...json.companies];
          const asc = (String(sortOrder).toLowerCase() === 'asc');
          rows.sort((a: any, b: any) => {
            const va = a?.[currentSortBy];
            const vb = b?.[currentSortBy];
            const aNull = (va === null || va === undefined);
            const bNull = (vb === null || vb === undefined);
            if (aNull && bNull) return 0;
            if (aNull) return 1; // nulls last
            if (bNull) return -1;
            const na = (typeof va === 'number') ? va : parseFloat(String(va).replace(/[%,$\s]/g, ''));
            const nb = (typeof vb === 'number') ? vb : parseFloat(String(vb).replace(/[%,$\s]/g, ''));
            if (!Number.isNaN(na) && !Number.isNaN(nb)) return asc ? (na - nb) : (nb - na);
            // fallback to string compare
            return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
          });
          json.companies = rows;
        }
      } catch {}
      return json;
    },
    // Тянуть всегда свежие данные после серверных обновлений
    refetchOnMount: 'always',
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Вместо keepPreviousData в v5: удерживаем предыдущие данные
    placeholderData: (prev: any) => prev,
    enabled: !(dataset === 'watchlist' && !session?.access_token),
  });

  const tableData = useMemo(() => {
    if (data?.companies) {
      const watchlistSymbols = new Set(watchlistData?.map((item) => item.companySymbol) || []);
      return data.companies.map((company: any) => {
        const override = watchOverrides[company.symbol];
        const explicit = (company as any).isWatched;
        const base = typeof explicit === 'boolean' ? explicit : watchlistSymbols.has(company.symbol);
        const isWatched = typeof override === 'boolean' ? override : base;
        const avg = (company.roic10YAvg != null) ? Number(company.roic10YAvg) : null;
        const std = (company.roic10YStd != null) ? Number(company.roic10YStd) : null;
        const ratio = (avg != null && std != null && isFinite(std) && std > 0) ? (avg / std) : null;
        const score = (ratio != null) ? Math.min(100, Math.max(0, ratio * 30)) : null;
        const revenue = company.revenue != null ? Number(company.revenue) : null;
        const fcf = company.freeCashFlow != null ? Number(company.freeCashFlow) : null;
        const fcfMargin = (revenue !== null && revenue !== 0 && fcf != null) ? (fcf / revenue) : null;
        const fcfMarginMedian10Y = (company as any).fcfMarginMedian10Y ?? (company as any).fcf_margin_median_10y ?? null;
        return { ...company, isWatched, roicStability: ratio, roicStabilityScore: score, fcfMargin, fcfMarginMedian10Y } as any;
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
              const isWatchlistPage = dataset === 'watchlist';
              // On watchlist page, all companies are in watchlist, so isWatched should be true
              const isWatched = isWatchlistPage ? true : (row.isWatched || false);
              cellContent = (
                <div className="flex items-center gap-1">
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
                            if (isLoggedIn && !isWatchlistPage) {
                              handleWatchlistToggle(row.symbol, isWatched);
                            }
                          }}
                          disabled={!!watchlistPending[row.symbol] || isWatchlistPage}
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
                          {isWatchlistPage 
                            ? 'Use menu to move or copy'
                            : isLoggedIn 
                              ? (isWatched ? 'Remove from watchlist' : 'Add to watchlist')
                              : 'Sign in to add to watchlist'
                          }
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {/* Always show menu on watchlist page */}
                  {dataset === 'watchlist' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Menu button clicked:', { 
                              symbol: row.symbol, 
                              isWatchlistPage, 
                              dataset,
                              isLoggedIn, 
                              watchlistId,
                              watchlistData: watchlistData?.length,
                              watchlistItem: watchlistData?.find((item: any) => item.companySymbol === row.symbol)
                            });
                          }}
                        >
                          <MoreVertical className="h-4 w-4 flex-shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Actions for {row.symbol}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {
                          // Find watchlist item - prefer current watchlist, then any watchlist
                          const watchlistItem = watchlistData?.find((item: any) => 
                            item.companySymbol === row.symbol && item.watchlistId === watchlistId
                          ) || watchlistData?.find((item: any) => item.companySymbol === row.symbol);
                          const currentWatchlistId = watchlistItem?.watchlistId || watchlistId;
                          console.log('Move clicked:', { symbol: row.symbol, watchlistItem, watchlistId, currentWatchlistId, watchlistData });
                          setCompanyToMove({ symbol: row.symbol, watchlistId: currentWatchlistId, mode: 'move' });
                          setMoveCompanyDialogOpen(true);
                        }}>
                          <Move className="h-4 w-4 mr-2" />
                          Move to another watchlist
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          // Find watchlist item - prefer current watchlist, then any watchlist
                          const watchlistItem = watchlistData?.find((item: any) => 
                            item.companySymbol === row.symbol && item.watchlistId === watchlistId
                          ) || watchlistData?.find((item: any) => item.companySymbol === row.symbol);
                          const currentWatchlistId = watchlistItem?.watchlistId || watchlistId;
                          console.log('Copy clicked:', { symbol: row.symbol, watchlistItem, watchlistId, currentWatchlistId, watchlistData });
                          setCompanyToMove({ symbol: row.symbol, watchlistId: currentWatchlistId, mode: 'copy' });
                          setMoveCompanyDialogOpen(true);
                        }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy to another watchlist
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            // On watchlist page, we're viewing a specific watchlist
                            // CRITICAL: Use watchlistId from ref to get the latest value and avoid closure issues
                            // The ref is updated whenever watchlistId prop changes
                            const currentWatchlistId = watchlistIdRef.current;
                            
                            console.log('Remove clicked - current state:', { 
                              symbol: row.symbol, 
                              watchlistIdFromProps: watchlistId, // Current page's watchlist ID from props
                              currentWatchlistId,
                              dataset,
                              rowData: { symbol: row.symbol, watchlistId: (row as any).watchlistId },
                              allItemsForSymbol: watchlistData?.filter((item: any) => item.companySymbol === row.symbol)
                            });
                            
                            if (!currentWatchlistId || currentWatchlistId === null || currentWatchlistId === undefined) {
                              console.error('Cannot delete: no watchlistId in props', { watchlistId: currentWatchlistId, dataset, propsWatchlistId: watchlistId });
                              toast({ 
                                title: "Error", 
                                description: "Cannot determine watchlist to remove from. Please refresh the page.",
                                variant: "destructive" 
                              });
                              return;
                            }
                            
                            // Find which watchlist this company is actually in (from the current page's data)
                            const companyInCurrentWatchlist = watchlistData?.find((item: any) => 
                              item.companySymbol === row.symbol && item.watchlistId === currentWatchlistId
                            );
                            
                            console.log('Company in current watchlist check:', {
                              companyInCurrentWatchlist,
                              currentWatchlistId,
                              allItems: watchlistData?.filter((item: any) => item.companySymbol === row.symbol)
                            });
                            
                            // Verify the company is actually in the current watchlist
                            if (!companyInCurrentWatchlist) {
                              console.warn('Company not found in current watchlist:', {
                                symbol: row.symbol,
                                currentWatchlistId,
                                allItems: watchlistData?.filter((item: any) => item.companySymbol === row.symbol),
                                watchlistDataLength: watchlistData?.length
                              });
                              toast({ 
                                title: "Warning", 
                                description: `${row.symbol} is not in the current watchlist (ID: ${currentWatchlistId}). Cannot remove.`,
                                variant: "destructive" 
                              });
                              return;
                            }
                            
                            // Delete from the CURRENT watchlist (the one we're viewing)
                            const deleteUrl = `/api/watchlist/${encodeURIComponent(row.symbol)}?watchlistId=${currentWatchlistId}`;
                            console.log('Deleting from URL:', deleteUrl, 'Current watchlist ID from props:', currentWatchlistId, 'Props watchlistId:', watchlistId);
                            
                            authFetch(deleteUrl, { 
                              method: 'DELETE' 
                            }).then((response) => {
                              console.log('Delete success:', response, 'from watchlist:', currentWatchlistId);
                              // Invalidate all watchlist-related queries to ensure data consistency
                              // This ensures that the company is removed from the current watchlist
                              // but remains in other watchlists if it exists there
                              queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
                              queryClient.invalidateQueries({ queryKey: ['/api/watchlist', 'all'] });
                              // Invalidate the specific watchlist companies query with all possible parameters
                              queryClient.invalidateQueries({ 
                                predicate: (query) => {
                                  const key = query.queryKey;
                                  return Array.isArray(key) && 
                                    (key[0] === '/api/watchlist/companies' || 
                                     (typeof key[0] === 'string' && key[0].includes('watchlist')));
                                }
                              });
                              toast({ title: "Success", description: `${row.symbol} removed from watchlist.` });
                            }).catch((error: any) => {
                              console.error('Delete error:', error);
                              toast({ 
                                title: "Error", 
                                description: error?.message || "Failed to remove company",
                                variant: "destructive" 
                              });
                            });
                          }}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove from watchlist
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
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
            case 'totalAssets':
              cellContent = <div className="font-mono">{row.totalAssets ? formatMarketCap(row.totalAssets) : <span className="text-muted-foreground">-</span>}</div>;
              break;
            case 'totalEquity':
              cellContent = <div className="font-mono">{row.totalEquity ? formatMarketCap(row.totalEquity) : <span className="text-muted-foreground">-</span>}</div>;
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
            case 'fcfMargin': {
              const margin = row.fcfMargin;
              if (margin == null || !isFinite(Number(margin))) {
                cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
              } else {
                const value = Number(margin);
                let cls = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                if (value >= 0.15) cls = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950";
                else if (value >= 0.05) cls = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                cellContent = <Badge variant="outline" className={`${cls} font-mono`}>{formatPercentageFromDecimal(value, true)}</Badge>;
              }
              break;
            }
            case 'fcfMarginMedian10Y': {
              const margin = row.fcfMarginMedian10Y;
              if (margin == null || !isFinite(Number(margin))) {
                cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
              } else {
                const value = Number(margin);
                let cls = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                if (value >= 0.15) cls = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950";
                else if (value >= 0.05) cls = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                cellContent = <Badge variant="outline" className={`${cls} font-mono`}>{formatPercentageFromDecimal(value, true)}</Badge>;
              }
              break;
            }
            case 'debtToEquity': {
              const ratio = row.debtToEquity;
              if (ratio == null || !isFinite(Number(ratio))) {
                cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
              } else {
                const value = Number(ratio);
                let cls = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                // Negative values are always red (misleading if shown as green)
                if (value < 0) {
                  cls = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                } else if (value < 0.5) {
                  cls = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950";
                } else if (value <= 1.0) {
                  cls = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                }
                cellContent = <Badge variant="outline" className={`${cls} font-mono`}>{value.toFixed(2)}</Badge>;
              }
              break;
            }
            case 'interestCoverage': {
              const coverage = row.interestCoverage;
              if (coverage == null || !isFinite(Number(coverage))) {
                cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
              } else {
                const value = Number(coverage);
                let cls = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                if (value >= 5) cls = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950";
                else if (value >= 2) cls = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                cellContent = <Badge variant="outline" className={`${cls} font-mono`}>{value.toFixed(2)}</Badge>;
              }
              break;
            }
            case 'cashFlowToDebt': {
              const ratio = row.cashFlowToDebt;
              if (ratio == null || !isFinite(Number(ratio))) {
                cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
              } else {
                const value = Number(ratio);
                let cls = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                if (value >= 0.5) cls = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950";
                else if (value >= 0.2) cls = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                cellContent = <Badge variant="outline" className={`${cls} font-mono`}>{value.toFixed(2)}</Badge>;
              }
              break;
            }
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
              cellContent = (row[colConfig.id] !== null && row[colConfig.id] !== undefined) ? (
                <Badge variant="outline" className={`font-mono ${parseFloat(row[colConfig.id] as string) >= 0 ? 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950' : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'}`}>{formatPercentage(row[colConfig.id] as string, true)}</Badge>
              ) : <span className="text-muted-foreground">-</span>;
              break;
            case 'maxDrawdown3Year':
            case 'maxDrawdown5Year':
            case 'maxDrawdown10Year':
              cellContent = (row[colConfig.id] !== null && row[colConfig.id] !== undefined) ? (
                <Badge variant="outline" className="font-mono text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950">-{formatPercentage(row[colConfig.id] as string, false, 2)}</Badge>
              ) : <span className="text-muted-foreground">-</span>;
              break;
            case 'arMddRatio3Year':
            case 'arMddRatio5Year':
            case 'arMddRatio10Year':
                cellContent = (row[colConfig.id] !== null && row[colConfig.id] !== undefined) ? (
                  <Badge variant="outline" className={`font-mono ${parseFloat(row[colConfig.id] as string) >= 0.5 ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950' : parseFloat(row[colConfig.id] as string) >= 0.2 ? 'text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950' : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'}`}>{formatNumber(row[colConfig.id] as string, 2)}</Badge>
                  ) : <span className="text-muted-foreground">-</span>;
                  break;
            case 'dcfEnterpriseValue':
              cellContent = <div className="font-mono">{(row.dcfEnterpriseValue !== null && row.dcfEnterpriseValue !== undefined) ? formatMarketCap(row.dcfEnterpriseValue) : <span className="text-muted-foreground">-</span>}</div>;
              break;
            case 'marginOfSafety':
              cellContent = (row.marginOfSafety !== null && row.marginOfSafety !== undefined) ? (
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
              const impliedGrowth = (row.dcfImpliedGrowth !== null && row.dcfImpliedGrowth !== undefined) ? parseFloat(row.dcfImpliedGrowth as string) : null;
              const revenueGrowth10Y = (row.revenueGrowth10Y !== null && row.revenueGrowth10Y !== undefined) ? parseFloat(row.revenueGrowth10Y as string) / 100 : null;
              let badgeClass = '';
              if (impliedGrowth !== null && revenueGrowth10Y !== null) {
                if (impliedGrowth < revenueGrowth10Y) {
                  badgeClass = 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950';
                } else {
                  badgeClass = 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950';
                }
              }
              cellContent = (row.dcfImpliedGrowth !== null && row.dcfImpliedGrowth !== undefined) ? (
                <Badge variant="outline" className={`font-mono ${badgeClass}`}>
                  {formatPercentageFromDecimal(row.dcfImpliedGrowth, false)}
                </Badge>
              ) : <span className="text-muted-foreground">-</span>;
              break;
            case 'dcfVerdict': {
              const impliedRaw = (row as any).dcfImpliedGrowth; // decimal (e.g., 0.12)
              const rev10yRaw = (row as any).revenueGrowth10Y; // percent (e.g., 15)
              const implied = impliedRaw !== null && impliedRaw !== undefined ? Number(impliedRaw) : null;
              const rev10y = rev10yRaw !== null && rev10yRaw !== undefined ? Number(rev10yRaw) / 100 : null;
              if (implied === null || rev10y === null || Number.isNaN(implied) || Number.isNaN(rev10y)) {
                cellContent = <span className="text-muted-foreground">N/A</span>;
                break;
              }
              const isUndervalued = implied < rev10y; // market implies lower growth than historical
              cellContent = (
                <Badge
                  variant="outline"
                  className={`font-medium ${isUndervalued
                    ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950'
                    : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'
                  }`}
                >
                  {isUndervalued ? 'Undervalued' : 'Overvalued'}
                </Badge>
              );
              break;
            }
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
            case 'roic':
                const roicValue = row.roic as number | null;
                if (roicValue === null || roicValue === undefined) {
                  cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
                } else {
                  const roicPct = roicValue * 100;
                  let roicBadgeClass = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                  if (roicPct > 15) {
                    roicBadgeClass = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950";
                  } else if (roicPct >= 5) {
                    roicBadgeClass = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                  }
                  cellContent = <Badge variant="outline" className={`${roicBadgeClass} font-mono`}>{formatPercentage(roicPct, true, 1)}</Badge>;
                }
                break;
            case 'roic10YAvg':
                const roic10 = row.roic10YAvg as number | null;
                if (roic10 === null || roic10 === undefined) {
                  cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
                } else {
                  const roic10Pct = Number(roic10) * 100;
                  let avgClass = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                  if (roic10Pct > 15) {
                    avgClass = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950";
                  } else if (roic10Pct >= 5) {
                    avgClass = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                  }
                  cellContent = <Badge variant="outline" className={`${avgClass} font-mono`}>{formatPercentage(roic10Pct, true, 1)}</Badge>;
                }
                break;
            case 'roic10YStd':
                const roicStd = row.roic10YStd as number | null;
                if (roicStd === null || roicStd === undefined) {
                  cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
                } else {
                  const roicStdPct = Number(roicStd) * 100;
                  // Ниже — чем меньше волатильность, тем лучше (зелёный)
                  let stdClass = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950";
                  if (roicStdPct > 15) {
                    stdClass = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                  } else if (roicStdPct > 8) {
                    stdClass = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                  }
                  cellContent = <Badge variant="outline" className={`${stdClass} font-mono`}>{formatPercentage(roicStdPct, true, 1)}</Badge>;
                }
                break;
            case 'roicStability': {
                const avg = row.roic10YAvg as number | null;
                const std = row.roic10YStd as number | null;
                if (avg == null || std == null || !isFinite(Number(std)) || Number(std) <= 0) {
                  cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
                } else {
                  const ratio = Number(avg) / Number(std);
                  let cls = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                  if (ratio > 2) cls = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950";
                  else if (ratio >= 1) cls = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                  cellContent = <Badge variant="outline" className={`${cls} font-mono`}>{formatNumber(ratio, 2)}</Badge>;
                }
                break;
            }
            case 'roicStabilityScore': {
                const avg = row.roic10YAvg as number | null;
                const std = row.roic10YStd as number | null;
                if (avg == null || std == null || !isFinite(Number(std)) || Number(std) <= 0) {
                  cellContent = <Badge variant="outline" className="font-mono text-muted-foreground">N/A</Badge>;
                } else {
                  const ratio = Number(avg) / Number(std);
                  const score = Math.min(100, Math.max(0, ratio * 30));
                  let cls = "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950";
                  if (score >= 70) cls = "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950";
                  else if (score >= 30) cls = "text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950";
                  cellContent = <Badge variant="outline" className={`${cls} font-mono`}>{formatNumber(score, 0)}</Badge>;
                }
                break;
            }
            default:
                cellContent = <span className="text-muted-foreground">-</span>;
              break;
          }
          return cellContent;
        },
        sortingFn: (rowA, rowB, colId) => {
          const numericCols = new Set([
            'roic', 'roic10YAvg', 'roic10YStd', 'roicStability', 'roicStabilityScore', 'fcfMargin', 'fcfMarginMedian10Y',
            'marketCap','price','peRatio','priceToSalesRatio','dividendYield',
            'return3Year','return5Year','return10Year','maxDrawdown3Year','maxDrawdown5Year','maxDrawdown10Year',
            'arMddRatio3Year','arMddRatio5Year','arMddRatio10Year','dcfEnterpriseValue','marginOfSafety','dcfImpliedGrowth'
          ]);
          const a = rowA.getValue(colId) as any;
          const b = rowB.getValue(colId) as any;
          if (!numericCols.has(colId)) {
            const sa = String(a ?? '');
            const sb = String(b ?? '');
            return sa.localeCompare(sb);
          }
          const toNum = (v: any) => {
            if (v === null || v === undefined) return Number.NEGATIVE_INFINITY;
            if (typeof v === 'number') return v;
            const n = parseFloat(String(v).replace(/[%,$\s]/g, ''));
            return Number.isNaN(n) ? Number.NEGATIVE_INFINITY : n;
          };
          const va = toNum(a);
          const vb = toNum(b);
          if (va === vb) return 0;
          return va < vb ? -1 : 1;
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
          const nextId = newSorting[0].id;
          const nextDesc = newSorting[0].desc;
          setSortBy(nextId);
          setSortOrder(nextDesc ? 'desc' : 'asc');
          setPage(0);
          try { (window as any).phCapture?.('table_sort_changed', { sortBy: nextId, sortOrder: nextDesc ? 'desc' : 'asc', dataset }); } catch {}
        } else {
          setSortBy('none');
        }
      } else {
        const newSorting = updater;
        if (newSorting.length > 0) {
          const nextId = newSorting[0].id;
          const nextDesc = newSorting[0].desc;
          setSortBy(nextId);
          setSortOrder(nextDesc ? 'desc' : 'asc');
          setPage(0);
          try { (window as any).phCapture?.('table_sort_changed', { sortBy: nextId, sortOrder: nextDesc ? 'desc' : 'asc', dataset }); } catch {}
        } else {
          setSortBy('none');
        }
      }
    },
    onColumnVisibilityChange: (vis) => {
      setColumnVisibility(vis);
      try {
        const selected = Object.keys(vis as any).filter(k => (vis as any)[k]);
        (window as any).phCapture?.('visible_columns_changed', { dataset, columnsCount: selected.length, selectedColumns: selected });
      } catch {}
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.symbol, // стабильный идентификатор строки для предотвращения мигания при пересортировке
    manualPagination: true,
    pageCount: data?.total ? Math.ceil(data.total / limit) : -1,
    onRowSelectionChange: setRowSelection,
    manualSorting: true,
  });

  // Fire once when FTSE 100 data successfully loaded
  const ftseBootedRef = React.useRef(false);
  useEffect(() => {
    if (dataset === 'ftse100' && !isLoading && data?.companies && !ftseBootedRef.current) {
      ftseBootedRef.current = true;
      try { (window as any).phCapture?.('ftse_loaded', { source: 'supabase_fallback' }); } catch {}
    }
  }, [dataset, isLoading, data]);

  const handleSort = (column: string) => {
    const numericColumns = new Set([
      'arMddRatio3Year','arMddRatio5Year','arMddRatio10Year',
      'return3Year','return5Year','return10Year',
      'maxDrawdown3Year','maxDrawdown5Year','maxDrawdown10Year',
      'price','marketCap','peRatio','priceToSalesRatio','dividendYield','fcfMargin','fcfMarginMedian10Y','roic','roic10YAvg','roic10YStd','roicStability','roicStabilityScore'
    ]);
    let nextOrder: 'asc' | 'desc' = 'asc';
    if (sortBy === column) {
      nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      nextOrder = numericColumns.has(column) ? 'desc' : 'asc';
    }
    setSortBy(column);
    setSortOrder(nextOrder);
    setPage(0);
    try { (window as any).phCapture?.('table_sort_changed', { sortBy: column, sortOrder: nextOrder, dataset }); } catch {}
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ChevronUp className="h-4 w-4 opacity-30" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const isReverseDcfMobile = selectedLayout === 'reverseDcf' && isMobile;

  const getWidthClass = (id: string): string => {
    // На мобильных даём auto‑ширины (адаптивно), оставив минимальную ширину только для name
    if (isMobile) {
      return id === 'name' ? 'min-w-[140px]' : '';
    }
    return (ALL_COLUMNS.find(c => c.id === id as any)?.width) || '';
  };

  // Sticky left columns to keep important context visible during horizontal scroll
  const getStickyHeaderClass = (id: string): string => {
    switch (id) {
      case 'watchlist':
        return 'sm:sticky sm:left-0 sm:z-50 bg-white dark:bg-zinc-900';
      case 'rank':
        return 'sm:sticky sm:left-[50px] sm:z-50 bg-white dark:bg-zinc-900';
      case 'name':
        // leave a subtle grey divider to the right of the Company Name column
        return 'sm:sticky sm:left-[80px] sm:z-40 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700';
      default:
        return '';
    }
  };
  const getStickyCellClass = (id: string): string => {
    switch (id) {
      case 'watchlist':
        return 'sm:sticky sm:left-0 sm:z-40 bg-white dark:bg-zinc-900';
      case 'rank':
        return 'sm:sticky sm:left-[50px] sm:z-40 bg-white dark:bg-zinc-900';
      case 'name':
        // match the header: subtle grey divider on the right
        return 'sm:sticky sm:left-[80px] sm:z-30 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700';
      default:
        return '';
    }
  };

  // Update scroll button states on mount, resize, and data changes
  useEffect(() => {
    const updateScrollButtons = () => {
      if (tableScrollRef.current) {
        const container = tableScrollRef.current;
        // Table component creates a div with "relative w-full overflow-auto" - find it
        const tableWrapper = container.querySelector('div.relative.w-full.overflow-auto') as HTMLElement;
        const scrollableElement = tableWrapper || container;
        const table = tableRef.current || container.querySelector('table');
        const { scrollLeft, scrollWidth, clientWidth } = scrollableElement;
        // Use offsetWidth to get the actual rendered width of the table
        const tableWidth = table ? (table as HTMLElement).offsetWidth : scrollWidth;
        const canScroll = tableWidth > clientWidth || scrollWidth > clientWidth;
        const maxScroll = Math.max(tableWidth, scrollWidth) - clientWidth;
        const newCanScrollLeft = canScroll && scrollLeft > 5;
        const newCanScrollRight = canScroll && scrollLeft < maxScroll - 5;
        console.log('Updating scroll buttons', { 
          scrollLeft, 
          scrollWidth, 
          clientWidth, 
          tableWidth,
          tableScrollWidth: table?.scrollWidth,
          tableOffsetWidth: table ? (table as HTMLElement).offsetWidth : null,
          canScroll, 
          maxScroll, 
          newCanScrollLeft, 
          newCanScrollRight,
          usingWrapper: !!tableWrapper,
          containerScrollWidth: container.scrollWidth,
          containerClientWidth: container.clientWidth
        });
        setCanScrollLeft(newCanScrollLeft);
        setCanScrollRight(newCanScrollRight);
      } else {
        console.log('tableScrollRef.current is null in updateScrollButtons');
      }
    };
    
    // Initial check with multiple delays to ensure DOM is ready
    const timeoutId1 = setTimeout(updateScrollButtons, 100);
    const timeoutId2 = setTimeout(updateScrollButtons, 500);
    const timeoutId3 = setTimeout(updateScrollButtons, 1000);
    
    const handleResize = () => {
      setTimeout(updateScrollButtons, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Use MutationObserver to detect when table content changes
    const observer = new MutationObserver(() => {
      setTimeout(updateScrollButtons, 100);
    });
    
    // Try to observe when ref becomes available
    const checkRef = setInterval(() => {
      if (tableScrollRef.current) {
        observer.observe(tableScrollRef.current, {
          childList: true,
          subtree: true,
          attributes: true,
        });
        clearInterval(checkRef);
      }
    }, 100);
    
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      clearInterval(checkRef);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [data, isLoading]);

  // Prefetch данных для соседних вкладок, чтобы переключение было мгновенным
  useEffect(() => {
    // Для watchlist пропускаем префетч (требуется авторизация и иной источник данных)
    if (dataset === 'watchlist') {
      return;
    }
    const isDerivedSort = sortBy === 'roicStability' || sortBy === 'roicStabilityScore' || sortBy === 'fcfMargin';
    // Для производных колонок пропускаем префетч, чтобы не кэшировать серверно отсортированные страницы
    if (isDerivedSort) {
      return;
    }
    const datasets: Array<{ key: CompanyTableProps['dataset']; endpoint: string }> = [
      { key: 'sp500', endpoint: '/api/sp500' },
      { key: 'nasdaq100', endpoint: '/api/nasdaq100' },
      { key: 'dowjones', endpoint: '/api/dowjones' },
      // Skip FTSE 100 prefetch to avoid 404s until backend endpoint is enabled
      // { key: 'ftse100', endpoint: '/api/ftse100' },
    ];
    // Prefetch для текущего датасета: следующие страницы (page+1, page+2)
    const current = datasets.find(d => d.key === dataset)!;
    const pagesToPrefetchCurrent = [page + 1, page + 2].filter(p => p >= 0);
    for (const p of pagesToPrefetchCurrent) {
      const params = new URLSearchParams({ offset: String(p * limit), limit: String(limit) });
      if (sortBy && sortBy !== 'none' && !isDerivedSort) { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
      if (searchQuery) params.append('search', searchQuery);
      const qk = [current.endpoint, p, sortBy, sortOrder, searchQuery] as const;
      queryClient.prefetchQuery({
        queryKey: qk as any,
        queryFn: async () => {
          const res = await fetch(`${current.endpoint}?${params.toString()}`, { cache: 'no-store' });
          if (!res.ok) throw new Error('Failed to prefetch companies');
          return res.json();
        },
        staleTime: 0,
      });
    }

    // Prefetch для соседних датасетов: первые 3 страницы (0..2)
    const others = datasets.filter(d => d.key !== dataset);
    for (const d of others) {
      for (const p of [0, 1, 2]) {
        const params = new URLSearchParams({ offset: String(p * limit), limit: String(limit) });
        if (sortBy && sortBy !== 'none' && !isDerivedSort) { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
        if (searchQuery) params.append('search', searchQuery);
        const qk = [d.endpoint, p, sortBy, sortOrder, searchQuery] as const;
        queryClient.prefetchQuery({
          queryKey: qk as any,
          queryFn: async () => {
            const res = await fetch(`${d.endpoint}?${params.toString()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to prefetch companies');
            return res.json();
          },
          staleTime: 0,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, sortBy, sortOrder, searchQuery]);


  // This effect is no longer needed with the correct react-table implementation
  // useEffect(() => {
  //   ...
  // }, [columnVisibility]);

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

  const showSkeletons = ((!data && isLoading) || authLoading);

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
                    'assetTurnover', 'financialLeverage', 'roe', 'roic', 'roic10YAvg', 'roic10YStd', 'roicStability', 'roicStabilityScore', 'fcfMargin', 'fcfMarginMedian10Y'
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

          <div className="w-full flex flex-wrap items-stretch sm:items-center gap-2 sm:gap-4 justify-start sm:justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto text-sm">
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
                        'maxDrawdown3Year', 'maxDrawdown5Year', 'maxDrawdown10Year',
                        'arMddRatio3Year', 'arMddRatio5Year', 'arMddRatio10Year',
                        'dcfEnterpriseValue', 'marginOfSafety', 'dcfImpliedGrowth',
                        'assetTurnover', 'financialLeverage', 'roe', 'roic', 'roic10YAvg', 'roic10YStd', 'roicStability', 'roicStabilityScore', 'fcfMargin', 'fcfMarginMedian10Y', 'dcfVerdict'
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
                <Button variant="outline" size="sm" className="w-full sm:w-auto text-sm">
                  <span className="flex items-center">
                    Choose Layout
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Table Layouts</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(PRESET_LAYOUTS).filter(([key]) => key !== 'compounders').map(([key, layout]) => {
                  const isPaidLayout = ['dcfValuation', 'dupontRoe', 'returnOnRisk', 'reverseDcf'].includes(key);
                  const isLocked = !isPaidUser && dataset !== 'dowjones' && isPaidLayout && !layoutAccess[key];
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
                        try { (window as any).phCapture?.('layout_selected', { layout: key, dataset }); } catch {}
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{layout.name}</span>
                        {isLocked && <Lock className="h-4 w-4 text-muted-foreground ml-2" />}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                {compoundersOn ? (
                  <DropdownMenuItem
                    onSelect={() => {
                      const layout = (PRESET_LAYOUTS as any)['compounders'];
                      const newVisibility = ALL_COLUMNS.reduce((acc, col) => {
                        if (['watchlist', 'rank', 'name'].includes(col.id)) {
                          acc[col.id] = true;
                        } else {
                          acc[col.id] = layout.columns.includes(col.id);
                        }
                        return acc;
                      }, {} as VisibilityState);
                      setColumnVisibility(newVisibility);
                      setSelectedLayout('compounders');
                      try { (window as any).phCapture?.('layout_selected', { layout: 'compounders', dataset }); } catch {}
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>Compounders (ROIC, FCF)</span>
                    </div>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    Compounders (Coming Soon)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {!authLoading && !isPaidUser && (
               <Button size="sm" onClick={() => { try { (window as any).phCapture?.('upgrade_clicked', { source: 'table_button' }); } catch {} setIsUpgradeModalOpen(true); }}>
                <Unlock className="mr-2 h-4 w-4" />
                Upgrade
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Watchlist requires auth */}
      {dataset === 'watchlist' && !isLoggedIn && (
        <Card className="p-4 bg-amber-50 border-amber-200 text-amber-900">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">Sign in to view and manage your Watchlist.</div>
            <Button asChild size="sm" variant="outline">
              <a href="/login">Login</a>
            </Button>
          </div>
        </Card>
      )}

      {/* Layout Description Box */}
      {selectedLayout && LAYOUT_DESCRIPTIONS[selectedLayout] && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 transition-all">
           <div className="flex justify-between items-start gap-4">
            <div>
              <h4 className="font-semibold text-blue-800 dark:text-blue-200">{LAYOUT_DESCRIPTIONS[selectedLayout].title}</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {LAYOUT_DESCRIPTIONS[selectedLayout].description}
              </p>
              {LAYOUT_DESCRIPTIONS[selectedLayout].link && (
                <a
                  className="inline-block mt-2 text-sm font-medium text-blue-800 underline underline-offset-2 hover:opacity-80"
                  href={LAYOUT_DESCRIPTIONS[selectedLayout].link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read the full guide
                </a>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => setSelectedLayout(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <div className="relative">
        {/* Scroll buttons - positioned above the table */}
        <div className="flex justify-end gap-1 mb-2 z-10 relative">
          <Button
            variant="outline"
            size="sm"
            className={`h-8 w-8 p-0 ${!canScrollLeft ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (tableScrollRef.current) {
                const container = tableScrollRef.current;
                // Table component creates a div with "relative w-full overflow-auto" - find it
                const tableWrapper = container.querySelector('div.relative.w-full.overflow-auto') as HTMLElement;
                const scrollableElement = tableWrapper || container;
                const scrollAmount = scrollableElement.clientWidth * 0.8;
                const currentScroll = scrollableElement.scrollLeft;
                const newScrollLeft = Math.max(0, currentScroll - scrollAmount);
                console.log('Scroll left clicked', { 
                  currentScroll,
                  newScrollLeft,
                  scrollAmount,
                  scrollWidth: scrollableElement.scrollWidth,
                  clientWidth: scrollableElement.clientWidth,
                  usingWrapper: !!tableWrapper,
                  containerScrollWidth: container.scrollWidth,
                  containerClientWidth: container.clientWidth
                });
                scrollableElement.scrollTo({ 
                  left: newScrollLeft, 
                  behavior: 'smooth' 
                });
              } else {
                console.error('tableScrollRef.current is null');
              }
            }}
            disabled={false}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`h-8 w-8 p-0 ${!canScrollRight ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (tableScrollRef.current) {
                const container = tableScrollRef.current;
                // Table component creates a div with "relative w-full overflow-auto" - find it
                const tableWrapper = container.querySelector('div.relative.w-full.overflow-auto') as HTMLElement;
                const scrollableElement = tableWrapper || container;
                const table = tableRef.current || container.querySelector('table');
                const tableWidth = table ? (table as HTMLElement).offsetWidth : scrollableElement.scrollWidth;
                const scrollAmount = scrollableElement.clientWidth * 0.8;
                const currentScroll = scrollableElement.scrollLeft;
                const maxScroll = Math.max(tableWidth, scrollableElement.scrollWidth) - scrollableElement.clientWidth;
                const newScrollLeft = Math.min(maxScroll, currentScroll + scrollAmount);
                console.log('Scroll right clicked', { 
                  currentScroll,
                  newScrollLeft,
                  maxScroll,
                  scrollAmount,
                  tableWidth,
                  tableOffsetWidth: table ? (table as HTMLElement).offsetWidth : null,
                  scrollWidth: scrollableElement.scrollWidth,
                  clientWidth: scrollableElement.clientWidth,
                  usingWrapper: !!tableWrapper,
                  containerScrollWidth: container.scrollWidth,
                  containerClientWidth: container.clientWidth
                });
                scrollableElement.scrollTo({ 
                  left: newScrollLeft, 
                  behavior: 'smooth' 
                });
              } else {
                console.error('tableScrollRef.current is null');
              }
            }}
            disabled={false}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Card>
          <div 
            ref={tableScrollRef}
            className="w-full overflow-x-auto -mx-4 px-4"
            style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
            onScroll={(e) => {
              const target = e.currentTarget;
              // Table component creates a div with "relative w-full overflow-auto" - find it
              const tableWrapper = target.querySelector('div.relative.w-full.overflow-auto') as HTMLElement;
              const scrollableElement = tableWrapper || target;
              const table = tableRef.current || target.querySelector('table');
              const tableWidth = table ? (table as HTMLElement).offsetWidth : scrollableElement.scrollWidth;
              const canScroll = tableWidth > scrollableElement.clientWidth || scrollableElement.scrollWidth > scrollableElement.clientWidth;
              const scrollLeft = scrollableElement.scrollLeft;
              const maxScroll = Math.max(tableWidth, scrollableElement.scrollWidth) - scrollableElement.clientWidth;
              setCanScrollLeft(canScroll && scrollLeft > 5);
              setCanScrollRight(canScroll && scrollLeft < maxScroll - 5);
            }}
          >
          <div className="w-full overflow-visible">
            <Table 
              ref={tableRef}
              className={`w-full ${isReverseDcfMobile ? 'min-w-[520px]' : 'min-w-[620px]'} sm:min-w-[1200px] ${isMobile ? 'table-auto' : 'table-fixed'} text-xs sm:text-sm [&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-1 sm:[&_th]:p-3 sm:[&_td]:p-3`}
            >
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id} className="bg-muted/50">
                  {headerGroup.headers.map(header => {
                    const hid = ((header.column.columnDef.meta as any)?.columnConfig.id) as string;
                    return (
                    <TableHead
                      key={header.id}
                        className={`text-right cursor-pointer hover:bg-muted/80 transition-colors ${ getWidthClass(hid) } ${ getStickyHeaderClass(hid) } ${
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
                    );
                  })}
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
                          (column.columnDef.meta as any)?.columnConfig.id === 'rank' ||
                          (column.columnDef.meta as any)?.columnConfig.id === 'watchlist' ||
                          (column.columnDef.meta as any)?.columnConfig.id === 'dcfVerdict'
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
                      onClick={() => { try { (window as any).phCapture?.('company_row_opened', { symbol: row.original.symbol, dataset }); } catch {} }}
                    >
                      {row.getVisibleCells().map(cell => {
                        const cid = (cell.column.columnDef.meta as any)?.columnConfig.id as string;
                        const alignClass =
                          cid === 'rank' || cid === 'watchlist' || cid === 'dcfVerdict'
                            ? 'text-center'
                            : cid === 'name'
                            ? ''
                            : 'text-right';
                        return (
                          <TableCell key={cell.id} className={`${alignClass} ${getStickyCellClass(cid)}`}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Mobile scroll-hint */}
      <div className="sm:hidden text-xs text-muted-foreground mt-2">Swipe horizontally to see more →</div>

      {/* Watchlist Manager Dialog */}
      <WatchlistManager
        open={watchlistDialogOpen}
        onOpenChange={setWatchlistDialogOpen}
        onSelectWatchlist={handleWatchlistSelect}
        companySymbol={selectedSymbolForWatchlist || undefined}
        mode="select"
      />

      {/* Move/Copy Company Dialog */}
      <WatchlistManager
        open={moveCompanyDialogOpen}
        onOpenChange={(open) => {
          setMoveCompanyDialogOpen(open);
          if (!open) setCompanyToMove(null);
        }}
        onSelectWatchlist={(toId) => {
          console.log('WatchlistManager onSelectWatchlist called:', { toId, companyToMove });
          if (companyToMove) {
            if (companyToMove.mode === 'copy') {
              handleCopyToWatchlist(toId);
            } else {
              handleMoveToWatchlist(toId);
            }
          } else {
            console.error('companyToMove is null when onSelectWatchlist called');
          }
        }}
        companySymbol={companyToMove?.symbol}
        currentWatchlistId={companyToMove?.watchlistId || watchlistId}
        mode="select"
      />

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