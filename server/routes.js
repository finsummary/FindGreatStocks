import express from 'express';
import Stripe from 'stripe';

export function setupStripeWebhook(app, supabase) {
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
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

      const updateUserTier = async ({ userId, email, tier, customerId, subscriptionId }) => {
        const payload = {
          subscription_tier: tier,
          stripe_customer_id: customerId || null,
          stripe_subscription_id: subscriptionId || null,
          updated_at: new Date().toISOString(),
        };
        if (userId) {
          await supabase.from('users').update(payload).eq('id', userId);
        } else if (email) {
          await supabase.from('users').update(payload).eq('email', email);
        }
      };

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const userId = session.metadata?.userId || null;
          const plan = (session.metadata?.plan || '').toString().toLowerCase();
          const customerId = (session.customer && typeof session.customer === 'string') ? session.customer : null;
          const subscriptionId = (session.subscription && typeof session.subscription === 'string') ? session.subscription : null;
          let tier = 'paid';
          if (plan === 'annual') tier = 'annual';
          else if (plan === 'quarterly') tier = 'quarterly';
          // If plan not provided, try to infer from subscription price
          try {
            if (!plan && subscriptionId) {
              const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
              const price = sub?.items?.data?.[0]?.price;
              const nickname = (price?.nickname || '').toString().toLowerCase();
              if (nickname.includes('annual')) tier = 'annual';
              else if (nickname.includes('quarter')) tier = 'quarterly';
            }
          } catch {}
          await updateUserTier({ userId, email: session.customer_details?.email, tier, customerId, subscriptionId });
          break;
        }
        case 'customer.subscription.updated': {
          const sub = event.data.object;
          const status = (sub.status || '').toString();
          const customerId = (sub.customer && typeof sub.customer === 'string') ? sub.customer : null;
          const subscriptionId = (sub.id || null);
          let tier = (status === 'active' || status === 'trialing') ? 'paid' : 'free';
          // try to map plan from price nickname
          try {
            const price = sub?.items?.data?.[0]?.price;
            const nickname = (price?.nickname || '').toString().toLowerCase();
            if (nickname.includes('annual')) tier = (status === 'active' || status === 'trialing') ? 'annual' : 'free';
            else if (nickname.includes('quarter')) tier = (status === 'active' || status === 'trialing') ? 'quarterly' : 'free';
          } catch {}
          // try find user by stripe_customer_id
          try {
            const { data } = await supabase.from('users').select('id,email').eq('stripe_customer_id', customerId).limit(1);
            const user = Array.isArray(data) && data[0];
            await updateUserTier({ userId: user?.id || null, email: user?.email || null, tier, customerId, subscriptionId });
          } catch {}
          break;
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          const customerId = (sub.customer && typeof sub.customer === 'string') ? sub.customer : null;
          try {
            const { data } = await supabase.from('users').select('id,email').eq('stripe_customer_id', customerId).limit(1);
            const user = Array.isArray(data) && data[0];
            await updateUserTier({ userId: user?.id || null, email: user?.email || null, tier: 'free', customerId, subscriptionId: null });
          } catch {}
          break;
        }
        case 'invoice.payment_failed': {
          const inv = event.data.object;
          const customerId = (inv.customer && typeof inv.customer === 'string') ? inv.customer : null;
          try {
            const { data } = await supabase.from('users').select('id,email').eq('stripe_customer_id', customerId).limit(1);
            const user = Array.isArray(data) && data[0];
            await updateUserTier({ userId: user?.id || null, email: user?.email || null, tier: 'free', customerId, subscriptionId: inv.subscription || null });
          } catch {}
          break;
        }
        default:
          break;
      }
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

function normalizeCompanyName(name, website) {
  try {
    let n = (name || '').toString().trim();
    if (!n) return n;
    // Strip website host if accidentally concatenated into name
    if (website) {
      try {
        const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
        const host = url.hostname.replace(/^www\./i, '');
        if (host) {
          const hostRe = new RegExp(host.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'ig');
          n = n.replace(hostRe, '').trim();
        }
      } catch {}
    }
    // Fix punctuation around suffixes and remove trailing domain if concatenated
    n = n
      .replace(/,\s*Inc\.?\b/gi, ' Inc.')
      .replace(/,\s*Corp\.?\b/gi, ' Corp')
      .replace(/,\s*Corporation\b/gi, ' Corporation')
      .replace(/,\s*Ltd\.?\b/gi, ' Ltd')
      .replace(/,\s*PLC\b/gi, ' PLC')
      .replace(/,\s*LLC\b/gi, ' LLC');
    n = n.replace(/\bInc\b(?!\.)/g, 'Inc.');
    // Trim any domain accidentally appended after suffix, e.g. "Inc.amazon.com"
    n = n.replace(/(Inc\.|Corp|Corporation|Ltd|PLC|LLC)\s*[a-z0-9.-]+\.(?:com|net|org|io|co|ai)\s*$/i, '$1');
    // Collapse duplicate dot spacing and spaces
    n = n.replace(/\s*\.\s*/g, '. ').replace(/\s{2,}/g, ' ').trim();
    // Remove trailing dot left from cleanup
    n = n.replace(/\.$/, '');
    return n;
  } catch {
    return name;
  }
}

function mapDbRowToCompany(row) {
  // Special-case cleanup for known anomalies
  let fixedName = normalizeCompanyName(row.name, row.website);
  if (row.symbol === 'AMZN') {
    // Force correct canonical form for Amazon if any residue remains
    fixedName = 'Amazon.com Inc.';
  }
  return {
    id: row.id,
    name: fixedName,
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
    priceToSalesRatio: 'price_to_sales_ratio',
    netProfitMargin: 'net_profit_margin',
    revenueGrowth3Y: 'revenue_growth_3y',
    revenueGrowth5Y: 'revenue_growth_5y',
    revenueGrowth10Y: 'revenue_growth_10y',
    return3Year: 'return_3_year',
    return5Year: 'return_5_year',
    return10Year: 'return_10_year',
    maxDrawdown3Year: 'max_drawdown_3_year',
    maxDrawdown5Year: 'max_drawdown_5_year',
    maxDrawdown10Year: 'max_drawdown_10_year',
    arMddRatio3Year: 'ar_mdd_ratio_3_year',
    arMddRatio5Year: 'ar_mdd_ratio_5_year',
    arMddRatio10Year: 'ar_mdd_ratio_10_year',
    dcfEnterpriseValue: 'dcf_enterprise_value',
    marginOfSafety: 'margin_of_safety',
    dcfImpliedGrowth: 'dcf_implied_growth',
    assetTurnover: 'asset_turnover',
    financialLeverage: 'financial_leverage',
    roe: 'roe',
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

          // Guard: clamp unrealistic DCF vs MarketCap
          const mcapNum = Number(r.market_cap);
          const dcfNum = Number(r.dcf_enterprise_value);
          if (isFinite(mcapNum) && mcapNum > 0 && isFinite(dcfNum) && dcfNum > 0) {
            const ratio = dcfNum / mcapNum;
            if (ratio > 20) {
              r.dcf_enterprise_value = null;
              r.margin_of_safety = null;
              r.dcf_implied_growth = null;
            }
          }
        }
      }

      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
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

  // Helper: list from a specific table (sp500, nasdaq100, dowjones)
  async function listFromTable(tableName, req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const sortBy = req.query.sortBy || 'marketCap';
      const sortOrder = (req.query.sortOrder || 'desc') === 'asc';
      const search = (req.query.search || '').trim();
      const orderCol = sortMap[sortBy] || 'market_cap';

      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .order(orderCol, { ascending: sortOrder, nullsFirst: false })
        .range(offset, offset + limit - 1);
      if (search) {
        query = query.or(`name.ilike.%${search}%,symbol.ilike.%${search}%`);
      }
      const { data, count, error } = await query;
      if (error) {
        console.error(`Supabase error in listFromTable(${tableName}):`, error);
        // Возвращаем пустой результат вместо 500, чтобы не падал фронт при префетче
        return res.json({ companies: [], total: 0, limit, offset, hasMore: false });
      }
      const rows = Array.isArray(data) ? data : [];

      // Overlay/fallback enrichment from master companies table for fresher metrics
      const symbols = rows.map(r => r.symbol).filter(Boolean);
      if (symbols.length) {
        const cols = 'symbol, price, market_cap, pe_ratio, price_to_sales_ratio, dividend_yield, revenue, net_income, free_cash_flow, return_3_year, return_5_year, return_10_year, max_drawdown_3_year, max_drawdown_5_year, max_drawdown_10_year, dcf_enterprise_value, margin_of_safety, dcf_implied_growth';
        const { data: master, error: mErr } = await supabase.from('companies').select(cols).in('symbol', symbols);
        if (!mErr && Array.isArray(master)) {
          const bySym = new Map(master.map(m => [m.symbol, m]));
          for (const r of rows) {
            const m = bySym.get(r.symbol);
            if (!m) continue;
            const applyIfMissing = (key, val) => {
              if (r[key] === null || r[key] === undefined || (typeof r[key] === 'number' && r[key] === 0)) {
                if (val !== null && val !== undefined) r[key] = val;
              }
            };
            // Не переопределяем цены/капитализацию из индексных таблиц; только заполняем если пусто
            applyIfMissing('price', m.price);
            applyIfMissing('market_cap', m.market_cap);
            // Best-effort overlay for daily change fields if present in master
            if (m.daily_change !== null && m.daily_change !== undefined) r.daily_change = m.daily_change;
            if (m.daily_change_percent !== null && m.daily_change_percent !== undefined) r.daily_change_percent = m.daily_change_percent;
            applyIfMissing('pe_ratio', m.pe_ratio);
            if (r.price_to_sales_ratio == null || Number(r.price_to_sales_ratio) === 0) {
              if (m.price_to_sales_ratio != null && Number(m.price_to_sales_ratio) !== 0) {
                r.price_to_sales_ratio = m.price_to_sales_ratio;
              } else {
                const mc = Number(r.market_cap ?? m.market_cap);
                const rev = Number(r.revenue ?? m.revenue);
                if (isFinite(mc) && isFinite(rev) && rev > 0) r.price_to_sales_ratio = mc / rev;
              }
            }
            applyIfMissing('dividend_yield', m.dividend_yield);
            applyIfMissing('revenue', m.revenue);
            applyIfMissing('net_income', m.net_income);
            applyIfMissing('free_cash_flow', m.free_cash_flow);
            applyIfMissing('return_3_year', m.return_3_year);
            applyIfMissing('return_5_year', m.return_5_year);
            applyIfMissing('return_10_year', m.return_10_year);
            applyIfMissing('max_drawdown_3_year', m.max_drawdown_3_year);
            applyIfMissing('max_drawdown_5_year', m.max_drawdown_5_year);
            applyIfMissing('max_drawdown_10_year', m.max_drawdown_10_year);
            // Always prefer master DCF metrics when present to avoid stale/index-specific anomalies
            if (m.dcf_enterprise_value !== null && m.dcf_enterprise_value !== undefined) r.dcf_enterprise_value = m.dcf_enterprise_value;
            if (m.margin_of_safety !== null && m.margin_of_safety !== undefined) r.margin_of_safety = m.margin_of_safety;
            if (m.dcf_implied_growth !== null && m.dcf_implied_growth !== undefined) r.dcf_implied_growth = m.dcf_implied_growth;
          }
        }
      }
      // Symbol-specific overrides for 10Y metrics where company has <10Y history (e.g., DASH IPO in 2020)
      if (tableName === 'sp500_companies') {
        for (const r of rows) {
          if (r?.symbol === 'DASH') {
            r.return_10_year = null;
            r.ar_mdd_ratio_10_year = null;
          }
        }
      }
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.json({
        companies: rows.map(mapDbRowToCompany),
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0),
      });
    } catch (e) {
      console.error('Error in listFromTable:', e);
      return res.status(500).json({ message: 'Failed to fetch companies' });
    }
  }

  // Distinct datasets
  app.get('/api/companies', listCompanies);
  app.get('/api/sp500', (req, res) => listFromTable('sp500_companies', req, res));
  app.get('/api/nasdaq100', (req, res) => listFromTable('nasdaq100_companies', req, res));
  app.get('/api/dowjones', (req, res) => listFromTable('dow_jones_companies', req, res));

  // Union endpoint: combine S&P 500, Nasdaq 100, Dow Jones for global search
  app.get('/api/companies-all', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const sortBy = (req.query.sortBy || 'marketCap').toString();
      const sortOrder = ((req.query.sortOrder || 'desc').toString() === 'asc') ? 'asc' : 'desc';
      const search = (req.query.search || '').toString().trim();

      const orderCol = sortMap[sortBy] || 'market_cap';

      // Fetch all three sets (bounded size: ~635 rows)
      const [sp500, ndx, dji] = await Promise.all([
        supabase.from('sp500_companies').select('*'),
        supabase.from('nasdaq100_companies').select('*'),
        supabase.from('dow_jones_companies').select('*'),
      ]);
      if (sp500.error) { console.warn('companies-all sp500 error:', sp500.error); }
      if (ndx.error) { console.warn('companies-all ndx error:', ndx.error); }
      if (dji.error) { console.warn('companies-all dji error:', dji.error); }

      let rows = ([])
        .concat(Array.isArray(sp500.data) ? sp500.data : [])
        .concat(Array.isArray(ndx.data) ? ndx.data : [])
        .concat(Array.isArray(dji.data) ? dji.data : []);

      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(r => (r?.name || '').toLowerCase().includes(s) || (r?.symbol || '').toLowerCase().includes(s));
      }

      // Sort in memory by mapped column
      const getVal = (r) => {
        switch (orderCol) {
          case 'name': return (r?.name || '').toString();
          case 'rank': return Number(r?.rank ?? 0);
          case 'market_cap': return Number(r?.market_cap ?? 0);
          case 'price': return Number(r?.price ?? 0);
          case 'revenue': return Number(r?.revenue ?? 0);
          case 'net_income': return Number(r?.net_income ?? 0);
          case 'pe_ratio': return Number(r?.pe_ratio ?? 0);
          case 'dividend_yield': return Number(r?.dividend_yield ?? 0);
          case 'free_cash_flow': return Number(r?.free_cash_flow ?? 0);
          case 'revenue_growth_10y': return Number(r?.revenue_growth_10y ?? 0);
          case 'return_3_year': return Number(r?.return_3_year ?? -99999);
          case 'return_5_year': return Number(r?.return_5_year ?? -99999);
          case 'return_10_year': return Number(r?.return_10_year ?? -99999);
          case 'max_drawdown_3_year': return Number(r?.max_drawdown_3_year ?? 99999);
          case 'max_drawdown_5_year': return Number(r?.max_drawdown_5_year ?? 99999);
          case 'max_drawdown_10_year': return Number(r?.max_drawdown_10_year ?? 99999);
          default: return Number(r?.market_cap ?? 0);
        }
      };
      rows.sort((a, b) => {
        const va = getVal(a); const vb = getVal(b);
        if (typeof va === 'string' || typeof vb === 'string') {
          return sortOrder === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        }
        return sortOrder === 'asc' ? (va - vb) : (vb - va);
      });

      const total = rows.length;
      const page = rows.slice(offset, offset + limit);
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.json({
        companies: page.map(mapDbRowToCompany),
        total,
        limit,
        offset,
        hasMore: (offset + limit) < total,
      });
    } catch (e) {
      console.error('Error in /api/companies-all:', e);
      return res.status(500).json({ message: 'Failed to fetch companies' });
    }
  });

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

  // Helpers: bulk price updates (inline JS, no TS deps)
  async function bulkUpdatePricesFor(tableName) {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) throw new Error('FMP_API_KEY missing');
    const { data: rows, error } = await supabase.from(tableName).select('symbol');
    if (error) throw error;
    const symbols = (rows || []).map(r => r.symbol).filter(Boolean);
    const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
    const chunks = chunk(symbols, 50);
    for (const group of chunks) {
      try {
        const url = `https://financialmodelingprep.com/api/v3/quote/${group.join(',')}?apikey=${apiKey}`;
        const r = await fetch(url);
        if (!r.ok) { console.warn('FMP group error', tableName, r.status); continue; }
        const arr = await r.json();
        for (const q of (Array.isArray(arr) ? arr : [])) {
          if (!q?.symbol) continue;
          const updates = {};
          // используем цену котировки (обычно равна последнему закрытию после конца сессии), fallback к previousClose
          const closePrice = (q.price !== undefined && q.price !== null)
            ? Number(q.price)
            : (q.previousClose !== undefined ? Number(q.previousClose) : undefined);
          if (closePrice !== undefined) updates.price = closePrice;
          if (q.marketCap !== undefined) updates.market_cap = Number(q.marketCap);
          if (q.change !== undefined) updates.daily_change = Number(q.change);
          if (q.changesPercentage !== undefined) updates.daily_change_percent = Number(q.changesPercentage);
          try { await supabase.from(tableName).update(updates).eq('symbol', q.symbol); } catch {}
        }
        await new Promise(r => setTimeout(r, 150));
      } catch (e) {
        console.warn('bulk update chunk error', tableName, e?.message || e);
      }
    }
  }

  // Daily price updates (inline)
  app.post('/api/sp500/update-prices', async (_req, res) => {
    try {
      (async () => { await bulkUpdatePricesFor('sp500_companies'); })();
      return res.json({ status: 'started' });
    } catch (e) {
      console.error('sp500 update error:', e);
      return res.status(500).json({ message: 'Failed to update S&P 500 prices' });
    }
  });

  // Update price for a single S&P 500 symbol (manual refresh)
  app.post('/api/sp500/update-price', async (req, res) => {
    try {
      const symbol = (req.query.symbol || req.body?.symbol || '').toString().trim().toUpperCase();
      if (!symbol) return res.status(400).json({ message: 'symbol is required' });
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`;
      const r = await fetch(url);
      if (!r.ok) return res.status(502).json({ message: 'FMP error', status: r.status });
      const arr = await r.json();
      const q = Array.isArray(arr) && arr[0];
      if (!q) return res.status(404).json({ message: 'No quote' });
      const updates = {};
      // записываем цену котировки (последнее закрытие после конца сессии), fallback к previousClose
      const closePrice = (q.price !== undefined && q.price !== null)
        ? Number(q.price)
        : (q.previousClose !== undefined ? Number(q.previousClose) : undefined);
      if (closePrice !== undefined) updates.price = closePrice;
      if (q.marketCap !== undefined) updates.market_cap = Number(q.marketCap);
      if (q.change !== undefined) updates.daily_change = Number(q.change);
      if (q.changesPercentage !== undefined) updates.daily_change_percent = Number(q.changesPercentage);
      const { error } = await supabase.from('sp500_companies').update(updates).eq('symbol', symbol);
      if (error) return res.status(500).json({ message: 'DB update error', error });
      return res.json({ status: 'ok', symbol, updates });
    } catch (e) {
      console.error('sp500/update-price error:', e);
      return res.status(500).json({ message: 'Failed to update price' });
    }
  });

  app.post('/api/nasdaq100/update-prices', async (_req, res) => {
    try {
      (async () => { await bulkUpdatePricesFor('nasdaq100_companies'); })();
      return res.json({ status: 'started' });
    } catch (e) {
      console.error('nasdaq100 update error:', e);
      return res.status(500).json({ message: 'Failed to update Nasdaq 100 prices' });
    }
  });

  // Update price for a single Nasdaq 100 symbol (manual refresh)
  app.post('/api/nasdaq100/update-price', async (req, res) => {
    try {
      const symbol = (req.query.symbol || req.body?.symbol || '').toString().trim().toUpperCase();
      if (!symbol) return res.status(400).json({ message: 'symbol is required' });
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`;
      const r = await fetch(url);
      if (!r.ok) return res.status(502).json({ message: 'FMP error', status: r.status });
      const arr = await r.json();
      const q = Array.isArray(arr) && arr[0];
      if (!q) return res.status(404).json({ message: 'No quote' });
      const updates = {};
      const closePrice = (q.previousClose !== undefined && q.previousClose !== null)
        ? Number(q.previousClose)
        : (q.price !== undefined ? Number(q.price) : undefined);
      if (closePrice !== undefined) updates.price = closePrice;
      if (q.marketCap !== undefined) updates.market_cap = Number(q.marketCap);
      if (q.change !== undefined) updates.daily_change = Number(q.change);
      if (q.changesPercentage !== undefined) updates.daily_change_percent = Number(q.changesPercentage);
      const { error } = await supabase.from('nasdaq100_companies').update(updates).eq('symbol', symbol);
      if (error) return res.status(500).json({ message: 'DB update error', error });
      return res.json({ status: 'ok', symbol, updates });
    } catch (e) {
      console.error('nasdaq100/update-price error:', e);
      return res.status(500).json({ message: 'Failed to update price' });
    }
  });

  // Update fundamentals for a single Nasdaq 100 symbol (quote + statements)
  app.post('/api/nasdaq100/update-fundamentals', async (req, res) => {
    try {
      const symbol = (req.query.symbol || req.body?.symbol || '').toString().trim().toUpperCase();
      if (!symbol) return res.status(400).json({ message: 'symbol is required' });
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });

      const fmp = async (endpoint) => {
        const url = `https://financialmodelingprep.com/api/v3${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${apiKey}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${endpoint} ${r.status}`);
        return r.json();
      };

      const [quote, income, cash, balance] = await Promise.all([
        fmp(`/quote/${symbol}`),
        fmp(`/income-statement/${symbol}?limit=1`),
        fmp(`/cash-flow-statement/${symbol}?limit=1`),
        fmp(`/balance-sheet-statement/${symbol}?limit=1`),
      ]);
      const q = Array.isArray(quote) && quote[0] || {};
      const i = Array.isArray(income) && income[0] || {};
      const c = Array.isArray(cash) && cash[0] || {};
      const b = Array.isArray(balance) && balance[0] || {};

      const updates = {
        price: q.price ?? null,
        market_cap: q.marketCap ?? null,
        pe_ratio: q.pe ?? null,
        eps: q.eps ?? i.epsdiluted ?? i.eps ?? null,
        dividend_yield: q.lastDiv && q.price ? (Number(q.lastDiv) / Number(q.price)) * 100 : (q.dividendYield ?? null),
        revenue: i.revenue ?? null,
        net_income: i.netIncome ?? null,
        free_cash_flow: c.freeCashFlow ?? null,
        total_assets: b.totalAssets ?? null,
        total_debt: b.totalDebt ?? null,
      };

      const { error } = await supabase.from('nasdaq100_companies').update(updates).eq('symbol', symbol);
      if (error) return res.status(500).json({ message: 'DB update error', error });
      return res.json({ status: 'ok', symbol, updates });
    } catch (e) {
      console.error('nasdaq100/update-fundamentals error:', e);
      return res.status(500).json({ message: 'Failed to update fundamentals' });
    }
  });

  app.post('/api/dowjones/update-prices', async (_req, res) => {
    try {
      (async () => { await bulkUpdatePricesFor('dow_jones_companies'); })();
      return res.json({ status: 'started' });
    } catch (e) {
      console.error('dowjones update error:', e);
      return res.status(500).json({ message: 'Failed to update Dow Jones prices' });
    }
  });

  // General companies table price update (fills marketCap/price in companies)
  app.post('/api/companies/update-prices', async (_req, res) => {
    try {
      (async () => { await bulkUpdatePricesFor('companies'); })();
      return res.json({ status: 'started' });
    } catch (e) {
      console.error('companies price update error:', e);
      return res.status(500).json({ message: 'Failed to start companies price update' });
    }
  });

  // Sync constituents endpoints (add new, keep existing; removals can be handled later)
  app.post('/api/import/sp500-sync', async (_req, res) => {
    try {
      await import('tsx/esm');
      import('./sp500-import.ts').then(() => console.log('sp500 sync started')).catch(e => console.error('sp500 sync error:', e));
      return res.json({ status: 'started' });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to start sp500 sync' });
    }
  });

  app.post('/api/import/nasdaq100-sync', async (_req, res) => {
    try {
      await import('tsx/esm');
      import('./nasdaq100-import.ts').then(() => console.log('nasdaq100 sync started')).catch(e => console.error('nasdaq100 sync error:', e));
      return res.json({ status: 'started' });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to start nasdaq100 sync' });
    }
  });

  app.post('/api/import/dowjones-sync', async (_req, res) => {
    try {
      await import('tsx/esm');
      import('./dow-jones-import.ts').then(() => console.log('dowjones sync started')).catch(e => console.error('dowjones sync error:', e));
      return res.json({ status: 'started' });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to start dowjones sync' });
    }
  });

  // Safer refresh endpoints (no process.exit) using Supabase directly
  async function refreshConstituents(tableName, fmpPath) {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) throw new Error('FMP_API_KEY is missing');
      const url = `https://financialmodelingprep.com/api/v3/${fmpPath}?apikey=${apiKey}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`FMP ${fmpPath} failed: ${resp.status}`);
      const list = await resp.json(); // [{symbol,name}]
      const desiredSymbols = new Set((list || []).map(i => i.symbol).filter(Boolean));

      const { data: existing, error: readErr } = await supabase.from(tableName).select('symbol');
      if (readErr) throw readErr;
      const existingSymbols = new Set((existing || []).map(r => r.symbol));

      const toInsert = [];
      for (const item of (list || [])) {
        if (item && item.symbol && !existingSymbols.has(item.symbol)) {
          toInsert.push({ symbol: item.symbol, name: item.name || item.symbol });
        }
      }

      const toDelete = [];
      for (const sym of existingSymbols) {
        if (!desiredSymbols.has(sym)) toDelete.push(sym);
      }

      if (toInsert.length) {
        await supabase.from(tableName).insert(toInsert);
      }
      if (toDelete.length) {
        // Delete in chunks of 100
        for (let i = 0; i < toDelete.length; i += 100) {
          const chunk = toDelete.slice(i, i + 100);
          await supabase.from(tableName).delete().in('symbol', chunk);
        }
      }
      return { inserted: toInsert.length, deleted: toDelete.length, total: desiredSymbols.size };
    } catch (e) {
      console.error('refreshConstituents error:', e);
      return { error: e?.message || 'unknown' };
    }
  }

  app.post('/api/import/sp500-refresh', async (_req, res) => {
    (async () => { await refreshConstituents('sp500_companies', 'sp500_constituent'); })();
    return res.json({ status: 'started' });
  });
  app.post('/api/import/nasdaq100-refresh', async (_req, res) => {
    (async () => { await refreshConstituents('nasdaq100_companies', 'nasdaq_constituent'); })();
    return res.json({ status: 'started' });
  });
  app.post('/api/import/dowjones-refresh', async (_req, res) => {
    (async () => { await refreshConstituents('dow_jones_companies', 'dowjones_constituent'); })();
    return res.json({ status: 'started' });
  });

  // Enrich specific S&P 500 symbols with fundamentals via FMP and write into sp500_companies
  app.post('/api/sp500/enrich', async (req, res) => {
    try {
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!symbols.length) return res.status(400).json({ message: 'Provide symbols as comma-separated list in ?symbols=' });
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });

      const fmp = async (endpoint) => {
        const url = `https://financialmodelingprep.com/api/v3${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${apiKey}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${endpoint} ${r.status}`);
        return r.json();
      };

      const results = [];
      for (const sym of symbols) {
        try {
          const [quote, income, cash, balance] = await Promise.all([
            fmp(`/quote/${sym}`),
            fmp(`/income-statement/${sym}?limit=1`),
            fmp(`/cash-flow-statement/${sym}?limit=1`),
            fmp(`/balance-sheet-statement/${sym}?limit=1`),
          ]);
          const q = Array.isArray(quote) && quote[0] || {};
          const i = Array.isArray(income) && income[0] || {};
          const c = Array.isArray(cash) && cash[0] || {};
          const b = Array.isArray(balance) && balance[0] || {};

          const updates = {
            price: q.price ?? null,
            market_cap: q.marketCap ?? null,
            pe_ratio: q.pe ?? null,
            eps: q.eps ?? i.epsdiluted ?? i.eps ?? null,
            dividend_yield: q.lastDiv && q.price ? (Number(q.lastDiv) / Number(q.price)) * 100 : (q.dividendYield ?? null),
            revenue: i.revenue ?? null,
            net_income: i.netIncome ?? null,
            free_cash_flow: c.freeCashFlow ?? null,
            total_assets: b.totalAssets ?? null,
            total_debt: b.totalDebt ?? null,
          };

          await supabase.from('sp500_companies').update(updates).eq('symbol', sym);
          results.push({ symbol: sym, updated: true });
        } catch (e) {
          console.error('enrich error', sym, e);
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
        // brief delay to avoid rate limits
        await new Promise(r => setTimeout(r, 200));
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('sp500/enrich error:', e);
      return res.status(500).json({ message: 'Failed to enrich symbols' });
    }
  });

  // Enrich specific Nasdaq 100 symbols with fundamentals via FMP and write into nasdaq100_companies
  app.post('/api/nasdaq100/enrich', async (req, res) => {
    try {
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!symbols.length) return res.status(400).json({ message: 'Provide symbols as comma-separated list in ?symbols=' });
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });

      const fmp = async (endpoint) => {
        const url = `https://financialmodelingprep.com/api/v3${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${apiKey}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${endpoint} ${r.status}`);
        return r.json();
      };

      const results = [];
      for (const sym of symbols) {
        try {
          const [quote, income, cash, balance] = await Promise.all([
            fmp(`/quote/${sym}`),
            fmp(`/income-statement/${sym}?limit=1`),
            fmp(`/cash-flow-statement/${sym}?limit=1`),
            fmp(`/balance-sheet-statement/${sym}?limit=1`),
          ]);
          const q = Array.isArray(quote) && quote[0] || {};
          const i = Array.isArray(income) && income[0] || {};
          const c = Array.isArray(cash) && cash[0] || {};
          const b = Array.isArray(balance) && balance[0] || {};

          const updates = {
            price: q.price ?? null,
            market_cap: q.marketCap ?? null,
            pe_ratio: q.pe ?? null,
            eps: q.eps ?? i.epsdiluted ?? i.eps ?? null,
            dividend_yield: q.lastDiv && q.price ? (Number(q.lastDiv) / Number(q.price)) * 100 : (q.dividendYield ?? null),
            revenue: i.revenue ?? null,
            net_income: i.netIncome ?? null,
            free_cash_flow: c.freeCashFlow ?? null,
            total_assets: b.totalAssets ?? null,
            total_debt: b.totalDebt ?? null,
          };

          await supabase.from('nasdaq100_companies').update(updates).eq('symbol', sym);
          results.push({ symbol: sym, updated: true });
        } catch (e) {
          console.error('nasdaq enrich error', sym, e);
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
        // brief delay to avoid rate limits
        await new Promise(r => setTimeout(r, 200));
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('nasdaq100/enrich error:', e);
      return res.status(500).json({ message: 'Failed to enrich symbols' });
    }
  });

  // Admin: override returns to null for symbols (e.g., IPO < window)
  app.post('/api/sp500/override-returns-null', async (req, res) => {
    try {
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const windowsParam = (req.query.windows || req.body?.windows || '3,5,10').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      const windows = new Set(windowsParam.split(',').map(s => s.trim()));
      if (!symbols.length) return res.status(400).json({ message: 'Provide symbols as comma-separated list in ?symbols=' });

      const fields = {};
      if (windows.has('3')) fields['return_3_year'] = null;
      if (windows.has('5')) fields['return_5_year'] = null;
      if (windows.has('10')) fields['return_10_year'] = null;

      const results = [];
      for (const sym of symbols) {
        try {
          await supabase.from('sp500_companies').update(fields).eq('symbol', sym);
          results.push({ symbol: sym, updated: true });
        } catch (e) {
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('override-returns-null error:', e);
      return res.status(500).json({ message: 'Failed to override returns' });
    }
  });

  // Admin: force-clear DCF metrics for given symbols in all tables
  app.post('/api/dcf/clear', async (req, res) => {
    try {
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!symbols.length) return res.status(400).json({ message: 'Provide symbols as comma-separated list in ?symbols=' });
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies'];
      const results = [];
      for (const sym of symbols) {
        const upd = { dcf_enterprise_value: null, margin_of_safety: null, dcf_implied_growth: null };
        for (const t of tables) {
          await supabase.from(t).update(upd).eq('symbol', sym);
        }
        results.push({ symbol: sym, cleared: true });
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to clear DCF' });
    }
  });

  // Recompute returns (3/5/10Y) for specific S&P 500 symbols using FMP historical prices
  app.post('/api/sp500/recompute-returns', async (req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!symbols.length) return res.status(400).json({ message: 'Provide symbols as comma-separated list in ?symbols=' });

      const now = new Date();
      const to = now.toISOString().split('T')[0];
      const tenYearsAgo = new Date(now);
      tenYearsAgo.setFullYear(now.getFullYear() - 10);
      const from10 = tenYearsAgo.toISOString().split('T')[0];

      const annualized = (start, end, years) => {
        if (!isFinite(start) || !isFinite(end) || start <= 0 || end <= 0 || years <= 0) return null;
        return (Math.pow(end / start, 1 / years) - 1) * 100;
      };

      const results = [];
      for (const sym of symbols) {
        try {
          const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${sym}?from=${from10}&to=${to}&serietype=line&apikey=${apiKey}`;
          const r = await fetch(url);
          if (!r.ok) throw new Error(`historical ${r.status}`);
          const data = await r.json();
          const hist = Array.isArray(data?.historical) ? data.historical.slice().sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
          if (!hist.length) {
            await supabase.from('sp500_companies').update({ return_3_year: null, return_5_year: null, return_10_year: null }).eq('symbol', sym);
            results.push({ symbol: sym, updated: true, note: 'no history' });
            continue;
          }
          const earliest = new Date(hist[0].date);
          const latestClose = Number(hist[hist.length - 1].close);
          const date3 = new Date(now); date3.setFullYear(now.getFullYear() - 3);
          const date5 = new Date(now); date5.setFullYear(now.getFullYear() - 5);
          const date10 = new Date(now); date10.setFullYear(now.getFullYear() - 10);

          const closest = (target) => {
            if (earliest > target) return null;
            let best = null, bestDiff = Infinity;
            for (const p of hist) {
              const d = Math.abs(new Date(p.date) - target);
              if (d < bestDiff) { bestDiff = d; best = Number(p.close); }
            }
            return best;
          };

          const s3 = closest(date3);
          const s5 = closest(date5);
          const s10 = closest(date10);

          const ret3 = s3 ? annualized(s3, latestClose, 3) : null;
          const ret5 = s5 ? annualized(s5, latestClose, 5) : null;
          const ret10 = s10 ? annualized(s10, latestClose, 10) : null;

          await supabase.from('sp500_companies').update({
            return_3_year: ret3,
            return_5_year: ret5,
            return_10_year: ret10,
          }).eq('symbol', sym);
          results.push({ symbol: sym, updated: true, ret3, ret5, ret10 });
        } catch (e) {
          console.error('recompute-returns error', sym, e);
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
        await new Promise(r => setTimeout(r, 300));
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('sp500/recompute-returns error:', e);
      return res.status(500).json({ message: 'Failed to recompute returns' });
    }
  });

  app.post('/api/companies/enhance-returns', async (_req, res) => {
    try {
      await import('tsx/esm');
      import('./returns-enhancer.ts')
        .then(mod => (mod.enhanceAllCompaniesReturns ? mod.enhanceAllCompaniesReturns() : (mod.returnsEnhancer?.enhanceAllCompaniesReturns?.())))
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

  // Admin: normalize DCF to USD and fix unit scale for given symbols
  app.post('/api/dcf/normalize', async (req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!symbols.length) return res.status(400).json({ message: 'Provide symbols as comma-separated list in ?symbols=' });

      // helper: fetch JSON
      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };

      // get USD/CNY once
      let cnyUsd = 7.0;
      try {
        const fx = await fetchJson(`https://financialmodelingprep.com/api/v3/fx/CNYUSD?apikey=${apiKey}`);
        const rate = Array.isArray(fx) && fx[0]?.price; if (rate) cnyUsd = Number(rate);
      } catch {}

      const results = [];
      for (const sym of symbols) {
        try {
          // read current row (prefer companies then index tables)
          const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies'];
          let foundTable = null; let row = null;
          for (const t of tables) {
            const { data } = await supabase.from(t).select('symbol, dcf_enterprise_value, market_cap').eq('symbol', sym).limit(1);
            if (Array.isArray(data) && data[0]) { foundTable = t; row = data[0]; break; }
          }
          if (!row) { results.push({ symbol: sym, updated: false, error: 'not found' }); continue; }

          let dcf = Number(row.dcf_enterprise_value);
          const mcap = Number(row.market_cap);
          if (!isFinite(dcf) || dcf <= 0) { results.push({ symbol: sym, updated: false, error: 'dcf missing' }); continue; }

          // currency from profile
          let currency = 'USD';
          try {
            const prof = await fetchJson(`https://financialmodelingprep.com/api/v3/profile/${sym}?apikey=${apiKey}`);
            const p = Array.isArray(prof) && prof[0]; if (p?.currency) currency = String(p.currency).toUpperCase();
          } catch {}

          // Convert to USD if CNY
          if (currency === 'CNY') {
            dcf = dcf / cnyUsd;
          }

          // Recompute margin of safety in USD, if возможна
          let mos = null;
          if (isFinite(mcap) && mcap > 0 && isFinite(dcf) && dcf > 0) {
            mos = (dcf - mcap) / mcap;
          }

          // write back to all tables where symbol exists
          for (const t of tables) {
            await supabase.from(t).update({ dcf_enterprise_value: dcf, margin_of_safety: mos }).eq('symbol', sym);
          }
          results.push({ symbol: sym, updated: true, currency, dcf });
        } catch (e) {
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('dcf/normalize error:', e);
      return res.status(500).json({ message: 'Failed to normalize DCF' });
    }
  });

  // Recompute DCF from financial statements (FCF → perpetuity) with FX normalization to USD
  app.post('/api/dcf/recompute', async (req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!symbols.length) return res.status(400).json({ message: 'Provide symbols as comma-separated list in ?symbols=' });

      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };

      const results = [];
      for (const sym of symbols) {
        try {
          // Profile (currency) and market cap
          let currency = 'USD'; let marketCap = null; let revenueGrowth10y = null;
          try {
            const prof = await fetchJson(`https://financialmodelingprep.com/api/v3/profile/${sym}?apikey=${apiKey}`);
            const p = Array.isArray(prof) && prof[0];
            if (p?.currency) currency = String(p.currency).toUpperCase();
            if (p?.mktCap) marketCap = Number(p.mktCap);
          } catch {}
          // Try DB market cap if not provided
          if (!(isFinite(marketCap) && marketCap > 0)) {
            const { data } = await supabase.from('companies').select('market_cap,revenue_growth_10y').eq('symbol', sym).limit(1);
            if (Array.isArray(data) && data[0]) { marketCap = Number(data[0].market_cap); revenueGrowth10y = Number(data[0].revenue_growth_10y); }
          }

          // Fetch last 5y cash flows
          const cash = await fetchJson(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${sym}?limit=5&apikey=${apiKey}`);
          const series = Array.isArray(cash) ? cash : [];
          const fcfs = series.map(r => Number(r.freeCashFlow)).filter(v => isFinite(v));
          const fcfBase = fcfs.length ? (fcfs.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, fcfs.length)) : null;
          if (!(isFinite(fcfBase) && fcfBase !== 0)) { results.push({ symbol: sym, updated: false, error: 'no FCF' }); continue; }

          // FX to USD
          let fcfUsd = fcfBase;
          if (currency && currency !== 'USD') {
            try {
              const pair = `${currency}USD`;
              const fx = await fetchJson(`https://financialmodelingprep.com/api/v3/fx/${pair}?apikey=${apiKey}`);
              const rate = Array.isArray(fx) && fx[0]?.price; if (rate) fcfUsd = fcfUsd * Number(rate);
            } catch {}
          }

          // Growth and discount assumptions
          const g = Math.max(0.02, Math.min(0.08, isFinite(revenueGrowth10y) ? (Number(revenueGrowth10y) / 100) : 0.05));
          const wacc = 0.10;
          if (g >= wacc) { results.push({ symbol: sym, updated: false, error: 'g>=WACC' }); continue; }
          const fcf1 = fcfUsd * (1 + g);
          const dcfEv = fcf1 / (wacc - g);

          // Margin of safety
          let mos = null;
          if (isFinite(marketCap) && marketCap > 0 && isFinite(dcfEv) && dcfEv > 0) mos = (dcfEv - marketCap) / marketCap;

          // Guard: hide insane values
          const tooHigh = (isFinite(marketCap) && marketCap > 0 && isFinite(dcfEv) && dcfEv / marketCap > 20);
          const writeVal = tooHigh ? null : dcfEv;
          const writeMos = tooHigh ? null : mos;

          const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies'];
          for (const t of tables) {
            await supabase.from(t).update({ dcf_enterprise_value: writeVal, margin_of_safety: writeMos, dcf_implied_growth: g }).eq('symbol', sym);
          }
          results.push({ symbol: sym, updated: true, dcf: writeVal, mos: writeMos, g, currency });
        } catch (e) {
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
        await new Promise(r => setTimeout(r, 200));
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('dcf/recompute error:', e);
      return res.status(500).json({ message: 'Failed to recompute DCF' });
    }
  });

  // Prices: update one symbol across all tables (companies + indexes)
  app.post('/api/prices/update-symbol', async (req, res) => {
    try {
      const symbol = (req.query.symbol || req.body?.symbol || '').toString().trim().toUpperCase();
      if (!symbol) return res.status(400).json({ message: 'symbol is required' });
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`;
      const r = await fetch(url);
      if (!r.ok) return res.status(502).json({ message: 'FMP error', status: r.status });
      const arr = await r.json();
      const q = Array.isArray(arr) && arr[0];
      if (!q) return res.status(404).json({ message: 'No quote' });
      const updates = {};
      const closePrice = (q.previousClose !== undefined && q.previousClose !== null)
        ? Number(q.previousClose)
        : (q.price !== undefined ? Number(q.price) : undefined);
      if (closePrice !== undefined) updates.price = closePrice;
      if (q.marketCap !== undefined) updates.market_cap = Number(q.marketCap);
      if (q.change !== undefined) updates.daily_change = Number(q.change);
      if (q.changesPercentage !== undefined) updates.daily_change_percent = Number(q.changesPercentage);

      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies'];
      const results = [];
      for (const t of tables) {
        const { data: exists, error: readErr } = await supabase.from(t).select('symbol').eq('symbol', symbol).limit(1);
        if (readErr) { results.push({ table: t, updated: false, error: readErr.message }); continue; }
        if (Array.isArray(exists) && exists.length) {
          const { error: upErr } = await supabase.from(t).update(updates).eq('symbol', symbol);
          results.push({ table: t, updated: !upErr, error: upErr?.message });
        } else {
          results.push({ table: t, updated: false, error: 'not found' });
        }
      }
      return res.json({ status: 'ok', symbol, updates, results });
    } catch (e) {
      console.error('prices/update-symbol error:', e);
      return res.status(500).json({ message: 'Failed to update symbol price' });
    }
  });

  // Prices: bulk update for all tables (fire-and-forget)
  app.post('/api/prices/update-all', async (_req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      res.json({ status: 'started' }); // respond immediately

      // background task
      (async () => {
        const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies'];
        const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
        const fetchQuotes = async (symbols) => {
          const url = `https://financialmodelingprep.com/api/v3/quote/${symbols.join(',')}?apikey=${apiKey}`;
          const r = await fetch(url);
          if (!r.ok) throw new Error(`FMP quote ${r.status}`);
          const arr = await r.json();
          const map = new Map();
          for (const q of (Array.isArray(arr) ? arr : [])) {
            if (!q?.symbol) continue;
            map.set(q.symbol.toUpperCase(), q);
          }
          return map;
        };
        const applyUpdate = (q) => {
          const updates = {};
          // use quote.price as primary (real-time/last close), fallback to previousClose
          const closePrice = (q.price !== undefined && q.price !== null)
            ? Number(q.price)
            : (q.previousClose !== undefined ? Number(q.previousClose) : undefined);
          if (closePrice !== undefined) updates.price = closePrice;
          if (q.marketCap !== undefined) updates.market_cap = Number(q.marketCap);
          if (q.change !== undefined) updates.daily_change = Number(q.change);
          if (q.changesPercentage !== undefined) updates.daily_change_percent = Number(q.changesPercentage);
          return updates;
        };

        for (const t of tables) {
          try {
            const { data, error } = await supabase.from(t).select('symbol');
            if (error) { console.warn('read symbols error', t, error); continue; }
            const symbols = (data || []).map(r => (r?.symbol || '').toUpperCase()).filter(Boolean);
            for (const group of chunk(symbols, 50)) {
              try {
                const qmap = await fetchQuotes(group);
                // update each symbol in group
                for (const sym of group) {
                  const q = qmap.get(sym);
                  if (!q) continue;
                  const updates = applyUpdate(q);
                  if (Object.keys(updates).length === 0) continue;
                  await supabase.from(t).update(updates).eq('symbol', sym);
                }
                // small delay to avoid hitting rate limits hard
                await new Promise(r => setTimeout(r, 200));
              } catch (e) {
                console.warn('chunk update error', t, e?.message || e);
              }
            }
          } catch (e) {
            console.warn('table update error', t, e?.message || e);
          }
        }
      })().catch(e => console.error('prices/update-all bg error', e));
    } catch (e) {
      console.error('prices/update-all error:', e);
      return res.status(500).json({ message: 'Failed to start bulk update' });
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

  // Watchlist: return full company objects with enrichment from index tables (fill missing metrics)
  app.get('/api/watchlist/companies', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const sortBy = (req.query.sortBy || 'marketCap').toString();
      const sortOrder = ((req.query.sortOrder || 'desc').toString() === 'asc') ? 'asc' : 'desc';
      const { data: wl, error: wlErr } = await supabase
        .from('watchlist')
        .select('company_symbol')
        .eq('user_id', userId);
      if (wlErr) return res.status(500).json({ message: 'Failed to fetch watchlist' });
      const symbols = (wl || []).map(r => r.company_symbol).filter(Boolean);
      if (!symbols.length) return res.json({ companies: [], total: 0, limit, offset, hasMore: false });

      // Load master rows
      const { data: master } = await supabase.from('companies').select('*').in('symbol', symbols);
      const bySym = new Map((master || []).map(r => [r.symbol, r]));

      // Load fallbacks from index tables for ALL symbols (not only missing)
      const selectCols = 'symbol, price, market_cap, pe_ratio, price_to_sales_ratio, dividend_yield, revenue, net_income, free_cash_flow, return_3_year, return_5_year, return_10_year, max_drawdown_3_year, max_drawdown_5_year, max_drawdown_10_year, dcf_enterprise_value, margin_of_safety, dcf_implied_growth';
      const [sp500, ndx, dji] = await Promise.all([
        supabase.from('sp500_companies').select(selectCols).in('symbol', symbols),
        supabase.from('nasdaq100_companies').select(selectCols).in('symbol', symbols),
        supabase.from('dow_jones_companies').select(selectCols).in('symbol', symbols),
      ]);

      // Build fallback map with first non-null values (preference order: nasdaq100, sp500, dowjones for tech-heavy)
      const fallback = new Map();
      const merge = (rows) => {
        if (rows && Array.isArray(rows.data)) {
          for (const r of rows.data) {
            if (!r?.symbol) continue;
            const prev = fallback.get(r.symbol) || {};
            const next = { ...prev };
            const keys = ['price','market_cap','pe_ratio','price_to_sales_ratio','dividend_yield','revenue','net_income','free_cash_flow','return_3_year','return_5_year','return_10_year','max_drawdown_3_year','max_drawdown_5_year','max_drawdown_10_year','dcf_enterprise_value','margin_of_safety','dcf_implied_growth'];
            for (const k of keys) {
              const val = r[k];
              if ((next[k] === undefined || next[k] === null) && (val !== undefined && val !== null)) next[k] = val;
            }
            fallback.set(r.symbol, next);
          }
        }
      };
      // Prefer Nasdaq100 values when есть (для BIIB и др.), затем S&P, затем Dow
      merge(ndx); merge(sp500); merge(dji);

      // Build final rows preserving order, overlaying missing fields from fallback
      let rows = [];
      for (const sym of symbols) {
        let r = bySym.get(sym);
        const fb = fallback.get(sym) || null;
        if (!r && fb) {
          // No master row — take fallback row as base
          r = { symbol: sym, name: sym, ...fb };
        }
        if (!r) continue;
        if (fb) {
          const applyIfMissing = (key, fbKey) => {
            if (r[key] === null || r[key] === undefined || (typeof r[key] === 'number' && r[key] === 0)) {
              if (fb[fbKey] !== null && fb[fbKey] !== undefined) r[key] = fb[fbKey];
            }
          };
          applyIfMissing('price', 'price');
          applyIfMissing('market_cap', 'market_cap');
          applyIfMissing('pe_ratio', 'pe_ratio');
          if (r.price_to_sales_ratio == null || Number(r.price_to_sales_ratio) === 0) {
            if (fb.price_to_sales_ratio != null && Number(fb.price_to_sales_ratio) !== 0) {
              r.price_to_sales_ratio = fb.price_to_sales_ratio;
            } else {
              const mc = Number(r.market_cap);
              const rev = Number(r.revenue ?? fb.revenue);
              if (isFinite(mc) && isFinite(rev) && rev > 0) r.price_to_sales_ratio = mc / rev;
            }
          }
          applyIfMissing('dividend_yield', 'dividend_yield');
          applyIfMissing('revenue', 'revenue');
          applyIfMissing('net_income', 'net_income');
          applyIfMissing('free_cash_flow', 'free_cash_flow');
          applyIfMissing('return_3_year', 'return_3_year');
          applyIfMissing('return_5_year', 'return_5_year');
          applyIfMissing('return_10_year', 'return_10_year');
          applyIfMissing('max_drawdown_3_year', 'max_drawdown_3_year');
          applyIfMissing('max_drawdown_5_year', 'max_drawdown_5_year');
          applyIfMissing('max_drawdown_10_year', 'max_drawdown_10_year');
          // Prefer master DCF when есть, иначе fallback
          if (r.dcf_enterprise_value == null && fb.dcf_enterprise_value != null) r.dcf_enterprise_value = fb.dcf_enterprise_value;
          if (r.margin_of_safety == null && fb.margin_of_safety != null) r.margin_of_safety = fb.margin_of_safety;
          if (r.dcf_implied_growth == null && fb.dcf_implied_growth != null) r.dcf_implied_growth = fb.dcf_implied_growth;
        }
        rows.push(r);
      }

      // Sorting in-memory using sortMap
      const orderCol = sortMap[sortBy] || 'market_cap';
      const getVal = (r) => {
        switch (orderCol) {
          case 'name': return (r?.name || '').toString();
          case 'rank': return Number(r?.rank ?? 0);
          case 'market_cap': return Number(r?.market_cap ?? 0);
          case 'price': return Number(r?.price ?? 0);
          case 'revenue': return Number(r?.revenue ?? 0);
          case 'net_income': return Number(r?.net_income ?? 0);
          case 'pe_ratio': return Number(r?.pe_ratio ?? 0);
          case 'dividend_yield': return Number(r?.dividend_yield ?? 0);
          case 'free_cash_flow': return Number(r?.free_cash_flow ?? 0);
          case 'price_to_sales_ratio': return Number(r?.price_to_sales_ratio ?? 0);
          case 'net_profit_margin': return Number(r?.net_profit_margin ?? 0);
          case 'revenue_growth_3y': return Number(r?.revenue_growth_3y ?? 0);
          case 'revenue_growth_5y': return Number(r?.revenue_growth_5y ?? 0);
          case 'revenue_growth_10y': return Number(r?.revenue_growth_10y ?? 0);
          case 'return_3_year': return Number(r?.return_3_year ?? -99999);
          case 'return_5_year': return Number(r?.return_5_year ?? -99999);
          case 'return_10_year': return Number(r?.return_10_year ?? -99999);
          case 'max_drawdown_3_year': return Number(r?.max_drawdown_3_year ?? 99999);
          case 'max_drawdown_5_year': return Number(r?.max_drawdown_5_year ?? 99999);
          case 'max_drawdown_10_year': return Number(r?.max_drawdown_10_year ?? 99999);
          case 'dcf_enterprise_value': return Number(r?.dcf_enterprise_value ?? 0);
          case 'margin_of_safety': return Number(r?.margin_of_safety ?? -99999);
          case 'dcf_implied_growth': return Number(r?.dcf_implied_growth ?? -99999);
          case 'asset_turnover': return Number(r?.asset_turnover ?? 0);
          case 'financial_leverage': return Number(r?.financial_leverage ?? 0);
          case 'roe': return Number(r?.roe ?? 0);
          default: return Number(r?.market_cap ?? 0);
        }
      };
      rows.sort((a, b) => {
        const va = getVal(a); const vb = getVal(b);
        if (typeof va === 'string' || typeof vb === 'string') {
          return sortOrder === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        }
        // Nulls last
        if (!isFinite(va)) return 1;
        if (!isFinite(vb)) return -1;
        return sortOrder === 'asc' ? (va - vb) : (vb - va);
      });

      const total = rows.length;
      const page = rows.slice(offset, offset + limit);
      return res.json({
        companies: page.map(mapDbRowToCompany),
        total,
        limit,
        offset,
        hasMore: (offset + limit) < total,
      });
    } catch (e) {
      console.error('watchlist/companies error:', e);
      return res.status(500).json({ message: 'Failed to fetch watchlist companies' });
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
      const { priceId, plan } = req.body || {};
      let resolvedPriceId = priceId;
      if (!resolvedPriceId && plan) {
        const annual = process.env.STRIPE_ANNUAL_PRICE_ID || process.env.STRIPE_PRICE_ANNUAL;
        const quarterly = process.env.STRIPE_QUARTERLY_PRICE_ID || process.env.STRIPE_PRICE_QUARTERLY;
        if (String(plan).toLowerCase() === 'annual' && annual) resolvedPriceId = annual;
        if (String(plan).toLowerCase() === 'quarterly' && quarterly) resolvedPriceId = quarterly;
      }
      if (!resolvedPriceId) return res.status(400).json({ error: { message: 'Price ID is required' } });
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: resolvedPriceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
        metadata: { userId: req.user.id, priceId: resolvedPriceId, plan: plan || null },
      });
      return res.json({ sessionId: session.id });
    } catch (e) {
      console.error('Stripe checkout error:', e);
      return res.status(500).json({ error: { message: 'Failed to create checkout session' } });
    }
  });
}


