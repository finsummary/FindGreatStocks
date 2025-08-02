import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun, Globe, DollarSign, Star, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyTable } from "@/components/company-table";
import { GoogleAdsBanner } from "@/components/google-ads-banner";
import { useTheme } from "@/components/theme-provider";
import { formatMarketCap } from "@/lib/format";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackEvent } from "@/lib/analytics";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Type assertion for user data (from Replit Auth)
  const userData = user as { firstName?: string; email?: string; profileImageUrl?: string } | undefined;
  const { toast } = useToast();



  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-sm sm:text-xl font-bold text-primary">FindGreatStocks.com</h1>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* User Info */}
              {isAuthenticated && userData && (
                <div className="flex items-center space-x-2 mr-1 sm:mr-2">
                  <div className="text-xs sm:text-sm text-muted-foreground hidden md:block">
                    Welcome, {userData.firstName || userData.email?.split('@')[0] || 'User'}
                  </div>
                  {userData.profileImageUrl && (
                    <img 
                      src={userData.profileImageUrl} 
                      alt="Profile" 
                      className="h-6 w-6 sm:h-8 sm:w-8 rounded-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Watchlist Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  trackEvent('watchlist_click', 'navigation', 'header');
                  if (isAuthenticated) {
                    setLocation('/watchlist');
                  } else {
                    // Prompt user to sign in for watchlist access
                    toast({
                      title: "Sign In Required",
                      description: "Please sign in to access your personal watchlist",
                      variant: "default",
                    });
                    setTimeout(() => {
                      window.location.href = '/api/login';
                    }, 1500);
                  }
                }}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
              >
                <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Watchlist</span>
              </Button>

              {/* Auth Button */}
              {isAuthenticated ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    trackEvent('logout_click', 'user', 'header');
                    window.location.href = '/api/logout';
                  }}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
                >
                  <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => {
                    trackEvent('login_click', 'user', 'header');
                    window.location.href = '/api/login';
                  }}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
                >
                  <span className="text-xs sm:text-sm">Sign In</span>
                </Button>
              )}

              {/* Theme Toggle */}
              <Button variant="outline" size="sm" onClick={toggleTheme} className="px-2 sm:px-3">
                {theme === "light" ? (
                  <Moon className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  <Sun className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Top Google Ads Banner */}
      <GoogleAdsBanner 
        adSlot="1234567890" 
        adFormat="horizontal"
        className="border-b"
      />

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Company Table */}
        <div className="mb-8">
          <Tabs 
            defaultValue="sp500" 
            className="w-full"
            onValueChange={(value) => trackEvent('tab_change', 'navigation', value)}
          >
            <TabsList className="grid w-full grid-cols-3 max-w-[600px] mb-4 sm:mb-6">
              <TabsTrigger value="sp500" className="text-xs sm:text-sm">S&P 500 (503)</TabsTrigger>
              <TabsTrigger value="nasdaq100" className="text-xs sm:text-sm">Nasdaq 100 (100)</TabsTrigger>
              <TabsTrigger value="ftse100" className="text-xs sm:text-sm">FTSE 100 (95)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sp500" className="mt-6">
              <CompanyTable 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                dataset="sp500"
              />
            </TabsContent>
            
            <TabsContent value="nasdaq100" className="mt-6">
              <CompanyTable 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                dataset="nasdaq100"
              />
            </TabsContent>
            
            <TabsContent value="ftse100" className="mt-6">
              <CompanyTable 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                dataset="ftse100"
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {/* Bottom Google Ads Banner */}
      <GoogleAdsBanner 
        adSlot="0987654321" 
        adFormat="rectangle"
        className="border-t"
      />

      {/* Footer */}
      <footer className="border-t bg-muted/50 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-muted-foreground">
            <p className="mb-4">© 2025 FindGreatStocks.com - Real-time market intelligence for smart investors</p>
            <div className="flex justify-center space-x-6 text-sm">
              <a href="/about" className="hover:text-primary transition-colors">About</a>
              <a href="/terms" className="hover:text-primary transition-colors">Terms</a>
              <a href="/privacy" className="hover:text-primary transition-colors">Privacy</a>
              <a href="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</a>
              <a href="/contact" className="hover:text-primary transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
