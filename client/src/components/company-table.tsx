import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, Star, Download, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMarketCap, formatPrice, formatPercentage, formatCountry, formatEarnings } from "@/lib/format";
import { apiRequest } from "@/lib/queryClient";
import type { Company } from "@shared/schema";

interface CompanyTableProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function CompanyTable({ searchQuery, setSearchQuery }: CompanyTableProps) {
  const [sortBy, setSortBy] = useState<string>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/companies', { 
      limit, 
      offset: page * limit, 
      sortBy, 
      sortOrder, 
      search: searchQuery || undefined
    }],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, any];
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      
      const response = await fetch(`${url}?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      return response.json();
    },
  });

  // Watchlist mutations
  const { data: watchlistData } = useQuery({
    queryKey: ['/api/watchlist'],
    queryFn: async () => {
      const response = await fetch('/api/watchlist');
      if (!response.ok) throw new Error('Failed to fetch watchlist');
      return response.json();
    },
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
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value) => {
            setSortBy(value);
            setSortOrder('desc'); // Default to descending for most metrics
            setPage(0); // Reset to first page when sorting changes
          }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Rank by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="marketCap">Market Cap</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="return3Year">3Y Returns</SelectItem>
              <SelectItem value="return5Year">5Y Returns</SelectItem>
              <SelectItem value="return10Year">10Y Returns</SelectItem>
              <SelectItem value="maxDrawdown10Year">Max Drawdown</SelectItem>
              <SelectItem value="returnDrawdownRatio10Year">AR/MDD Ratio</SelectItem>
              <SelectItem value="peRatio">P/E Ratio</SelectItem>
              <SelectItem value="dailyChangePercent">Today's Change</SelectItem>
            </SelectContent>
          </Select>
          

        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="w-full">
          <Table className="w-full table-fixed">
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
                  sortBy === 'return3Year' ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('return3Year')}
              >
                <div className="flex items-center justify-end gap-1">
                  3Y Return
                  <SortIcon column="return3Year" />
                </div>
              </TableHead>
              <TableHead 
                className={`text-right cursor-pointer hover:bg-muted/80 transition-colors w-[85px] ${
                  sortBy === 'return5Year' ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('return5Year')}
              >
                <div className="flex items-center justify-end gap-1">
                  5Y Return
                  <SortIcon column="return5Year" />
                </div>
              </TableHead>
              <TableHead 
                className={`text-right cursor-pointer hover:bg-muted/80 transition-colors w-[85px] ${
                  sortBy === 'return10Year' ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('return10Year')}
              >
                <div className="flex items-center justify-end gap-1">
                  10Y Return
                  <SortIcon column="return10Year" />
                </div>
              </TableHead>
              <TableHead 
                className={`text-right cursor-pointer hover:bg-muted/80 transition-colors w-[100px] ${
                  sortBy === 'maxDrawdown10Year' ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('maxDrawdown10Year')}
              >
                <div className="flex items-center justify-end gap-1">
                  Max Drawdown
                  <SortIcon column="maxDrawdown10Year" />
                </div>
              </TableHead>
              <TableHead 
                className={`text-right cursor-pointer hover:bg-muted/80 transition-colors w-[100px] ${
                  sortBy === 'returnDrawdownRatio10Year' ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('returnDrawdownRatio10Year')}
              >
                <div className="flex items-center justify-end gap-1">
                  AR/MDD Ratio
                  <SortIcon column="returnDrawdownRatio10Year" />
                </div>
              </TableHead>
              <TableHead 
                className={`text-right cursor-pointer hover:bg-muted/80 transition-colors w-[70px] ${
                  sortBy === 'dailyChangePercent' ? 'bg-primary/10 text-primary' : ''
                }`}
                onClick={() => handleSort('dailyChangePercent')}
              >
                <div className="flex items-center justify-end gap-1">
                  Today
                  <SortIcon column="dailyChangePercent" />
                </div>
              </TableHead>
              <TableHead className="text-center w-24">Country</TableHead>
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
              data?.companies?.map((company: Company) => (
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
                  <TableCell className="font-medium">{company.rank}</TableCell>
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
                    {company.return3Year && parseFloat(company.return3Year) !== 0 ? 
                      <Badge 
                        variant="outline" 
                        className={`font-mono ${
                          parseFloat(company.return3Year) >= 0 
                            ? 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950' 
                            : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'
                        }`}
                      >
                        {parseFloat(company.return3Year) >= 0 ? '+' : ''}{parseFloat(company.return3Year).toFixed(1)}%
                      </Badge>
                      : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.return5Year && parseFloat(company.return5Year) !== 0 ? 
                      <Badge 
                        variant="outline" 
                        className={`font-mono ${
                          parseFloat(company.return5Year) >= 0 
                            ? 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950' 
                            : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'
                        }`}
                      >
                        {parseFloat(company.return5Year) >= 0 ? '+' : ''}{parseFloat(company.return5Year).toFixed(1)}%
                      </Badge>
                      : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.return10Year && parseFloat(company.return10Year) !== 0 ? 
                      <Badge 
                        variant="outline" 
                        className={`font-mono ${
                          parseFloat(company.return10Year) >= 0 
                            ? 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950' 
                            : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'
                        }`}
                      >
                        {parseFloat(company.return10Year) >= 0 ? '+' : ''}{parseFloat(company.return10Year).toFixed(1)}%
                      </Badge>
                      : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.maxDrawdown10Year && parseFloat(company.maxDrawdown10Year) > 0 ? 
                      <Badge 
                        variant="outline" 
                        className="font-mono text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950"
                      >
                        -{parseFloat(company.maxDrawdown10Year).toFixed(1)}%
                      </Badge>
                      : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.return10Year && company.maxDrawdown10Year && parseFloat(company.return10Year) !== 0 && parseFloat(company.maxDrawdown10Year) > 0 ? 
                      <Badge 
                        variant="outline" 
                        className={`font-mono ${
                          (parseFloat(company.return10Year) / parseFloat(company.maxDrawdown10Year)) >= 0.5
                            ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950'
                            : (parseFloat(company.return10Year) / parseFloat(company.maxDrawdown10Year)) >= 0.2
                            ? 'text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950'
                            : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'
                        }`}
                      >
                        {(parseFloat(company.return10Year) / parseFloat(company.maxDrawdown10Year)).toFixed(2)}
                      </Badge>
                      : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant="outline" 
                      className={`font-mono ${
                        parseFloat(company.dailyChangePercent) >= 0 
                          ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950' 
                          : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'
                      }`}
                    >
                      {formatPercentage(company.dailyChangePercent)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <img 
                        src={`https://flagcdn.com/w20/${company.countryCode}.png`}
                        alt={company.country}
                        className="h-3 w-4 object-cover"
                      />
                      <span className="text-xs text-muted-foreground">
                        {formatCountry(company.countryCode)}
                      </span>
                    </div>
                  </TableCell>
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
