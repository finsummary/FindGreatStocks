import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, Star, Download, Search, Settings2, X, Lock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatMarketCap, formatPercentage, formatPrice, formatEarnings, formatNumber, formatPercentageFromDecimal } from "@/lib/format";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Company, Nasdaq100Company, Ftse100Company } from "@shared/schema";
import { authFetch } from "@/lib/authFetch";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import React from "react";
import { 
  useReactTable, 
  ColumnDef, 
  VisibilityState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import {
  CaretSortIcon,
  ChevronDownIcon,
  DotsHorizontalIcon,
} from "@radix-ui/react-icons"
import { LockOpen } from "lucide-react";
import { flexRender } from "@tanstack/react-table";

interface ColumnConfig {
  id: keyof Company | 'rank' | 'name' | 'watchlist' | 'none'; // 'none' for the placeholder
  label: string;
  width: string;
  defaultVisible: boolean;
}

const ALL_COLUMNS: ColumnConfig[] = [
  { id: 'watchlist', label: 'Watchlist', width: 'w-[50px]', defaultVisible: true },
  { id: 'rank', label: 'Rank', width: 'w-[30px]', defaultVisible: true },
  { id: 'name', label: 'Company Name', width: 'w-[200px]', defaultVisible: true },
  { id: 'marketCap', label: 'Market Cap', width: 'w-[110px]', defaultVisible: true },
  { id: 'price', label: 'Price', width: 'w-[80px]', defaultVisible: true },
  { id: 'revenue', label: 'Revenue', width: 'w-[110px]', defaultVisible: true },
  { id: 'netIncome', label: 'Earnings', width: 'w-[90px]', defaultVisible: true },
  { id: 'peRatio', label: 'P/E Ratio', width: 'w-[75px]', defaultVisible: false },
  { id: 'priceToSalesRatio', label: 'P/S Ratio', width: 'w-[75px]', defaultVisible: false },
  { id: 'dividendYield', label: 'Dividend Yield', width: 'w-[100px]', defaultVisible: false },
  { id: 'netProfitMargin', label: 'Net Profit Margin', width: 'w-[120px]', defaultVisible: false },
  { id: 'freeCashFlow', label: 'Free Cash Flow', width: 'w-[120px]', defaultVisible: false },
  { id: 'revenueGrowth3Y', label: 'Rev G 3Y', width: 'w-[90px]', defaultVisible: false },
  { id: 'revenueGrowth5Y', label: 'Rev G 5Y', width: 'w-[90px]', defaultVisible: false },
  { id: 'revenueGrowth10Y', label: 'Rev G 10Y', width: 'w-[90px]', defaultVisible: true },
  { id: 'return3Year', label: '3Y Return', width: 'w-[85px]', defaultVisible: false },
  { id: 'return5Year', label: '5Y Return', width: 'w-[85px]', defaultVisible: false },
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
  { id: 'assetTurnover', label: 'Asset Turnover', width: 'w-[110px]', defaultVisible: false },
  { id: 'financialLeverage', label: 'Financial Leverage', width: 'w-[110px]', defaultVisible: false },
  { id: 'roe', label: 'ROE %', width: 'w-[110px]', defaultVisible: false },
];

const PRESET_LAYOUTS = {
  'returnOnRisk': {
    name: 'Return on Risk (3, 5, 10 Years)',
    columns: ['watchlist', 'rank', 'name', 'marketCap', 'price', 'return10Y', 'maxDrawdown10Y', 'arMddRatio10Year', 'return5Y', 'maxDrawdown5Y', 'arMddRatio5Year', 'return3Y', 'maxDrawdown3Y', 'arMddRatio3Year'],
  },
  'dcfValuation': {
    name: 'DCF Valuation',
    columns: ['watchlist', 'rank', 'name', 'marketCap', 'price', 'revenue', 'revenueGrowth10Y', 'dcfEnterpriseValue', 'marginOfSafety', 'dcfImpliedGrowth'],
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
    description: "This layout focuses on a company's intrinsic value using a Discounted Cash Flow (DCF) model. It estimates the company's value today based on projections of its future free cash flow. The 'Margin of Safety' shows the difference between the estimated DCF value and the current market price, helping you identify potentially undervalued stocks. The 'DCF Implied Growth' shows the future growth rate required to justify the stock's current price. You can compare this to historical growth rates (like 10Y Revenue Growth) to gauge whether the market's expectations are realistic."
  },
  'dupontRoe': {
      title: "DuPont ROE Decomposition",
      description: "This layout breaks down Return on Equity (ROE) into its key components: Net Profit Margin (profitability), Asset Turnover (efficiency), and Financial Leverage (debt). It helps to understand the drivers behind a company's ROE."
  }
};

const columnTooltips: Partial<Record<keyof Company | 'rank' | 'name' | 'watchlist' | 'none', string>> = {
  watchlist: 'Add to your personal watchlist. Sign-in required.',
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
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(
      ALL_COLUMNS.reduce((acc, col) => {
        acc[col.id] = col.defaultVisible;
        return acc;
      }, {} as VisibilityState)
    )
  const [rowSelection, setRowSelection] = React.useState({})
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Simulate user state for now
  const isPaid = activeTab === 'dowjones';
  const isLoggedIn = true; // Assume user is logged in for watchlist feature


  let apiEndpoint;
  switch (dataset) {
    case 'sp500':
      apiEndpoint = '/api/companies';
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

  const { data, isLoading, error } = useQuery({
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

      const response = await fetch(`${url}?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }
      return response.json();
    },
  });

  // Watchlist mutations (only fetch if authenticated)
  const { data: watchlistData } = useQuery({
    queryKey: ['/api/watchlist'],
    queryFn: async () => {
      const response = await authFetch('/api/watchlist');
      if (!response.ok) throw new Error('Failed to fetch watchlist');
      return response.json();
    },
    enabled: !!user, // Only fetch watchlist if user is authenticated
  });

  const addToWatchlistMutation = useMutation({
    mutationFn: async (companySymbol: string) => {
      return await apiRequest('POST', '/api/watchlist', { companySymbol });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
    },
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (companySymbol: string) => {
      return await apiRequest('DELETE', `/api/watchlist/${companySymbol}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
    },
  });

  const isInWatchlist = (symbol: string): boolean => {
    return watchlistData?.some((item: any) => item.companySymbol === symbol) || false;
  };

  const handleWatchlistToggle = (symbol: string) => {
    if (!user) {
      // Prompt user to sign in for watchlist access
      toast({
        title: "Sign In Required",
        description: "Please sign in to add stocks to your personal watchlist",
        variant: "default",
      });
      return;
    }

    if (isInWatchlist(symbol)) {
      removeFromWatchlistMutation.mutate(symbol);
    } else {
      addToWatchlistMutation.mutate(symbol);
    }
  };

  const columns = React.useMemo<ColumnDef<Company>[]>(() => {
    return ALL_COLUMNS.map(colConfig => {
      const columnDef: ColumnDef<Company> = {
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
              cellContent = (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`p-1 h-auto transition-colors ${
                    isInWatchlist(row.symbol) 
                      ? 'text-yellow-500 hover:text-yellow-600' 
                      : 'text-muted-foreground hover:text-yellow-500'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWatchlistToggle(row.symbol);
                  }}
                  disabled={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
                >
                  <Star className={`h-4 w-4 ${isInWatchlist(row.symbol) ? 'fill-current' : ''}`} />
                </Button>
              );
              break;
            case 'rank':
              cellContent = <div className="font-medium">{(page * limit) + info.row.index + 1}</div>;
              break;
            case 'name':
              cellContent = (
                <div className="flex items-center gap-2">
                  <img 
                    src={row.logoUrl || `https://via.placeholder.com/32`}
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
              cellContent = <div className="font-mono">{row.freeCashFlow ? formatMarketCap(row.freeCashFlow) : <span className="text-muted-foreground">-</span>}</div>;
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
                    cellContent = <Badge variant="outline" className={`${roeBadgeClass} font-mono`}>{formatPercentageFromDecimal(roeValue, true, 1)}</Badge>;
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
  }, [page, limit, watchlistData, addToWatchlistMutation, removeFromWatchlistMutation]); // Dependencies for cell rendering logic

  const table = useReactTable({
    data: data?.companies || [],
    columns,
    state: {
      sorting: [
        {
          id: sortBy,
          desc: sortOrder === 'desc',
        },
      ],
      columnVisibility,
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
    onPaginationChange: (updater) => {
       if (typeof updater === 'function') {
        setPage(updater(table.getState().pagination.pageIndex));
      } else {
        setPage(updater.pageIndex);
      }
    },
    onRowSelectionChange: setRowSelection,
    manualSorting: true,
  });


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
                  const isLocked = !isPaid && lockedColumns.includes(col.id);

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

                      const isLocked = !isPaid && lockedColumns.includes(colConfig.id);

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
                  const isPaidLayout = key === 'dcfValuation' || key === 'dupontRoe' || key === 'returnOnRisk';
                  const isLocked = !isPaid && isPaidLayout;
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
            {!isPaid && (
              <Button>
                <LockOpen className="mr-2 h-4 w-4" />
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
                {isLoading ? (
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
                      onClick={() => console.log('Navigate to company:', row.original.symbol)}
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
    </div>
  );
}