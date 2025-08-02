import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun, Globe, DollarSign, Star, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyTable } from "@/components/company-table";
import { UpdateStatus } from "@/components/update-status";
import { useTheme } from "@/components/theme-provider";
import { formatMarketCap } from "@/lib/format";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Type assertion for user data (from Replit Auth)
  const userData = user as { firstName?: string; email?: string; profileImageUrl?: string } | undefined;
  const { toast } = useToast();

  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("EN");

  const { data: marketStats } = useQuery({
    queryKey: ['/api/market/stats'],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string);
      if (!response.ok) {
        throw new Error('Failed to fetch market stats');
      }
      return response.json();
    },
  });

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary">FindGreatStocks</h1>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              {/* User Info */}
              {isAuthenticated && userData && (
                <div className="flex items-center space-x-3 mr-2">
                  <div className="text-sm text-muted-foreground">
                    Welcome, {userData.firstName || userData.email || 'User'}
                  </div>
                  {userData.profileImageUrl && (
                    <img 
                      src={userData.profileImageUrl} 
                      alt="Profile" 
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Watchlist Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setLocation('/watchlist')}
                className="flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                <span>Watchlist</span>
              </Button>

              {/* Logout Button */}
              {isAuthenticated && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.href = '/api/logout'}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Button>
              )}

              {/* Theme Toggle */}
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">S&P 500 Companies</h1>
              <p className="text-muted-foreground text-lg">
                Companies: <span className="font-semibold">{marketStats?.totalCompanies?.toLocaleString() || '503'}</span> • 
                Total market cap: <span className="font-semibold text-primary">
                  {marketStats?.formattedTotalMarketCap || '$59.4 T'}
                </span>
                <span className="text-sm ml-4">
                  • Last updated: {new Date().toLocaleDateString()} (Real-time FMP API data)
                </span>
              </p>
            </div>
          </div>

          {/* Update Status */}
          <UpdateStatus />

          {/* Company Table */}
          <CompanyTable 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-muted-foreground">
            <p className="mb-4">Real-time market capitalization data for the world's largest companies</p>
            <div className="flex justify-center space-x-6 text-sm">
              <a href="#" className="hover:text-primary transition-colors">About</a>
              <a href="#" className="hover:text-primary transition-colors">API</a>
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
