import { Router } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./authMiddleware";

export const newRouter = Router();

// Middleware to parse and sanitize query parameters
const parseQueryParams = (req, res, next) => {
  req.query.limit = parseInt(req.query.limit as string, 10) || 50;
  req.query.offset = parseInt(req.query.offset as string, 10) || 0;
  req.query.sortBy = (req.query.sortBy as string) || 'marketCap';
  req.query.sortOrder = (req.query.sortOrder as 'asc' | 'desc') === 'asc' ? 'asc' : 'desc';
  req.query.search = (req.query.search as string) || '';
  next();
};

newRouter.get("/api/companies", parseQueryParams, async (req, res) => {
  try {
    const { limit, offset, sortBy, sortOrder, search } = req.query;
    const companies = await storage.getCompanies(limit, offset, sortBy, sortOrder, search);
    const total = await storage.getCompanyCount(search);
    res.json({ companies, total, hasMore: offset + limit < total });
  } catch (error) {
    console.error("Error fetching S&P 500 companies:", error);
    res.status(500).send("Failed to fetch S&P 500 company data.");
  }
});

newRouter.get("/api/nasdaq100", parseQueryParams, async (req, res) => {
  try {
    const { limit, offset, sortBy, sortOrder, search } = req.query;
    const companies = await storage.getNasdaq100Companies(limit, offset, sortBy, sortOrder, search);
    const total = await storage.getNasdaq100CompanyCount(search);
    res.json({ companies, total, hasMore: offset + limit < total });
  } catch (error) {
    console.error("Error fetching Nasdaq 100 companies:", error);
    res.status(500).send("Failed to fetch Nasdaq 100 company data.");
  }
});

// Protected watchlist endpoints
newRouter.get('/api/watchlist', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const watchlistItems = await storage.getWatchlist(userId);
    res.json(watchlistItems);
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    res.status(500).json({ message: "Failed to fetch watchlist" });
  }
});

newRouter.post('/api/watchlist', isAuthenticated, async (req: any, res) => {
  try {
    const { companySymbol } = req.body;
    const userId = req.user.id;
    if (!companySymbol) {
      return res.status(400).json({ message: "Company symbol is required" });
    }
    const watchlistItem = await storage.addToWatchlist(companySymbol, userId);
    res.json(watchlistItem);
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    res.status(500).json({ message: "Failed to add to watchlist" });
  }
});

newRouter.delete('/api/watchlist/:symbol', isAuthenticated, async (req: any, res) => {
  try {
    const { symbol } = req.params;
    const userId = req.user.id;
    await storage.removeFromWatchlist(symbol, userId);
    res.json({ message: "Removed from watchlist" });
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    res.status(500).json({ message: "Failed to remove from watchlist" });
  }
});
