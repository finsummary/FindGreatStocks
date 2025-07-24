import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Moon, Sun, Globe, DollarSign, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyTable } from "@/components/company-table";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { formatMarketCap } from "@/lib/format";
import { queryClient } from "@/lib/queryClient";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("EN");
  const { toast } = useToast();

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

  const syncMutation = useMutation({
    mutationFn: async (limit: number = 1000) => {
      const response = await fetch(`/api/companies/sync?limit=${limit}`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to sync financial data');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Financial data synchronized",
        description: `Updated ${data.companiesUpdated} companies with real market data`,
      });
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
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
              <h1 className="text-xl font-bold text-primary">CompaniesMarketCap</h1>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-4">
              {/* Sync Data Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => syncMutation.mutate(1000)}
                disabled={syncMutation.isPending}
                className="flex items-center gap-2"
              >
                {syncMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {syncMutation.isPending ? 'Syncing...' : 'Sync Data'}
                </span>
              </Button>

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
              <h1 className="text-4xl font-bold mb-2">Largest Companies by Market Cap</h1>
              <p className="text-muted-foreground text-lg">
                Companies: <span className="font-semibold">{marketStats?.totalCompanies?.toLocaleString() || '10,582'}</span> • 
                Total market cap: <span className="font-semibold text-primary">
                  {marketStats?.formattedTotalMarketCap || '$127.029 T'}
                </span>
              </p>
            </div>
          </div>

          {/* Ranking Tabs */}
          <Tabs defaultValue="marketcap" className="w-full">
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-none lg:flex">
              <TabsTrigger value="marketcap">Market Cap</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="employees">Employees</TabsTrigger>
              <TabsTrigger value="pe-ratio">P/E ratio</TabsTrigger>
              <TabsTrigger value="more">More +</TabsTrigger>
            </TabsList>
            
            <TabsContent value="marketcap" className="mt-6">
              <CompanyTable 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCountry={selectedCountry}
                setSelectedCountry={setSelectedCountry}
              />
            </TabsContent>

            {/* Placeholder content for other tabs */}
            {['earnings', 'revenue', 'employees', 'pe-ratio', 'more'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-6">
                <div className="text-center py-12 text-muted-foreground">
                  {tab === 'more' ? 
                    'Additional ranking options coming soon.' :
                    `Rankings by ${tab} coming soon.`
                  }
                </div>
              </TabsContent>
            ))}
          </Tabs>
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
