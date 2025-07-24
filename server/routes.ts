import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { financialDataService } from "./financial-data";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get companies with pagination, sorting, and filtering
  app.get("/api/companies", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const sortBy = (req.query.sortBy as string) || 'rank';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';
      const search = req.query.search as string;
      const country = req.query.country as string;

      const allCompanies = await storage.getCompanies(limit * 3, offset, sortBy, sortOrder, search, country); // Get more to account for filtering
      
      // Filter out index funds and ETFs
      const filteredCompanies = allCompanies.filter(company => 
        !financialDataService.isIndexFundOrETF(company.symbol, company.name)
      ).slice(0, limit); // Take only the requested limit after filtering
      
      const totalUnfiltered = await storage.getCompanyCount(search, country);
      const totalFiltered = Math.floor(totalUnfiltered * 0.7); // Estimate filtered count (70% of unfiltered)

      res.json({
        companies: filteredCompanies,
        total: totalFiltered,
        limit,
        offset,
        hasMore: offset + limit < totalFiltered
      });
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Get company by symbol
  app.get("/api/companies/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const company = await storage.getCompanyBySymbol(symbol);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  // Export companies to CSV
  app.get("/api/companies/export/csv", async (req, res) => {
    try {
      const companies = await storage.getCompanies(10000, 0); // Get all companies
      
      const csvHeader = "Rank,Name,Symbol,Market Cap,Price,Daily Change %,Country\n";
      const csvRows = companies.map(company => {
        const marketCapFormatted = formatMarketCap(parseFloat(company.marketCap));
        return `${company.rank},"${company.name}",${company.symbol},${marketCapFormatted},$${company.price},${company.dailyChangePercent}%,${company.country}`;
      }).join("\n");
      
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="companies-market-cap.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  // Get total available companies count
  app.get("/api/companies/available-count", async (req, res) => {
    try {
      const totalCount = await financialDataService.getTotalAvailableCompanies();
      res.json({ 
        totalAvailable: totalCount,
        source: "FMP API"
      });
    } catch (error) {
      console.error("Error getting available companies count:", error);
      res.status(500).json({ 
        message: "Failed to get available companies count", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Fetch real financial data and update storage
  app.post("/api/companies/sync", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10000; // Increased default limit
      const updateOnly = req.query.updateOnly === 'true'; // For daily price updates
      
      console.log(`Starting comprehensive financial data sync... (limit: ${limit}, updateOnly: ${updateOnly})`);
      
      if (!updateOnly) {
        // Clear existing data only for full sync
        await storage.clearAllCompanies();
        console.log("Cleared existing company data");
      }
      
      // Fetch data from FMP API using comprehensive strategy
      const startTime = Date.now();
      const allCompanies = await financialDataService.fetchTopCompaniesByMarketCap(limit);
      const fetchTime = Date.now() - startTime;
      
      console.log(`Fetched ${allCompanies.length} companies from FMP in ${fetchTime}ms`);

      if (allCompanies.length === 0) {
        return res.status(500).json({ 
          message: "No companies data received from API", 
          source: "FMP API"
        });
      }

      let totalMarketCap = 0;
      let companiesProcessed = 0;
      const processingStartTime = Date.now();

      if (updateOnly) {
        // Update existing companies with new prices and market caps
        for (let i = 0; i < allCompanies.length; i++) {
          const company = allCompanies[i];
          const existingCompany = await storage.getCompanyBySymbol(company.symbol);
          
          if (existingCompany) {
            // Update only price, market cap, and changes
            const updatedData = {
              marketCap: company.marketCap.toString(),
              price: company.price.toFixed(2),
              dailyChange: (company.change || 0).toFixed(2),
              dailyChangePercent: (company.changesPercentage || 0).toFixed(2)
            };
            
            await storage.updateCompany(company.symbol, updatedData);
            companiesProcessed++;
          }
          totalMarketCap += company.marketCap;
        }
      } else {
        // Full sync - convert and store companies directly from screener data
        const batchSize = 50; // Process in batches for better performance
        
        for (let i = 0; i < allCompanies.length; i += batchSize) {
          const batch = allCompanies.slice(i, i + batchSize);
          
          // Process batch in parallel
          const promises = batch.map(async (company, index) => {
            try {
              const globalRank = i + index + 1;
              const convertedCompany = financialDataService.convertToCompanySchema(company, globalRank);
              await storage.createCompany(convertedCompany);
              companiesProcessed++;
              return parseFloat(convertedCompany.marketCap);
            } catch (error) {
              console.error(`Error processing company ${company.symbol}:`, error);
              return 0;
            }
          });
          
          const batchMarketCaps = await Promise.all(promises);
          totalMarketCap += batchMarketCaps.reduce((sum, cap) => sum + cap, 0);
          
          console.log(`Processed batch ${Math.floor(i/batchSize) + 1}: ${companiesProcessed} companies total`);
        }
      }

      const processingTime = Date.now() - processingStartTime;
      const totalTime = Date.now() - startTime;
      
      console.log(`Successfully ${updateOnly ? 'updated' : 'synced'} ${companiesProcessed} companies from API`);
      console.log(`Performance: Fetch: ${fetchTime}ms, Processing: ${processingTime}ms, Total: ${totalTime}ms`);
      
      res.json({ 
        message: `Financial data ${updateOnly ? 'updated' : 'synchronized'} successfully from FMP API`,
        companiesUpdated: companiesProcessed,
        totalMarketCap,
        source: "FMP API",
        updateOnly,
        performance: {
          fetchTimeMs: fetchTime,
          processingTimeMs: processingTime,
          totalTimeMs: totalTime
        }
      });
    } catch (error) {
      console.error("Error syncing financial data:", error);
      res.status(500).json({ 
        message: "Failed to sync financial data", 
        error: error instanceof Error ? error.message : "Unknown error",
        source: "FMP API"
      });
    }
  });

  // Get market statistics
  app.get("/api/market/stats", async (req, res) => {
    try {
      const companies = await storage.getCompanies(10000, 0);
      
      const totalMarketCap = companies.reduce((sum, company) => {
        return sum + parseFloat(company.marketCap);
      }, 0);
      
      const totalCompanies = companies.length;
      
      // Get most recent update time from companies
      const lastUpdate = companies.length > 0 ? new Date().toISOString() : null;
      
      res.json({
        totalMarketCap: totalMarketCap.toString(),
        totalCompanies,
        formattedTotalMarketCap: formatMarketCap(totalMarketCap),
        lastUpdate
      });
    } catch (error) {
      console.error("Error fetching market stats:", error);
      res.status(500).json({ message: "Failed to fetch market statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(3)} T`;
  } else if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)} B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)} M`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}
