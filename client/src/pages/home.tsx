import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun, Globe, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyTable } from "@/components/company-table";
import { useTheme } from "@/components/theme-provider";
import { formatMarketCap } from "@/lib/format";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

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

              {/* Language Selector */}
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <img src="https://flagcdn.com/w20/us.png" alt="US Flag" className="w-4 h-3" />
                <span>{language}</span>
              </Button>

              {/* Currency Selector */}
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="font-mono">{currency}</span>
              </Button>

              {/* Theme Toggle */}
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>

              {/* Sign In */}
              <Button size="sm">Sign In</Button>
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
                Companies: <span className="font-semibold">{marketStats?.totalCompanies?.toLocaleString() || '10,582'}</span> • 
                Total market cap: <span className="font-semibold text-primary">
                  {marketStats?.formattedTotalMarketCap || '$127.029 T'}
                </span>
                {marketStats?.lastUpdate && (
                  <span className="text-sm ml-4">
                    • Last updated: {new Date(marketStats.lastUpdate).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          </div>

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
