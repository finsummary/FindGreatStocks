import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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

      const companies = await storage.getCompanies(limit, offset, sortBy, sortOrder, search, country);
      const total = await storage.getCompanyCount(search, country);

      res.json({
        companies,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
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

  // Get market statistics
  app.get("/api/market/stats", async (req, res) => {
    try {
      const companies = await storage.getCompanies(10000, 0);
      
      const totalMarketCap = companies.reduce((sum, company) => {
        return sum + parseFloat(company.marketCap);
      }, 0);
      
      const totalCompanies = companies.length;
      
      res.json({
        totalMarketCap: totalMarketCap.toString(),
        totalCompanies,
        formattedTotalMarketCap: formatMarketCap(totalMarketCap)
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
