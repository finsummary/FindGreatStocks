import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, Star, Download, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMarketCap, formatPrice, formatPercentage, formatPercentageFromDecimal, formatCountry, formatEarnings } from "@/lib/format";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Company, Nasdaq100Company, Ftse100Company } from "@shared/schema";
import { authFetch } from "@/lib/authFetch";

type TimePeriod = '3Year' | '5Year' | '10Year';

interface CompanyTableProps {
  searchQuery: string;
  dataset: 'sp500' | 'nasdaq100' | 'ftse100';
}

export function CompanyTable({ searchQuery, dataset }: CompanyTableProps) {
  const [sortBy, setSortBy] = useState<string>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('10Year');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setSortBy(currentSortBy => {
        if (currentSortBy.includes('return')) {
            return `return${timePeriod}`;
        } else if (currentSortBy.includes('maxDrawdown')) {
            return `maxDrawdown${timePeriod}`;
        } else if (currentSortBy.includes('arMddRatio')) {
            return `arMddRatio${timePeriod}`;
        }
        return currentSortBy;
    });
  }, [timePeriod]);

  const apiEndpoint = dataset === 'nasdaq100' ? '/api/nasdaq100' : dataset === 'ftse100' ? '/api/ftse100' : '/api/companies';

  const { data, isLoading, error } = useQuery({
    queryKey: [apiEndpoint, page, sortBy, sortOrder, searchQuery],
    queryFn: async ({ queryKey }) => {
      const [url, page, sortBy, sortOrder, search] = queryKey as [
        string,
        number,
        string,
        string,
        string,
      ];

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy: sortBy,
        sortOrder: sortOrder,
      });

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

  const returnColumn: keyof Company = `return${timePeriod}` as keyof Company;
  const maxDrawdownColumn: keyof Company = `maxDrawdown${timePeriod}` as keyof Company;
  const arMddRatioColumn: keyof Company = `arMddRatio${timePeriod}` as keyof Company;

  const handleSort = (column: string) => {
    let sortableColumn = column;
    if (column.includes('return')) sortableColumn = returnColumn;
    if (column.includes('maxDrawdown')) sortableColumn = maxDrawdownColumn;
    if (column.includes('arMddRatio')) sortableColumn = arMddRatioColumn;

    if (sortBy === sortableColumn) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(sortableColumn);
      setSortOrder('asc');
    }
    setPage(0); // Reset to first page when sorting changes
  };

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
            setSortBy(value);
            setSortOrder('desc'); // Default to descending for most metrics
            setPage(0); // Reset to first page when sorting changes
          }}>
            <SelectTrigger className="w-full sm:w-48 text-sm">
              <SelectValue placeholder="Rank by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="marketCap">Market Cap</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value={returnColumn}>Returns</SelectItem>
              <SelectItem value={maxDrawdownColumn}>Max Drawdown</SelectItem>
              <SelectItem value={arMddRatioColumn}>AR/MDD Ratio</SelectItem>
              <SelectItem value="peRatio">P/E Ratio</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
            <SelectTrigger className="w-full sm:w-32 text-sm">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3Year">3-Year</SelectItem>
              <SelectItem value="5Year">5-Year</SelectItem>
              <SelectItem value="10Year">10-Year</SelectItem>
            </SelectContent>
          </Select>
          
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
              <TableHead className="w-[40px]"></TableHead>
              <TableHead 
                className={`cursor-pointer hover:bg-muted/80 transition-colors w-[60px] ${
                  sortBy === 'rank' ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('rank')}
              >
                <div className="flex items-center gap-1">
                  Rank
                  <SortIcon column="rank" />
                </div>
              </TableHead>
              <TableHead 
                className={`cursor-pointer hover:bg-muted/80 transition-colors w-[220px] ${
                  sortBy === 'name' ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Company Name
                  <SortIcon column="name" />
                </div>
              </TableHead>
              <TableHead 
                className={`text-right cursor-pointer hover:bg-muted/80 transition-colors w-[110px] ${
                  sortBy === 'marketCap' ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('marketCap')}
              >
                <div className="flex items-center justify-end gap-1">
                  Market Cap
                  <SortIcon column="marketCap" />
                </div>
              </TableHead>
              <TableHead 
                className={`text-right cursor-pointer hover:bg-muted/80 transition-colors w-[80px] ${
                  sortBy === 'price' ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center justify-end gap-1">
                  Price
                  <SortIcon column="price" />
                </div>
              </TableHead>
              <TableHead 
                className={`text-right cursor-pointer hover:bg-muted/80 transition-colors w-[90px] ${
                  sortBy === 'revenue' ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('revenue')}
              >
                <div className="flex items-center justify-end gap-1">
                  Revenue
                  <SortIcon column="revenue" />
                </div>
              </TableHead>
              <TableHead 
                className={`text-right cursor-pointer hover:bg-muted/80 transition-colors w-[90px] ${
                  sortBy === 'netIncome' ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('netIncome')}
              >
                <div className="flex items-center justify-end gap-1">
                  Earnings
                  <SortIcon column="netIncome" />
                </div>
              </TableHead>
              <TableHead 
                className={`text-right cursor-pointer hover:bg-muted/80 transition-colors w-[75px] ${
                  sortBy === 'peRatio' ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('peRatio')}
              >
                <div className="flex items-center justify-end gap-1">
                  P/E Ratio
                  <SortIcon column="peRatio" />
                </div>
              </TableHead>

              <TableHead 
                className={`text-right cursor-pointer hover:bg-muted/80 transition-colors w-[85px] ${
                  sortBy.includes('return') ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('return')}
              >
                <div className="flex items-center justify-end gap-1">
                  {timePeriod.replace('Year', 'Y')} Return
                  <SortIcon column={returnColumn} />
                </div>
              </TableHead>
              <TableHead 
                className={`text-right cursor-pointer hover:bg-muted/80 transition-colors w-[100px] ${
                  sortBy.includes('maxDrawdown') ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('maxDrawdown')}
              >
                <div className="flex items-center justify-end gap-1">
                  Max Drawdown
                  <SortIcon column={maxDrawdownColumn} />
                </div>
              </TableHead>
              <TableHead 
                className={`text-right cursor-pointer hover:bg-muted/80 transition-colors w-[100px] ${
                  sortBy.includes('arMddRatio') ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('arMddRatio')}
              >
                <div className="flex items-center justify-end gap-1">
                  AR/MDD Ratio
                  <SortIcon column={arMddRatioColumn} />
                </div>
              </TableHead>

            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : data?.companies?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center py-12">
                  <div className="text-muted-foreground">
                    {searchQuery ? 
                      'No companies found matching your search.' : 
                      'No companies available.'
                    }
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.companies?.map((company: Company, index: number) => {
                // --- DEBUG LOG ---
                if (index === 0) {
                  console.log("Data for the first company object:", company);
                }
                // --- END DEBUG LOG ---
                return (
                  <TableRow 
                    key={company.id} 
                    className="hover:bg-muted/50 cursor-pointer group transition-colors"
                    onClick={() => console.log('Navigate to company:', company.symbol)}
                  >
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="font-medium">
                      {page * limit + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <img 
                          src={company.logoUrl || `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64`}
                          alt={`${company.symbol} logo`}
                          className="h-6 w-6 rounded object-contain bg-white/80 border border-gray-100 dark:border-gray-800 dark:bg-gray-900/80 p-0.5 flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium group-hover:text-primary transition-colors truncate text-sm">
                            {company.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {company.symbol}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatMarketCap(company.marketCap)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPrice(company.price)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {company.revenue ? formatMarketCap(company.revenue) : 
                        <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {company.netIncome ? formatEarnings(company.netIncome) : 
                        <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {company.peRatio && parseFloat(company.peRatio) > 0 ? 
                        parseFloat(company.peRatio).toFixed(1) : 
                        <span className="text-muted-foreground">-</span>}
                    </TableCell>

                    <TableCell className="text-right">
                      {company[returnColumn] && parseFloat(company[returnColumn] as string) !== 0 ? 
                        <Badge 
                          variant="outline" 
                          className={`font-mono ${
                            parseFloat(company[returnColumn] as string) >= 0 
                              ? 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950' 
                              : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'
                          }`}
                        >
                          {formatPercentage(company[returnColumn] as string, true)}
                        </Badge>
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {company[maxDrawdownColumn] && parseFloat(company[maxDrawdownColumn] as string) > 0 ? 
                        <Badge 
                          variant="outline" 
                          className="font-mono text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950"
                        >
                          -{parseFloat(company[maxDrawdownColumn] as string).toFixed(2)}%
                        </Badge>
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {company[arMddRatioColumn] && parseFloat(company[arMddRatioColumn] as string) !== 0 ? 
                        <Badge 
                          variant="outline" 
                          className={`font-mono ${
                            parseFloat(company[arMddRatioColumn] as string) >= 0.5
                              ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950'
                              : parseFloat(company[arMddRatioColumn] as string) >= 0.2
                              ? 'text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950'
                              : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'
                          }`}
                        >
                          {parseFloat(company[arMddRatioColumn] as string).toFixed(2)}
                        </Badge>
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                  </TableRow>
                );
              })
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
