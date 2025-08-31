import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, Star, Download, Search, Settings2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency, formatMarketCap, formatPercentage, formatPrice, formatEarnings, formatNumber } from "@/lib/format";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Company, Nasdaq100Company, Ftse100Company } from "@shared/schema";
import { authFetch } from "@/lib/authFetch";

interface ColumnConfig {
  id: keyof Company | 'rank' | 'name' | 'watchlist' | 'none'; // 'none' for the placeholder
  label: string;
  width: string;
  defaultVisible: boolean;
}

const ALL_COLUMNS: ColumnConfig[] = [
  { id: 'watchlist', label: 'Watchlist', width: 'w-[40px]', defaultVisible: true },
  { id: 'rank', label: 'Rank', width: 'w-[60px]', defaultVisible: true },
  { id: 'name', label: 'Company Name', width: 'w-[220px]', defaultVisible: true },
  { id: 'marketCap', label: 'Market Cap', width: 'w-[110px]', defaultVisible: true },
  { id: 'price', label: 'Price', width: 'w-[80px]', defaultVisible: true },
  { id: 'revenue', label: 'Revenue', width: 'w-[90px]', defaultVisible: true },
  { id: 'netIncome', label: 'Earnings', width: 'w-[90px]', defaultVisible: true },
  { id: 'peRatio', label: 'P/E Ratio', width: 'w-[75px]', defaultVisible: true },
  { id: 'priceToSalesRatio', label: 'P/S Ratio', width: 'w-[75px]', defaultVisible: true },
  { id: 'dividendYield', label: 'Dividend Yield', width: 'w-[100px]', defaultVisible: true },
  { id: 'netProfitMargin', label: 'Net Profit Margin', width: 'w-[120px]', defaultVisible: true },
  { id: 'freeCashFlow', label: 'Free Cash Flow', width: 'w-[120px]', defaultVisible: false },
  { id: 'revenueGrowth3Y', label: 'Rev G 3Y', width: 'w-[90px]', defaultVisible: false },
  { id: 'revenueGrowth5Y', label: 'Rev G 5Y', width: 'w-[90px]', defaultVisible: false },
  { id: 'revenueGrowth10Y', label: 'Rev G 10Y', width: 'w-[90px]', defaultVisible: false },
  { id: 'return3Year', label: '3Y Return', width: 'w-[85px]', defaultVisible: false },
  { id: 'return5Year', label: '5Y Return', width: 'w-[85px]', defaultVisible: false },
  { id: 'return10Year', label: '10Y Return', width: 'w-[85px]', defaultVisible: true },
  { id: 'maxDrawdown3Year', label: '3Y Max Drawdown', width: 'w-[120px]', defaultVisible: false },
  { id: 'maxDrawdown5Year', label: '5Y Max Drawdown', width: 'w-[120px]', defaultVisible: false },
  { id: 'maxDrawdown10Year', label: '10Y Max Drawdown', width: 'w-[120px]', defaultVisible: true },
  { id: 'arMddRatio3Year', label: '3Y AR/MDD Ratio', width: 'w-[120px]', defaultVisible: false },
  { id: 'arMddRatio5Year', label: '5Y AR/MDD Ratio', width: 'w-[120px]', defaultVisible: false },
  { id: 'arMddRatio10Year', label: '10Y AR/MDD Ratio', width: 'w-[120px]', defaultVisible: true },
];


interface CompanyTableProps {
  searchQuery: string;
  dataset: 'sp500' | 'nasdaq100' | 'ftse100' | 'dowjones';
}

export function CompanyTable({ searchQuery, dataset }: CompanyTableProps) {
  const [sortBy, setSortBy] = useState<string>('none'); // Default to 'none' for placeholder
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    ALL_COLUMNS.reduce((acc, col) => {
      acc[col.id] = col.defaultVisible;
      return acc;
    }, {} as Record<string, boolean>)
  );
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // This effect syncs the generic dynamic columns (e.g., 'return') with the specific time-period columns (e.g., 'return10Year')
    const newVisible: Record<string, boolean> = { ...visibleColumns };
    let hasChanged = false;

    ALL_COLUMNS.filter(c => c.id.includes('return') || c.id.includes('maxDrawdown') || c.id.includes('arMddRatio')).forEach(col => {
      const isGenericVisible = visibleColumns[col.id];
      ['3Year', '5Year', '10Year'].forEach(period => {
        const specificId = `${col.id}${period}`;
        const shouldBeVisible = (isGenericVisible && period === '10Year'); // Default to 10Y for dynamic columns
        if (newVisible[specificId] !== shouldBeVisible) {
          newVisible[specificId] = shouldBeVisible;
          hasChanged = true;
        }
      });
    });

    if (hasChanged) {
      setVisibleColumns(newVisible);
    }
    
    setSortBy(currentSortBy => {
        if (currentSortBy.includes('return')) {
            return `return${'10Year'}`;
        } else if (currentSortBy.includes('maxDrawdown')) {
            return `maxDrawdown${'10Year'}`;
        } else if (currentSortBy.includes('arMddRatio')) {
            return `arMddRatio${'10Year'}`;
        }
        return currentSortBy;
    });
  }, [visibleColumns]);

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

  const companies = data?.companies || [];

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

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(0); // Reset to first page when sorting changes
  };

  const currentVisibleColumns = ALL_COLUMNS.filter(col => visibleColumns[col.id]);

  const handleExportCSV = () => {
    window.open('/api/companies/export/csv', '_blank');
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
              <SelectItem value="marketCap">Market Cap</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="freeCashFlow">Free Cash Flow</SelectItem>
              <SelectItem value="return3Year">3Y Return</SelectItem>
              <SelectItem value="return5Year">5Y Return</SelectItem>
              <SelectItem value="return10Year">10Y Return</SelectItem>
              <SelectItem value="maxDrawdown3Year">3Y Max Drawdown</SelectItem>
              <SelectItem value="maxDrawdown5Year">5Y Max Drawdown</SelectItem>
              <SelectItem value="maxDrawdown10Year">10Y Max Drawdown</SelectItem>
              <SelectItem value="arMddRatio3Year">3Y AR/MDD Ratio</SelectItem>
              <SelectItem value="arMddRatio5Year">5Y AR/MDD Ratio</SelectItem>
              <SelectItem value="arMddRatio10Year">10Y AR/MDD Ratio</SelectItem>
              <SelectItem value="peRatio">P/E Ratio</SelectItem>
              <SelectItem value="priceToSalesRatio">P/S Ratio</SelectItem>
              <SelectItem value="netProfitMargin">Net Profit Margin</SelectItem>
              <SelectItem value="revenueGrowth3Y">Rev Growth 3Y</SelectItem>
              <SelectItem value="revenueGrowth5Y">Rev Growth 5Y</SelectItem>
              <SelectItem value="revenueGrowth10Y">Rev Growth 10Y</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-sm">
                <Settings2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Visible Columns</h4>
                  <p className="text-sm text-muted-foreground">
                    Select the metrics to display in the table.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_COLUMNS.filter(c => c.id !== 'watchlist' && c.id !== 'rank' && c.id !== 'name').map((column) => (
                    <Button
                      key={column.id}
                      variant={visibleColumns[column.id] ? "secondary" : "outline"}
                      size="sm"
                      className={`transition-all ${
                        visibleColumns[column.id]
                          ? 'border-sky-500 ring-2 ring-sky-500/20'
                          : 'border-border'
                      }`}
                      onClick={() =>
                        setVisibleColumns((prev) => ({
                          ...prev,
                          [column.id]: !prev[column.id],
                        }))
                      }
                    >
                      {column.label}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-sm">
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="w-full table-fixed min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                {currentVisibleColumns.map(column => (
                  <TableHead
                    key={column.id}
                    className={`text-right cursor-pointer hover:bg-muted/80 transition-colors ${column.width} ${
                      sortBy === column.id ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300' : ''
                    }`}
                    onClick={() => handleSort(column.id)}
                  >
                    <div className={`flex items-center ${column.id === 'name' || column.id === 'rank' ? 'justify-start' : 'justify-end'} gap-1`}>
                      {column.label}
                      <SortIcon column={column.id} />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {currentVisibleColumns.map(column => (
                      <TableCell key={column.id} className={column.id !== 'name' && column.id !== 'rank' ? 'text-right' : ''}>
                        <Skeleton className="h-6" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.companies?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={currentVisibleColumns.length} className="text-center py-12">
                    <div className="text-muted-foreground">
                      {searchQuery ? 
                        'No companies found matching your search.' : 
                        'No companies available.'
                      }
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.companies?.map((company: Company, index: number) => (
                  <TableRow 
                    key={company.id} 
                    className="hover:bg-muted/50 cursor-pointer group transition-colors"
                    onClick={() => console.log('Navigate to company:', company.symbol)}
                  >
                    {currentVisibleColumns.map(column => {
                      let cellContent;
                      switch (column.id) {
                        case 'watchlist':
                          cellContent = (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className={`p-1 h-auto transition-colors ${
                                isInWatchlist(company.symbol) 
                                  ? 'text-yellow-500 hover:text-yellow-600' 
                                  : 'text-muted-foreground hover:text-yellow-500'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWatchlistToggle(company.symbol);
                              }}
                              disabled={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
                            >
                              <Star className={`h-4 w-4 ${isInWatchlist(company.symbol) ? 'fill-current' : ''}`} />
                            </Button>
                          );
                          break;
                        case 'rank':
                          cellContent = <div className="font-medium">{(page * limit) + index + 1}</div>;
                          break;
                        case 'name':
                          cellContent = (
                            <div className="flex items-center gap-2">
                              <img 
                                src={company.logoUrl || `https://via.placeholder.com/32`}
                                alt={`${company.symbol} logo`}
                                className="h-6 w-6 rounded object-contain bg-white/80 border border-gray-100 dark:border-gray-800 dark:bg-gray-900/80 p-0.5 flex-shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32'; }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium group-hover:text-primary transition-colors truncate text-sm">{company.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{company.symbol}</div>
                              </div>
                            </div>
                          );
                          break;
                        case 'marketCap':
                          cellContent = <div className="font-mono font-medium">{formatMarketCap(company.marketCap)}</div>;
                          break;
                        case 'price':
                          cellContent = <div className="font-mono">{formatPrice(company.price)}</div>;
                          break;
                        case 'revenue':
                          cellContent = <div className="font-mono">{company.revenue ? formatMarketCap(company.revenue) : <span className="text-muted-foreground">-</span>}</div>;
                          break;
                        case 'netIncome':
                            cellContent = <div className="font-mono">{formatEarnings(company.netIncome)}</div>;
                            break;
                        case 'peRatio':
                          cellContent = <div className="font-mono">{formatNumber(company.peRatio, 1)}</div>;
                          break;
                        case 'priceToSalesRatio':
                          cellContent = <div className="font-mono">{formatNumber(company.priceToSalesRatio, 1)}</div>;
                          break;
                        case 'dividendYield':
                          cellContent = <div className="font-mono">{formatPercentage(company.dividendYield, false, 2)}</div>;
                          break;
                        case 'netProfitMargin':
                          cellContent = <div className="font-mono">{formatPercentage(company.netProfitMargin, false, 1)}</div>;
                          break;
                        case 'freeCashFlow':
                          cellContent = <div className="font-mono">{company.freeCashFlow ? formatMarketCap(company.freeCashFlow) : <span className="text-muted-foreground">-</span>}</div>;
                          break;
                        case 'revenueGrowth3Y':
                          cellContent = <div className="font-mono">{formatPercentage(company.revenueGrowth3Y, false, 1)}</div>;
                          break;
                        case 'revenueGrowth5Y':
                          cellContent = <div className="font-mono">{formatPercentage(company.revenueGrowth5Y, false, 1)}</div>;
                          break;
                        case 'revenueGrowth10Y':
                          cellContent = <div className="font-mono">{formatPercentage(company.revenueGrowth10Y, false, 1)}</div>;
                          break;
                        case 'return3Year':
                        case 'return5Year':
                        case 'return10Year':
                          cellContent = company[column.id] ? (
                            <Badge variant="outline" className={`font-mono ${parseFloat(company[column.id] as string) >= 0 ? 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950' : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'}`}>{formatPercentage(company[column.id] as string, true)}</Badge>
                          ) : <span className="text-muted-foreground">-</span>;
                          break;
                        case 'maxDrawdown3Year':
                        case 'maxDrawdown5Year':
                        case 'maxDrawdown10Year':
                          cellContent = company[column.id] ? (
                            <Badge variant="outline" className="font-mono text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950">-{formatPercentage(company[column.id] as string, false, 2)}</Badge>
                          ) : <span className="text-muted-foreground">-</span>;
                          break;
                        case 'arMddRatio3Year':
                        case 'arMddRatio5Year':
                        case 'arMddRatio10Year':
                            cellContent = company[column.id] ? (
                              <Badge variant="outline" className={`font-mono ${parseFloat(company[column.id] as string) >= 0.5 ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950' : parseFloat(company[column.id] as string) >= 0.2 ? 'text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950' : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'}`}>{formatNumber(company[column.id] as string, 2)}</Badge>
                            ) : <span className="text-muted-foreground">-</span>;
                            break;
                        default:
                            cellContent = <span className="text-muted-foreground">-</span>;
                          break;
                      }
                      return (
                        <TableCell key={column.id} className={column.id !== 'name' && column.id !== 'rank' ? 'text-right' : ''}>
                          {cellContent}
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
