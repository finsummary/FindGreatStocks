import express from 'express';
import Stripe from 'stripe';

export function setupStripeWebhook(app) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Fallback dummy endpoint to avoid 404 if webhook not configured
    app.post('/api/stripe/webhook', express.json(), (_req, res) => res.json({ received: true }));
    return;
  }
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
      stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      return res.json({ received: true });
    } catch (e) {
      console.error('Stripe webhook error', e);
      return res.status(400).send(`Webhook Error: ${e.message}`);
    }
  });
}

function createAuthMiddleware(supabase) {
  return async function isAuthenticated(req, res, next) {
    try {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
      if (!token) return res.status(401).json({ message: 'Unauthorized' });
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) return res.status(401).json({ message: 'Unauthorized' });
      req.user = data.user;
      next();
    } catch (e) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
}

function mapDbRowToCompany(row) {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    marketCap: row.market_cap,
    price: row.price,
    dailyChange: row.daily_change,
    dailyChangePercent: row.daily_change_percent,
    country: row.country,
    rank: row.rank,
    logoUrl: row.logo_url,
    peRatio: row.pe_ratio,
    eps: row.eps,
    dividendYield: row.dividend_yield,
    priceToSalesRatio: row.price_to_sales_ratio,
    netProfitMargin: row.net_profit_margin,
    revenueGrowth3Y: row.revenue_growth_3y,
    revenueGrowth5Y: row.revenue_growth_5y,
    revenueGrowth10Y: row.revenue_growth_10y,
    revenue: row.revenue,
    netIncome: row.net_income,
    freeCashFlow: row.free_cash_flow,
    return3Year: row.return_3_year,
    return5Year: row.return_5_year,
    return10Year: row.return_10_year,
    maxDrawdown3Year: row.max_drawdown_3_year,
    maxDrawdown5Year: row.max_drawdown_5_year,
    maxDrawdown10Year: row.max_drawdown_10_year,
    arMddRatio3Year: row.ar_mdd_ratio_3_year,
    arMddRatio5Year: row.ar_mdd_ratio_5_year,
    arMddRatio10Year: row.ar_mdd_ratio_10_year,
    dcfEnterpriseValue: row.dcf_enterprise_value,
    marginOfSafety: row.margin_of_safety,
    dcfImpliedGrowth: row.dcf_implied_growth,
    assetTurnover: row.asset_turnover,
    financialLeverage: row.financial_leverage,
    roe: row.roe,
  };
}

export function setupRoutes(app, supabase) {
  const isAuthenticated = createAuthMiddleware(supabase);

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.get('/api/auth/me', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const { data: dbUser, error } = await supabase.from('users').select('*').eq('id', userId).single();
      if (error && error.code !== 'PGRST116') {
        console.error('Supabase users read error:', error);
        return res.status(500).json({ message: 'Failed to fetch user profile' });
      }
      if (!dbUser) {
        const { error: insertError } = await supabase.from('users').insert({ id: userId, email: req.user.email || null, subscription_tier: 'free', updated_at: new Date().toISOString() });
        if (insertError) return res.status(500).json({ message: 'Failed to create user profile' });
        return res.json({ id: userId, email: req.user.email || null, subscriptionTier: 'free' });
      }
      return res.json({ ...dbUser, subscriptionTier: dbUser.subscription_tier || 'free', updatedAt: dbUser.updated_at });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  });

  const sortMap = {
    rank: 'rank',
    name: 'name',
    marketCap: 'market_cap',
    price: 'price',
    revenue: 'revenue',
    netIncome: 'net_income',
    peRatio: 'pe_ratio',
    dividendYield: 'dividend_yield',
    freeCashFlow: 'free_cash_flow',
    revenueGrowth10Y: 'revenue_growth_10y',
    return3Year: 'return_3_year',
    return5Year: 'return_5_year',
    return10Year: 'return_10_year',
    maxDrawdown3Year: 'max_drawdown_3_year',
    maxDrawdown5Year: 'max_drawdown_5_year',
    maxDrawdown10Year: 'max_drawdown_10_year',
  };

  async function listCompanies(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const sortBy = req.query.sortBy || 'marketCap';
      const sortOrder = (req.query.sortOrder || 'desc') === 'asc';
      const search = (req.query.search || '').trim();
      const orderCol = sortMap[sortBy] || 'market_cap';

      let query = supabase
        .from('companies')
        .select('*', { count: 'exact' })
        .order(orderCol, { ascending: sortOrder, nullsFirst: false })
        .range(offset, offset + limit - 1);
      if (search) {
        query = query.or(`name.ilike.%${search}%,symbol.ilike.%${search}%`);
      }
      const { data, count, error } = await query;
      if (error) {
        console.error('Supabase error in listCompanies:', error);
        return res.status(500).json({ message: 'Failed to fetch companies' });
      }

      // Fallback enrichment: if price/market_cap are missing or zero in companies,
      // try to pull them from index-specific tables to avoid empty columns.
      const rows = Array.isArray(data) ? data : [];
      const symbols = rows.map(r => r.symbol).filter(Boolean);
      if (symbols.length) {
        const selectCols = 'symbol, price, market_cap, pe_ratio, price_to_sales_ratio, dividend_yield, return_3_year, return_5_year, return_10_year, max_drawdown_3_year, max_drawdown_5_year, max_drawdown_10_year, dcf_enterprise_value, margin_of_safety, dcf_implied_growth';
        const [sp500, ndx, dji] = await Promise.all([
          supabase.from('sp500_companies').select(selectCols).in('symbol', symbols),
          supabase.from('nasdaq100_companies').select(selectCols).in('symbol', symbols),
          supabase.from('dow_jones_companies').select(selectCols).in('symbol', symbols),
        ]);
        const fallback = new Map();
        const add = (res) => {
          if (res && Array.isArray(res.data)) {
            for (const r of res.data) {
              if (!r || !r.symbol) continue;
              fallback.set(r.symbol, { 
                price: r.price, 
                marketCap: r.market_cap,
                peRatio: r.pe_ratio,
                priceToSalesRatio: r.price_to_sales_ratio,
                dividendYield: r.dividend_yield,
                return3Year: r.return_3_year,
                return5Year: r.return_5_year,
                return10Year: r.return_10_year,
                maxDrawdown3Year: r.max_drawdown_3_year,
                maxDrawdown5Year: r.max_drawdown_5_year,
                maxDrawdown10Year: r.max_drawdown_10_year,
                dcfEnterpriseValue: r.dcf_enterprise_value,
                marginOfSafety: r.margin_of_safety,
                dcfImpliedGrowth: r.dcf_implied_growth,
              });
            }
          }
        };
        add(sp500);
        add(ndx);
        add(dji);

        for (const r of rows) {
          const fb = fallback.get(r.symbol);
          if (!fb) continue;
          const priceMissing = (r.price === null || r.price === undefined || Number(r.price) === 0);
          const mcapMissing = (r.market_cap === null || r.market_cap === undefined || Number(r.market_cap) === 0);
          if (priceMissing && fb.price !== null && fb.price !== undefined) r.price = fb.price;
          if (mcapMissing && fb.marketCap !== null && fb.marketCap !== undefined) r.market_cap = fb.marketCap;
          if ((r.pe_ratio === null || r.pe_ratio === undefined) && fb.peRatio !== null && fb.peRatio !== undefined) r.pe_ratio = fb.peRatio;
          if ((r.price_to_sales_ratio === null || r.price_to_sales_ratio === undefined || Number(r.price_to_sales_ratio) === 0)) {
            if (fb.priceToSalesRatio !== null && fb.priceToSalesRatio !== undefined && Number(fb.priceToSalesRatio) !== 0) {
              r.price_to_sales_ratio = fb.priceToSalesRatio;
            } else {
              // Compute fallback P/S = marketCap / revenue if both available
              const mcap = Number(r.market_cap);
              const rev = Number(r.revenue);
              if (isFinite(mcap) && isFinite(rev) && rev > 0) {
                r.price_to_sales_ratio = mcap / rev;
              }
            }
          }
          if ((r.dividend_yield === null || r.dividend_yield === undefined) && fb.dividendYield !== null && fb.dividendYield !== undefined) r.dividend_yield = fb.dividendYield;

          // Returns fallback
          if (r.return_3_year == null && fb.return3Year != null) r.return_3_year = fb.return3Year;
          if (r.return_5_year == null && fb.return5Year != null) r.return_5_year = fb.return5Year;
          if (r.return_10_year == null && fb.return10Year != null) r.return_10_year = fb.return10Year;

          // Drawdowns fallback
          if (r.max_drawdown_3_year == null && fb.maxDrawdown3Year != null) r.max_drawdown_3_year = fb.maxDrawdown3Year;
          if (r.max_drawdown_5_year == null && fb.maxDrawdown5Year != null) r.max_drawdown_5_year = fb.maxDrawdown5Year;
          if (r.max_drawdown_10_year == null && fb.maxDrawdown10Year != null) r.max_drawdown_10_year = fb.maxDrawdown10Year;

          // AR/MDD ratio compute if missing
          const computeRatio = (ret, mdd) => {
            const retNum = Number(ret);
            const mddNum = Number(mdd);
            if (!isFinite(retNum) || !isFinite(mddNum) || mddNum <= 0) return null;
            return (retNum / 100) / (mddNum / 100);
          };
          if (r.ar_mdd_ratio_3_year == null && r.return_3_year != null && r.max_drawdown_3_year != null) {
            const val = computeRatio(r.return_3_year, r.max_drawdown_3_year);
            if (val != null) r.ar_mdd_ratio_3_year = val;
          }
          if (r.ar_mdd_ratio_5_year == null && r.return_5_year != null && r.max_drawdown_5_year != null) {
            const val = computeRatio(r.return_5_year, r.max_drawdown_5_year);
            if (val != null) r.ar_mdd_ratio_5_year = val;
          }
          if (r.ar_mdd_ratio_10_year == null && r.return_10_year != null && r.max_drawdown_10_year != null) {
            const val = computeRatio(r.return_10_year, r.max_drawdown_10_year);
            if (val != null) r.ar_mdd_ratio_10_year = val;
          }

          // DCF fallback
          if (r.dcf_enterprise_value == null && fb.dcfEnterpriseValue != null) r.dcf_enterprise_value = fb.dcfEnterpriseValue;
          if (r.margin_of_safety == null && fb.marginOfSafety != null) r.margin_of_safety = fb.marginOfSafety;
          if (r.dcf_implied_growth == null && fb.dcfImpliedGrowth != null) r.dcf_implied_growth = fb.dcfImpliedGrowth;
        }
      }

      return res.json({
        companies: rows.map(mapDbRowToCompany),
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0),
      });
    } catch (e) {
      console.error('Error in listCompanies:', e);
      return res.status(500).json({ message: 'Failed to fetch companies' });
    }
  }

  // Use same list for tabs for now (can specialize later)
  app.get('/api/companies', listCompanies);
  app.get('/api/sp500', listCompanies);
  app.get('/api/nasdaq100', listCompanies);
  app.get('/api/dowjones', listCompanies);

  // Enhancement endpoints (run TS modules via tsx loader at call time)
  app.post('/api/companies/enhance-financial-data', async (_req, res) => {
    try {
      await import('tsx/esm');
      import('./financial-data-enhancer.ts')
        .then(mod => mod.financialDataEnhancer.enhanceAllCompaniesFinancialData())
        .catch(e => console.error('enhance-financial-data async error:', e));
      return res.json({ status: 'started' });
    } catch (e) {
      console.error('enhance-financial-data error:', e);
      return res.status(500).json({ message: 'Failed to enhance financial data' });
    }
  });

  // Daily price updates
  app.post('/api/sp500/update-prices', async (_req, res) => {
    try {
      await import('tsx/esm');
      import('./sp500-daily-updater.ts')
        .then(mod => mod.updateSp500Prices())
        .catch(e => console.error('sp500 update async error:', e));
      return res.json({ status: 'started' });
    } catch (e) {
      console.error('sp500 update error:', e);
      return res.status(500).json({ message: 'Failed to update S&P 500 prices' });
    }
  });

  app.post('/api/nasdaq100/update-prices', async (_req, res) => {
    try {
      await import('tsx/esm');
      import('./nasdaq100-daily-updater.ts')
        .then(mod => mod.updateNasdaq100Prices())
        .catch(e => console.error('nasdaq100 update async error:', e));
      return res.json({ status: 'started' });
    } catch (e) {
      console.error('nasdaq100 update error:', e);
      return res.status(500).json({ message: 'Failed to update Nasdaq 100 prices' });
    }
  });

  app.post('/api/dowjones/update-prices', async (_req, res) => {
    try {
      await import('tsx/esm');
      import('./dowjones-daily-updater.ts')
        .then(mod => mod.updateDowJonesPrices())
        .catch(e => console.error('dowjones update async error:', e));
      return res.json({ status: 'started' });
    } catch (e) {
      console.error('dowjones update error:', e);
      return res.status(500).json({ message: 'Failed to update Dow Jones prices' });
    }
  });

  // General companies table price update (fills marketCap/price in companies)
  app.post('/api/companies/update-prices', async (_req, res) => {
    try {
      await import('tsx/esm');
      import('./daily-price-updater.ts')
        .then(mod => mod.dailyPriceUpdater.updateAllPrices())
        .catch(e => console.error('companies price update async error:', e));
      return res.json({ status: 'started' });
    } catch (e) {
      console.error('companies price update error:', e);
      return res.status(500).json({ message: 'Failed to start companies price update' });
    }
  });

  app.post('/api/companies/enhance-returns', async (_req, res) => {
    try {
      await import('tsx/esm');
      import('./returns-enhancer.ts')
        .then(mod => mod.returnsEnhancer.enhanceAllCompaniesReturns())
        .catch(e => console.error('enhance-returns async error:', e));
      return res.json({ status: 'started' });
    } catch (e) {
      console.error('enhance-returns error:', e);
      return res.status(500).json({ message: 'Failed to enhance returns' });
    }
  });

  app.post('/api/companies/enhance-drawdown', async (_req, res) => {
    try {
      await import('tsx/esm');
      import('./drawdown-enhancer.ts')
        .then(mod => mod.drawdownEnhancer.enhanceAllCompaniesDrawdown())
        .catch(e => console.error('enhance-drawdown async error:', e));
      return res.json({ status: 'started' });
    } catch (e) {
      console.error('enhance-drawdown error:', e);
      return res.status(500).json({ message: 'Failed to enhance drawdown' });
    }
  });

  // Watchlist endpoints
  app.get('/api/watchlist', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { data, error } = await supabase.from('watchlist').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ message: 'Failed to fetch watchlist' });
      const normalized = (data || []).map(i => ({ id: i.id, companySymbol: i.company_symbol, userId: i.user_id }));
      return res.json(normalized);
    } catch (e) {
      return res.status(500).json({ message: 'Failed to fetch watchlist' });
    }
  });

  app.post('/api/watchlist', isAuthenticated, async (req, res) => {
    try {
      const { companySymbol } = req.body || {};
      const userId = req.user?.id;
      if (!companySymbol) return res.status(400).json({ message: 'Company symbol is required' });
      const { data, error } = await supabase.from('watchlist').insert({ user_id: userId, company_symbol: companySymbol }).select('*').single();
      if (error) console.warn('Insert watchlist error:', error);
      const response = data ? { id: data.id, userId: data.user_id, companySymbol: data.company_symbol } : { userId, companySymbol };
      return res.json(response);
    } catch (e) {
      return res.status(500).json({ message: 'Failed to add to watchlist' });
    }
  });

  app.delete('/api/watchlist/:symbol', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const symbol = req.params.symbol;
      const { error } = await supabase.from('watchlist').delete().match({ user_id: userId, company_symbol: symbol });
      if (error) return res.status(500).json({ message: 'Failed to remove from watchlist' });
      return res.json({ message: 'Removed from watchlist' });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to remove from watchlist' });
    }
  });

  // Stripe checkout (optional)
  app.post('/api/stripe/create-checkout-session', isAuthenticated, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) return res.status(400).json({ error: { message: 'Stripe not configured' } });
      const { priceId } = req.body || {};
      if (!priceId) return res.status(400).json({ error: { message: 'Price ID is required' } });
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
        metadata: { userId: req.user.id, priceId },
      });
      return res.json({ sessionId: session.id });
    } catch (e) {
      console.error('Stripe checkout error:', e);
      return res.status(500).json({ error: { message: 'Failed to create checkout session' } });
    }
  });
}


