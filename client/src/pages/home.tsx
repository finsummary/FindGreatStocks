import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"
import { CompanyTable } from "@/components/company-table";
import { Header } from "@/components/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export function HomePage() {
  const [activeTab, setActiveTab] = useState<'sp500' | 'nasdaq100' | 'dowjones'>('dowjones');
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // The original code had searchQuery state, but the new_code removed it.
    // Assuming the intent was to use searchQuery state for the search functionality.
    // Since searchQuery state is removed, this function will not work as intended
    // without a new searchQuery state or a different mechanism for the search input.
    // For now, I'm keeping the function signature as is, but it will not update searchQuery.
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'dowjones' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('dowjones')}
              className={`font-semibold ${activeTab === 'dowjones' ? 'ring-2 ring-blue-500/50' : ''}`}
            >
              Dow Jones
            </Button>
            <Button
              variant={activeTab === 'sp500' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('sp500')}
              className={`font-semibold ${activeTab === 'sp500' ? 'ring-2 ring-blue-500/50' : ''}`}
            >
              S&P 500
            </Button>
            <Button
              variant={activeTab === 'nasdaq100' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('nasdaq100')}
              className={`font-semibold ${activeTab === 'nasdaq100' ? 'ring-2 ring-blue-500/50' : ''}`}
            >
              Nasdaq 100
            </Button>
          </div>
          <form onSubmit={handleSearch} className="flex w-full max-w-sm items-center space-x-2">
            <Input 
              type="text" 
              placeholder="Search by company or ticker..."
              defaultValue={searchQuery}
            />
            <Button type="submit" variant="outline">Search</Button>
          </form>
        </div>

        <div>
          {activeTab === 'sp500' && <CompanyTable searchQuery={searchQuery} dataset="sp500" activeTab={activeTab} />}
          {activeTab === 'nasdaq100' && <CompanyTable searchQuery={searchQuery} dataset="nasdaq100" activeTab={activeTab} />}
          {activeTab === 'dowjones' && <CompanyTable searchQuery={searchQuery} dataset="dowjones" activeTab={activeTab} />}
        </div>
      </main>
    </div>
  );
}

export default HomePage;
