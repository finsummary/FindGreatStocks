import { CompanyTable } from "@/components/company-table";
import { Header } from "@/components/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dowjones");

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by company name or symbol..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex mb-4">
            <TabsTrigger value="sp500" className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm">S&P 500</TabsTrigger>
            <TabsTrigger value="nasdaq100" className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm">Nasdaq 100</TabsTrigger>
            <TabsTrigger value="dowjones" className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm">Dow Jones</TabsTrigger>
          </TabsList>
          <TabsContent value="sp500">
            <CompanyTable searchQuery={searchQuery} dataset="sp500" />
          </TabsContent>
          <TabsContent value="nasdaq100">
            <CompanyTable searchQuery={searchQuery} dataset="nasdaq100" />
          </TabsContent>
          <TabsContent value="dowjones">
            <CompanyTable searchQuery={searchQuery} dataset="dowjones" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default HomePage;
