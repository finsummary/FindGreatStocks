import { Express, Request, Response, NextFunction } from 'express';
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { financialDataService } from "./financial-data";
import { createIsAuthenticatedMiddleware } from "./authMiddleware";
import { z } from "zod";
import { db } from "./db";
import { companies, nasdaq100Companies, ftse100Companies, watchlist } from "@shared/schema";
import { eq, sql, desc, asc, and, or, ilike } from "drizzle-orm";
import { dataScheduler } from "./scheduler";
import { getCompanies, getCompanyCount, getNasdaq100Companies, getNasdaq100CompanyCount } from './storage';
import { z } from 'zod';
import { SupabaseClient } from "@supabase/supabase-js";
import { type SupabaseClient } from '@supabase/supabase-js';
import { authFetch } from '@/lib/authFetch';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import express from 'express';
import { isAuthenticated, User } from './authMiddleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

export function setupStripeWebhook(app: Express) {
  // Stripe Webhook Handler
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      console.error('Webhook signature verification failed.', err);
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;

      if (userId) {
        console.log(`Payment successful for user ${userId}. Updating subscription tier.`);
        try {
          await db
            .update(users)
            .set({ subscriptionTier: 'paid' })
            .where(eq(users.id, userId));
          console.log(`User ${userId} subscription tier updated to 'paid'.`);
        } catch (dbError) {
          console.error(`Failed to update subscription for user ${userId}:`, dbError);
        }
      }
    }

    res.json({ received: true });
  });
}

export function setupRoutes(app: Express, supabase: SupabaseClient) {
  const isAuthenticated = createIsAuthenticatedMiddleware(supabase);

  app.get('/api/auth/me', isAuthenticated, (req: any, res) => {
    res.json(req.user);
  });

  // Auth middleware
  // await setupAuth(app);

  // Auth routes
  /* app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  }); */

  // Nasdaq 100 routes
  app.get('/api/nasdaq100', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const sortBy = (req.query.sortBy as string) || 'marketCap';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const search = req.query.search as string;
      
      const companies = await storage.getNasdaq100Companies(
        limit,
        offset,
        sortBy,
        sortOrder,
        search
      );
      
      const totalCount = await storage.getNasdaq100CompanyCount(search);
      
      res.json({
        companies,
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      });
    } catch (error) {
      console.error('Error fetching Nasdaq 100 companies:', error);
      res.status(500).json({ message: 'Failed to fetch companies' });
    }
  });

  app.get('/api/dowjones', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const sortBy = (req.query.sortBy as string) || 'marketCap';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const search = req.query.search as string;
      
      const companies = await storage.getDowJonesCompanies(
        limit,
        offset,
        sortBy,
        sortOrder,
        search
      );
      
      const totalCount = await storage.getDowJonesCompanyCount(search);
      
      res.json({
        companies,
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      });
    } catch (error) {
      console.error('Error fetching Dow Jones companies:', error);
      res.status(500).json({ message: 'Failed to fetch companies' });
    }
  });

  app.get('/api/nasdaq100/:symbol', async (req, res) => {
    try {
      const company = await storage.getNasdaq100CompanyBySymbol(req.params.symbol);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      res.json(company);
    } catch (error) {
      console.error('Error fetching company:', error);
      res.status(500).json({ message: 'Failed to fetch company' });
    }
  });

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
      
      const totalCount = await storage.getCompanyCount(search, country);

      res.json({
        companies: companies,
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      });
    } catch (error) {
      console.error("========================================");
      console.error("FATAL: Error in /api/companies endpoint!");
      console.error("Timestamp:", new Date().toISOString());
      console.error(error);
      console.error("========================================");
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Get update status and schedule info (must come before individual company route)
  app.get("/api/companies/update-status", async (req, res) => {
    try {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const isMarketOpen = utcHour >= 2 && utcHour < 21;
      
      // Calculate next update time (after 21:00 UTC)
      const nextUpdate = new Date();
      if (utcHour >= 21) {
        nextUpdate.setUTCDate(nextUpdate.getUTCDate() + 1);
      }
      nextUpdate.setUTCHours(21, 0, 0, 0);

      res.json({
        currentTime: now.toISOString(),
        marketStatus: isMarketOpen ? "open" : "closed",
        nextScheduledUpdate: nextUpdate.toISOString(),
        updateWindow: "Daily between 21:00-02:00 UTC (4:00-9:00 PM ET)",
        timezone: "Updates occur after US market close (4:00 PM ET)"
      });
    } catch (error) {
      console.error("Error getting update status:", error);
      res.status(500).json({
        message: "Failed to get update status",
        error: error instanceof Error ? error.message : "Unknown error"
      });
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

  // Add comprehensive income statement data for companies
  app.post("/api/companies/enhance-financials", async (req, res) => {
    try {
      const { incomeStatementEnhancer } = await import('./income-statement-enhancer');
      const symbols = req.body.symbols || [];
      
      if (symbols.length === 0) {
        return res.status(400).json({ message: "No symbols provided" });
      }
      
      console.log(`Enhancing income statement data for: ${symbols.join(', ')}`);
      
      // Get existing company data
      const existingCompanies = new Map();
      for (const symbol of symbols) {
        const company = await storage.getCompanyBySymbol(symbol);
        if (company) {
          existingCompanies.set(symbol, company);
        }
      }
      
      // Enhance with income statement data
      const enhancements = await incomeStatementEnhancer.batchEnhanceCompanies(symbols, existingCompanies);
      
      let enhanced = 0;
      for (const [symbol, enhancement] of enhancements.entries()) {
        if (Object.keys(enhancement).length > 0) {
          await storage.updateCompany(symbol, enhancement);
          enhanced++;
        }
      }
      
      res.json({ 
        message: `Enhanced ${enhanced} companies with income statement data`,
        symbols: symbols,
        enhanced: enhanced,
        details: Array.from(enhancements.entries()).map(([symbol, data]) => ({
          symbol,
          hasRevenue: !!data.revenue,
          revenue: data.revenue ? `$${(data.revenue / 1e9).toFixed(1)}B` : null,
          netIncome: data.netIncome ? `$${(data.netIncome / 1e9).toFixed(1)}B` : null
        }))
      });
    } catch (error) {
      console.error("Error enhancing financial data:", error);
      res.status(500).json({ 
        message: "Failed to enhance financial data", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Manual daily price update endpoint
  app.post("/api/companies/update-prices", async (req, res) => {
    try {
      console.log("🔄 Manual S&P 500 price update requested...");
      const { dailyPriceUpdater } = await import('./daily-price-updater');
      const result = await dailyPriceUpdater.updateAllPrices();
      
      res.json({
        message: "S&P 500 prices updated successfully",
        updated: result.updated,
        errors: result.errors,
        timestamp: new Date().toISOString(),
        details: {
          totalCompanies: result.updated + result.errors,
          successRate: `${((result.updated / (result.updated + result.errors)) * 100).toFixed(1)}%`
        }
      });
    } catch (error) {
      console.error("Error updating S&P 500 prices:", error);
      res.status(500).json({
        message: "Failed to update S&P 500 prices",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Manual Nasdaq 100 price update endpoint
  app.post("/api/nasdaq100/update-prices", async (req, res) => {
    try {
      console.log("🔄 Manual Nasdaq 100 price update requested...");
      const { updateNasdaq100Prices } = await import('./nasdaq100-daily-updater');
      const result = await updateNasdaq100Prices();
      
      res.json({
        message: "Nasdaq 100 prices updated successfully",
        updated: result.updated,
        failed: result.failed,
        timestamp: new Date().toISOString(),
        details: {
          totalCompanies: result.updated + result.failed,
          successRate: `${((result.updated / (result.updated + result.failed)) * 100).toFixed(1)}%`,
          duration: `${result.duration}s`
        }
      });
    } catch (error) {
      console.error("Error updating Nasdaq 100 prices:", error);
      res.status(500).json({
        message: "Failed to update Nasdaq 100 prices",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Manual FTSE 100 price update endpoint
  app.post("/api/ftse100/update-prices", async (req, res) => {
    try {
      console.log("🔄 Manual FTSE 100 price update requested...");
      const { updateFTSE100Prices } = await import('./ftse100-daily-updater');
      const result = await updateFTSE100Prices();
      
      res.json({
        message: "FTSE 100 prices updated successfully",
        updated: result.updated,
        failed: result.failed,
        timestamp: new Date().toISOString(),
        details: {
          totalCompanies: result.updated + result.failed,
          successRate: `${((result.updated / (result.updated + result.failed)) * 100).toFixed(1)}%`,
          duration: `${result.duration}s`
        }
      });
    } catch (error) {
      console.error("Error updating FTSE 100 prices:", error);
      res.status(500).json({
        message: "Failed to update FTSE 100 prices",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // FTSE 100 import endpoint
  app.post("/api/ftse100/import", async (req, res) => {
    try {
      console.log("🚀 FTSE 100 import requested...");
      const { importFTSE100Companies } = await import('./ftse100-import');
      
      // Run in background
      importFTSE100Companies().then((result) => {
        console.log(`✅ FTSE 100 import completed: ${result.imported} imported, ${result.failed} failed`);
      }).catch(error => {
        console.error("❌ FTSE 100 import failed:", error);
      });
      
      res.json({
        message: "FTSE 100 import started in background",
        status: "running",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error starting FTSE 100 import:", error);
      res.status(500).json({
        message: "Failed to start FTSE 100 import",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // FTSE 100 data enhancement endpoint
  app.post("/api/ftse100/enhance", async (req, res) => {
    try {
      console.log("🔧 FTSE 100 data enhancement requested...");
      const { enhanceFTSE100Data } = await import('./ftse100-data-enhancer');
      
      // Run in background
      enhanceFTSE100Data().then((result) => {
        console.log(`✅ FTSE 100 enhancement completed: ${result.enhanced} enhanced, ${result.failed} failed`);
      }).catch(error => {
        console.error("❌ FTSE 100 enhancement failed:", error);
      });
      
      res.json({
        message: "FTSE 100 data enhancement started in background",
        status: "running",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error starting FTSE 100 enhancement:", error);
      res.status(500).json({
        message: "Failed to start FTSE 100 enhancement",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });



  // Enhance financial data endpoint
  app.post("/api/companies/enhance-financial-data", async (req, res) => {
    try {
      console.log("🏦 Financial data enhancement requested...");
      const { financialDataEnhancer } = await import('./financial-data-enhancer');
      
      // Run in background
      financialDataEnhancer.enhanceAllCompaniesFinancialData().then((result) => {
        console.log(`✅ Financial data enhancement completed: ${result.updated} updated, ${result.errors} errors`);
      }).catch(error => {
        console.error("❌ Financial data enhancement failed:", error);
      });
      
      res.json({
        message: "Financial data enhancement started in background",
        status: "running",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error starting financial data enhancement:", error);
      res.status(500).json({
        message: "Failed to start financial data enhancement",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Enhance returns data endpoint
  app.post("/api/companies/enhance-returns", async (req, res) => {
    try {
      console.log("📈 Returns enhancement requested...");
      const { returnsEnhancer } = await import('./returns-enhancer');
      
      // Run in background
      returnsEnhancer.enhanceAllCompaniesReturns().then((result) => {
        console.log(`✅ Returns enhancement completed: ${result.updated} updated, ${result.errors} errors`);
      }).catch(error => {
        console.error("❌ Returns enhancement failed:", error);
      });
      
      res.json({
        message: "Returns enhancement started in background",
        status: "running",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error starting returns enhancement:", error);
      res.status(500).json({
        message: "Failed to start returns enhancement",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Enhance drawdown data endpoint
  app.post("/api/companies/enhance-drawdown", async (req, res) => {
    try {
      console.log("📉 Drawdown enhancement requested...");
      const { drawdownEnhancer } = await import('./drawdown-enhancer');
      
      // Run in background
      drawdownEnhancer.enhanceAllCompaniesDrawdown().then((result) => {
        console.log(`✅ Drawdown enhancement completed: ${result.updated} updated, ${result.errors} errors`);
      }).catch(error => {
        console.error("❌ Drawdown enhancement failed:", error);
      });
      
      res.json({
        message: "Maximum drawdown enhancement started in background",
        status: "running",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error starting drawdown enhancement:", error);
      res.status(500).json({
        message: "Failed to start drawdown enhancement",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Complete S&P 500 import endpoint (ALL companies)
  app.post("/api/import/sp500-complete", async (req, res) => {
    try {
      console.log("🚀 Complete S&P 500 import requested (ALL companies)...");
      const { completeSP500Importer } = await import('./complete-sp500-import');
      
      // Run in background
      completeSP500Importer.importAllSP500Companies().then((result) => {
        console.log(`✅ Complete S&P 500 import finished: ${result.success}/${result.total} companies`);
      }).catch(error => {
        console.error("❌ Complete S&P 500 import failed:", error);
      });
      
      res.json({
        message: "Complete S&P 500 import started in background (importing ALL companies)",
        status: "running",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error starting complete S&P 500 import:", error);
      res.status(500).json({
        message: "Failed to start complete S&P 500 import",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Full S&P 500 import endpoint
  app.post("/api/import/sp500-full", async (req, res) => {
    try {
      console.log("🚀 Full S&P 500 import requested...");
      const { importAllSP500 } = await import('./full-sp500-import');
      
      // Run in background
      importAllSP500().then(() => {
        console.log("✅ Full S&P 500 import completed in background");
      }).catch(error => {
        console.error("❌ Full S&P 500 import failed:", error);
      });
      
      res.json({
        message: "Full S&P 500 import started in background",
        status: "running",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error starting full S&P 500 import:", error);
      res.status(500).json({
        message: "Failed to start full S&P 500 import",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // S&P 500 Scanner Routes
  app.post("/api/scan/sp500", async (req, res) => {
    try {
      const { sp500Scanner } = await import('./sp500-scanner');
      const limit = parseInt(req.query.limit as string) || 500;
      
      console.log(`Starting S&P 500 scan for ${limit === 500 ? 'all' : limit} companies...`);
      
      const result = limit === 500 ? 
        await sp500Scanner.scanAndImportSP500() :
        await sp500Scanner.quickScan(limit);
      
      res.json({
        message: `S&P 500 scan complete`,
        ...result,
        details: {
          successRate: `${((result.success / result.total) * 100).toFixed(1)}%`,
          source: "S&P 500 constituents from Financial Modeling Prep",
          dataIncluded: ["Market Cap", "Stock Price", "Revenue", "Net Income", "Company Profiles"]
        }
      });
    } catch (error) {
      console.error("Error in S&P 500 scan:", error);
      res.status(500).json({ 
        message: "Failed to scan S&P 500", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/scan/sp500/preview", async (req, res) => {
    try {
      const { sp500Scanner } = await import('./sp500-scanner');
      const constituents = await sp500Scanner.getSP500Constituents();
      
      res.json({
        message: `Found ${constituents.length} S&P 500 companies`,
        total: constituents.length,
        preview: constituents.slice(0, 10).map(c => ({ 
          symbol: c.symbol, 
          name: c.name, 
          sector: c.sector 
        })),
        sectors: [...new Set(constituents.map(c => c.sector))].sort()
      });
    } catch (error) {
      console.error("Error previewing S&P 500:", error);
      res.status(500).json({ 
        message: "Failed to preview S&P 500", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Bulk enhance all top companies with income statement data
  app.post("/api/companies/enhance-all-financials", async (req, res) => {
    try {
      const { incomeStatementEnhancer } = await import('./income-statement-enhancer');
      const limit = parseInt(req.query.limit as string) || 50;
      
      console.log(`Starting bulk income statement enhancement for top ${limit} companies...`);
      
      // Get top companies by market cap
      const topCompanies = await storage.getCompanies(limit, 0);
      const symbols = topCompanies.map(c => c.symbol);
      
      const existingCompanies = new Map();
      topCompanies.forEach(company => {
        existingCompanies.set(company.symbol, company);
      });
      
      // Enhance in batches
      const batchSize = 10;
      let totalEnhanced = 0;
      
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}: ${batch.join(', ')}`);
        
        const enhancements = await incomeStatementEnhancer.batchEnhanceCompanies(batch, existingCompanies);
        
        for (const [symbol, enhancement] of enhancements.entries()) {
          if (Object.keys(enhancement).length > 0) {
            await storage.updateCompany(symbol, enhancement);
            totalEnhanced++;
          }
        }
        
        // Pause between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      res.json({ 
        message: `Bulk enhanced ${totalEnhanced} companies with income statement data`,
        totalProcessed: symbols.length,
        enhanced: totalEnhanced,
        batchSize: batchSize
      });
    } catch (error) {
      console.error("Error in bulk financial enhancement:", error);
      res.status(500).json({ 
        message: "Failed to bulk enhance financial data", 
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

  // Protected watchlist endpoints - require authentication
  app.get('/api/watchlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id; // Get user ID from Supabase user object
      const watchlistItems = await storage.getWatchlist(userId);
      res.json(watchlistItems);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ message: "Failed to fetch watchlist" });
    }
  });

  app.get('/api/watchlist/companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const companies = await storage.getWatchlistCompanies(userId);
      res.json(companies);
    } catch (error) {
      console.error("Error fetching watchlist companies:", error);
      res.status(500).json({ message: "Failed to fetch watchlist companies" });
    }
  });

  app.post('/api/watchlist', isAuthenticated, async (req: any, res) => {
    console.log('[/api/watchlist POST] Received request');
    try {
      const { companySymbol } = req.body;
      const userId = req.user?.id;
      
      console.log(`[/api/watchlist POST] User ID: ${userId}, Symbol: ${companySymbol}`);

      if (!userId) {
        console.error('[/api/watchlist POST] Error: User ID is missing from request.');
        return res.status(401).json({ message: "Authentication error: User ID not found." });
      }
      
      if (!companySymbol) {
        console.error('[/api/watchlist POST] Error: Company symbol is missing.');
        return res.status(400).json({ message: "Company symbol is required" });
      }

      console.log(`[/api/watchlist POST] Calling storage.addToWatchlist for user ${userId}`);
      const watchlistItem = await storage.addToWatchlist(companySymbol, userId);
      console.log(`[/api/watchlist POST] Successfully added to watchlist. Item ID: ${watchlistItem?.id}`);
      res.json(watchlistItem);
    } catch (error) {
      console.error("!!! FATAL ERROR in [/api/watchlist POST]:", error);
      res.status(500).json({ message: "Failed to add to watchlist" });
    }
  });

  app.delete('/api/watchlist/:symbol', isAuthenticated, async (req: any, res) => {
    try {
      const { symbol } = req.params;
      const userId = req.user.id; // Get user ID from Supabase user object
      
      await storage.removeFromWatchlist(symbol, userId);
      res.json({ message: "Removed from watchlist" });
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });

  app.get('/api/watchlist/check/:symbol', isAuthenticated, async (req: any, res) => {
    try {
      const { symbol } = req.params;
      const userId = req.user.id; // Get user ID from Supabase user object
      
      const isInWatchlist = await storage.isInWatchlist(symbol, userId);
      res.json({ isInWatchlist });
    } catch (error) {
      console.error("Error checking watchlist:", error);
      res.status(500).json({ message: "Failed to check watchlist" });
    }
  });

  // Stripe Checkout Session Route
  app.post('/api/stripe/create-checkout-session', isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const { priceId } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: { message: 'Price ID is required' } });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.CLIENT_URL}/payment-success`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
        metadata: {
          userId: user.id,
        },
      });

      res.json({ sessionId: session.id });
    } catch (error) {
      console.error('Error creating Stripe session:', error);
      res.status(500).json({ error: { message: 'Failed to create checkout session' } });
    }
  });

  // Stripe Webhook Handler
  // app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  //   const sig = req.headers['stripe-signature'];
  //   let event;

  //   try {
  //     event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  //   } catch (err) {
  //     console.error('Webhook signature verification failed.', err);
  //     return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  //   }

  //   // Handle the event
  //   if (event.type === 'checkout.session.completed') {
  //     const session = event.data.object as Stripe.Checkout.Session;
  //     const userId = session.metadata?.userId;

  //     if (userId) {
  //       console.log(`Payment successful for user ${userId}. Updating subscription tier.`);
  //       try {
  //         await db
  //           .update(users)
  //           .set({ subscriptionTier: 'paid' })
  //           .where(eq(users.id, userId));
  //         console.log(`User ${userId} subscription tier updated to 'paid'.`);
  //       } catch (dbError) {
  //         console.error(`Failed to update subscription for user ${userId}:`, dbError);
  //       }
  //     }
  //   }

  //   res.json({ received: true });
  // });
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
