import { CompanyTable } from "@/components/company-table";
import { Header } from "@/components/header";
import { UpdateStatus } from "@/components/update-status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <div className="mt-6">
        <input
          type="text"
          placeholder="Search by company name or symbol..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="mt-6">
        <Tabs defaultValue="sp500" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sp500">S&P 500</TabsTrigger>
            <TabsTrigger value="nasdaq100">Nasdaq 100</TabsTrigger>
            <TabsTrigger value="dowjones">Dow Jones</TabsTrigger>
          </TabsList>
          <TabsContent value="sp500">
            <div className="mt-4">
              <CompanyTable dataset="sp500" searchQuery={searchQuery} />
            </div>
          </TabsContent>
          <TabsContent value="nasdaq100">
            <div className="mt-4">
              <CompanyTable dataset="nasdaq100" searchQuery={searchQuery} />
            </div>
          </TabsContent>
          <TabsContent value="dowjones">
            <div className="mt-4">
              <CompanyTable dataset="dowjones" searchQuery={searchQuery} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
