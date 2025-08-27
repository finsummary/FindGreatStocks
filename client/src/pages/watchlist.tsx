import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, ArrowLeft, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMarketCap, formatPrice, formatPercentage, formatEarnings } from "@/lib/format";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Company, Watchlist } from "@shared/schema";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function WatchlistPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to sign in to access your watchlist. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch watchlist items
  const { data: watchlistData, isLoading: watchlistLoading } = useQuery({
    queryKey: ['/api/watchlist'],
    queryFn: async () => {
      const response = await fetch('/api/watchlist');
      if (!response.ok) throw new Error('Failed to fetch watchlist');
      return response.json();
    },
  });

  // Fetch company details for watchlist items
  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ['/api/companies', { limit: 1000 }], // Get more companies to find watchlist matches
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, any];
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      
      const response = await fetch(`${url}?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    },
    enabled: !!watchlistData?.length,
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (companySymbol: string) => {
      return await apiRequest('DELETE', `/api/watchlist/${companySymbol}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to remove stock from watchlist",
        variant: "destructive",
      });
    },
  });

  const handleRemoveFromWatchlist = (symbol: string) => {
    removeFromWatchlistMutation.mutate(symbol);
  };

  const handleExportWatchlist = () => {
    if (!watchlistCompanies?.length) return;
    
    const csvContent = [
      ['Company', 'Symbol', 'Market Cap', 'Price', 'Revenue', 'Earnings', 'P/E Ratio', '3Y Return', '5Y Return', '10Y Return', 'Today Change'].join(','),
      ...watchlistCompanies.map((company: Company) => [
        `"${company.name}"`,
        company.symbol,
        company.marketCap ? formatMarketCap(company.marketCap) : '',
        company.price ? formatPrice(company.price) : '',
        company.revenue ? formatMarketCap(company.revenue) : '',
        company.netIncome ? formatEarnings(company.netIncome) : '',
        company.peRatio || '',
        company.return3Year ? `${company.return3Year}%` : '',
        company.return5Year ? `${company.return5Year}%` : '',
        company.return10Year ? `${company.return10Year}%` : '',
        company.dailyChangePercent ? `${company.dailyChangePercent}%` : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'watchlist.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Filter companies that are in the watchlist
  const watchlistCompanies = companiesData?.companies?.filter((company: Company) =>
    watchlistData?.some((item: Watchlist) => item.companySymbol === company.symbol)
  ) || [];

  const isDataLoading = watchlistLoading || companiesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Button>
          <div>
            <h1 className="text-2xl font-bold">My Watchlist</h1>
            <p className="text-muted-foreground">
              {watchlistData?.length || 0} companies in your watchlist
            </p>
          </div>
        </div>
        
        {watchlistCompanies.length > 0 && (
          <Button onClick={handleExportWatchlist} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Watchlist Content */}
      {isDataLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p>Loading your watchlist...</p>
          </CardContent>
        </Card>
      ) : watchlistData?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your watchlist is empty</h3>
            <p className="text-muted-foreground mb-4">
              Start building your watchlist by clicking the star icon next to companies you want to track.
            </p>
            <Button onClick={() => setLocation('/')}>
              Browse Companies
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Watchlist Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[60px]">Rank</TableHead>
                    <TableHead className="w-[250px]">Company</TableHead>
                    <TableHead className="text-right w-[110px]">Market Cap</TableHead>
                    <TableHead className="text-right w-[80px]">Price</TableHead>
                    <TableHead className="text-right w-[90px]">Revenue</TableHead>
                    <TableHead className="text-right w-[90px]">Earnings</TableHead>
                    <TableHead className="text-right w-[75px]">P/E Ratio</TableHead>

                    <TableHead className="text-right w-[85px]">3Y Return</TableHead>
                    <TableHead className="text-right w-[85px]">5Y Return</TableHead>
                    <TableHead className="text-right w-[85px]">10Y Return</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchlistCompanies.map((company: Company) => (
                    <TableRow 
                      key={company.id} 
                      className="hover:bg-muted/50 cursor-pointer group transition-colors"
                    >
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-1 h-auto text-yellow-500 hover:text-yellow-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromWatchlist(company.symbol);
                          }}
                          disabled={removeFromWatchlistMutation.isPending}
                        >
                          <Star className="h-4 w-4 fill-current" />
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}