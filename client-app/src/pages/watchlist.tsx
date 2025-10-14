import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, ArrowLeft, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMarketCap, formatPrice, formatPercentage, formatEarnings } from "@/lib/format";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { authFetch } from "@/lib/authFetch";
import type { Company, Watchlist } from "../types";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export function WatchlistPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      toast({
        title: "Unauthorized",
        description: "You need to sign in to access your watchlist. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [user, toast]);

  const { data: watchlistCompanies, isLoading, error } = useQuery<Company[]>({
    queryKey: ['/api/watchlist/companies'],
    queryFn: () => authFetch('/api/watchlist/companies'),
    enabled: !!user,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Prefetch watchlist upfront for faster open
  useEffect(() => {
    if (!user) return;
    queryClient.prefetchQuery({
      queryKey: ['/api/watchlist/companies'],
      queryFn: () => authFetch('/api/watchlist/companies'),
      staleTime: 5 * 60 * 1000,
    });
  }, [user, queryClient]);

  const removeFromWatchlistMutation = useMutation({
    mutationFn: (companySymbol: string) => authFetch(`/api/watchlist/${companySymbol}`, { method: 'DELETE' }),
    onSuccess: () => {
      // Invalidate both watchlist queries to ensure UI consistency
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/companies'] });
      // Также инвалидируем активную таблицу, чтобы звезда на главной стала белой
      queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && typeof q.queryKey[0] === 'string' && q.queryKey[0].toString().startsWith('/api/') && q.queryKey[0] !== '/api/watchlist' });
      toast({
        title: "Success",
        description: "Removed from watchlist.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Please sign in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
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

  const watchlistCompaniesToDisplay = watchlistCompanies || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Button>
          <div>
            <h1 className="text-2xl font-bold">My Watchlist</h1>
            <p className="text-muted-foreground">
              {watchlistCompaniesToDisplay?.length || 0} companies in your watchlist
            </p>
          </div>
        </div>
        
      </div>

      {/* Watchlist Content */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p>Loading your watchlist...</p>
          </CardContent>
        </Card>
      ) : watchlistCompaniesToDisplay.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your watchlist is empty</h3>
            <p className="text-muted-foreground mb-4">
              Start building your watchlist by clicking the star icon next to companies you want to track.
            </p>
            <Button onClick={() => navigate('/')}>
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
                  {watchlistCompaniesToDisplay.map((company: Company, index) => (
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
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img 
                            src={(company.logoUrl && String(company.logoUrl).trim() !== '') ? company.logoUrl : `https://financialmodelingprep.com/image-stock/${company.symbol.replace('-', '.')}.png`}
                            alt={`${company.symbol} logo`}
                            className="h-6 w-6 rounded object-contain bg-white/80 border border-gray-100 dark:border-gray-800 dark:bg-gray-900/80 p-0.5 flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://via.placeholder.com/32';
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
                        {company.peRatio && Number(company.peRatio) > 0 ? 
                          Number(company.peRatio).toFixed(1) : 
                          <span className="text-muted-foreground">-</span>}
                      </TableCell>

                      <TableCell className="text-right">
                        {company.return3Year && Number(company.return3Year) !== 0 ? 
                          <Badge 
                            variant="outline" 
                            className={`font-mono ${
                              Number(company.return3Year) >= 0 
                                ? 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950' 
                                : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'
                            }`}
                          >
                            {Number(company.return3Year) >= 0 ? '+' : ''}{Number(company.return3Year).toFixed(1)}%
                          </Badge>
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {company.return5Year && Number(company.return5Year) !== 0 ? 
                          <Badge 
                            variant="outline" 
                            className={`font-mono ${
                              Number(company.return5Year) >= 0 
                                ? 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950' 
                                : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'
                            }`}
                          >
                            {Number(company.return5Year) >= 0 ? '+' : ''}{Number(company.return5Year).toFixed(1)}%
                          </Badge>
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {company.return10Year && Number(company.return10Year) !== 0 ? 
                          <Badge 
                            variant="outline" 
                            className={`font-mono ${
                              Number(company.return10Year) >= 0 
                                ? 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950' 
                                : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950'
                            }`}
                          >
                            {Number(company.return10Year) >= 0 ? '+' : ''}{Number(company.return10Year).toFixed(1)}%
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