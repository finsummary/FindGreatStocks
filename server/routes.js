import express from 'express';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

// Build/Deploy commit identifier (works on Vercel/Railway if env vars are present)
const COMMIT_SHA = process.env.VERCEL_GIT_COMMIT_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'unknown';

// In‑memory cache for FMP /profile IPO dates to avoid frequent calls
const profileCache = new Map(); // symbol -> { ipoDate: string|null, ts: number }
const PROFILE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

async function fetchProfilesBatch(symbols) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey || !symbols.length) {
    if (!apiKey) console.warn('[FMP] FMP_API_KEY is missing or empty');
    return;
  }
  const chunkSize = 50;
  const chunks = [];
  for (let i = 0; i < symbols.length; i += chunkSize) chunks.push(symbols.slice(i, i + chunkSize));
  for (const group of chunks) {
    try {
      // Use /stable/ endpoint format (new FMP API format)
      const url = `https://financialmodelingprep.com/stable/profile?symbol=${group.join(',')}&apikey=${apiKey}`;
      const r = await fetch(url);
      if (!r.ok) {
        const errorText = await r.text().catch(() => '');
        if (r.status === 403) {
          console.error('[FMP] 403 Forbidden - Check API key validity and rate limits. Response:', errorText.substring(0, 200));
        } else {
          console.warn('[FMP] profile batch error', r.status, errorText.substring(0, 100));
        }
        continue;
      }
      const arr = await r.json();
      for (const p of (Array.isArray(arr) ? arr : [])) {
        if (!p?.symbol) continue;
        profileCache.set(String(p.symbol).toUpperCase(), { ipoDate: p.ipoDate || null, ts: Date.now() });
      }
    } catch (e) {
      console.warn('[FMP] fetchProfilesBatch error', e?.message || e);
    }
  }
}

async function ensureProfilesForSymbols(symbols) {
  const missing = [];
  const now = Date.now();
  for (const s of symbols) {
    const key = String(s).toUpperCase();
    const cached = profileCache.get(key);
    if (!cached || (now - cached.ts) > PROFILE_TTL_MS) {
      missing.push(key);
    }
  }
  if (missing.length) {
    await fetchProfilesBatch(missing);
  }
}

function applyAgeBasedWindowNulls(rows, ipoMap) {
  try {
    const now = Date.now();
    for (const r of (rows || [])) {
      const sym = (r && r.symbol) ? String(r.symbol).toUpperCase() : null;
      if (!sym) continue;
      const ipo = ipoMap.get(sym);
      if (!ipo) continue;
      const d = new Date(ipo);
      if (isNaN(d.getTime())) continue;
      const years = (now - d.getTime()) / (365.25 * 24 * 3600 * 1000);
      
      // For companies < 10 years old, compute ROIC metrics from available data if they exist
      if (years < 10) {
        if ('return_10_year' in r) r.return_10_year = null;
        if ('ar_mdd_ratio_10_year' in r) r.ar_mdd_ratio_10_year = null;
        if ('max_drawdown_10_year' in r) r.max_drawdown_10_year = null;
        // Don't nullify revenue_growth_10y if we can compute it from available data
        if ('revenue_growth_10y' in r && r.revenue_growth_10y == null) {
          // Try to compute from revenue_y1, revenue_y10 if available
          if (r.revenue_y1 != null && r.revenue_y10 != null) {
            const rev1 = Number(r.revenue_y1);
            const rev10 = Number(r.revenue_y10);
            if (!isNaN(rev1) && !isNaN(rev10) && rev10 > 0) {
              const cagr = Math.pow(rev1 / rev10, 1 / 10) - 1;
              if (isFinite(cagr)) {
                r.revenue_growth_10y = cagr;
              }
            }
          }
        }
        
        // Don't nullify ROIC metrics if we have data - compute from available years
        if ('roic_10y_avg' in r && r.roic_10y_avg == null) {
          // Try to compute from roic_y1, roic_y2, etc. if available
          const roicVals = [];
          for (let i = 1; i <= 10; i++) {
            const key = `roic_y${i}`;
            if (r[key] != null && r[key] !== undefined) {
              const val = Number(r[key]);
              if (!isNaN(val)) roicVals.push(val);
            }
          }
          if (roicVals.length >= 2) {
            const avg = roicVals.reduce((a, b) => a + b, 0) / roicVals.length;
            const variance = roicVals.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / roicVals.length;
            const std = Math.sqrt(variance);
            r.roic_10y_avg = avg;
            r.roic_10y_std = std;
          }
        }
        
        // Don't nullify FCF margin median if we have data
        if ('fcf_margin_median_10y' in r && r.fcf_margin_median_10y == null) {
          // Try to compute from fcf_y1, fcf_y2, revenue_y1, revenue_y2, etc. if available
          const fcfMargins = [];
          for (let i = 1; i <= 10; i++) {
            const fcfKey = `fcf_y${i}`;
            const revKey = `revenue_y${i}`;
            if (r[fcfKey] != null && r[revKey] != null) {
              const fcf = Number(r[fcfKey]);
              const rev = Number(r[revKey]);
              if (!isNaN(fcf) && !isNaN(rev) && rev > 0) {
                fcfMargins.push(fcf / rev);
              }
            }
          }
          if (fcfMargins.length >= 1) {
            const sorted = [...fcfMargins].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 === 0 
              ? (sorted[mid - 1] + sorted[mid]) / 2 
              : sorted[mid];
            r.fcf_margin_median_10y = median;
          }
        }
      }
      if (years < 5) {
        if ('return_5_year' in r) r.return_5_year = null;
        if ('ar_mdd_ratio_5_year' in r) r.ar_mdd_ratio_5_year = null;
        if ('max_drawdown_5_year' in r) r.max_drawdown_5_year = null;
      }
      if (years < 3) {
        if ('return_3_year' in r) r.return_3_year = null;
        if ('ar_mdd_ratio_3_year' in r) r.ar_mdd_ratio_3_year = null;
        if ('max_drawdown_3_year' in r) r.max_drawdown_3_year = null;
      }
    }
  } catch {}
}

function computeMedian(values = []) {
  try {
    const arr = (values || []).filter(v => Number.isFinite(v));
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } catch {
    return null;
  }
}

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
          return;
        }
        if (email) {
          await supabase.from('users').update(payload).eq('email', email);
          return;
        }
        if (customerId) {
          const { data } = await supabase.from('users').select('id').eq('stripe_customer_id', customerId).limit(1);
          const found = Array.isArray(data) && data[0]?.id;
          if (found) {
            await supabase.from('users').update(payload).eq('id', found);
          }
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
          if (plan === 'monthly') tier = 'monthly';
          else if (plan === 'annual') tier = 'annual';
          else if (plan === 'quarterly') tier = 'quarterly';
          // If plan not provided, try to infer from subscription price
          try {
            if (!plan && subscriptionId) {
              const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
              const price = sub?.items?.data?.[0]?.price;
              const nickname = (price?.nickname || '').toString().toLowerCase();
              const interval = price?.recurring?.interval;
              if (nickname.includes('annual') || interval === 'year') tier = 'annual';
              else if (nickname.includes('monthly') || interval === 'month') tier = 'monthly';
              else if (nickname.includes('quarter') || interval === 'quarter') tier = 'quarterly';
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
          let tier = 'free';
          if (status === 'active' || status === 'trialing') {
            // Determine tier from subscription price
            try {
              const expandedSub = await stripe.subscriptions.retrieve(sub.id, { expand: ['items.data.price'] });
              const price = expandedSub?.items?.data?.[0]?.price;
              const interval = price?.recurring?.interval;
              const nickname = (price?.nickname || '').toString().toLowerCase();
              if (interval === 'year' || nickname.includes('annual')) tier = 'annual';
              else if (interval === 'month' || nickname.includes('monthly')) tier = 'monthly';
              else if (interval === 'quarter' || nickname.includes('quarter')) tier = 'quarterly';
              else tier = 'paid';
            } catch {
              tier = 'paid';
            }
          }
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
        case 'charge.refunded': {
          // On refund, revert user to free (handles lifetime one‑time refunds as well)
          const charge = /** @type {any} */ (event.data.object);
          const customerId = (charge?.customer && typeof charge.customer === 'string') ? charge.customer : null;
          const email = (charge?.billing_details && charge.billing_details.email) ? String(charge.billing_details.email) : null;
          let handled = false;
          try {
            if (customerId) {
              const { data } = await supabase.from('users').select('id,email').eq('stripe_customer_id', customerId).limit(1);
              const user = Array.isArray(data) && data[0];
              if (user?.id) {
                await updateUserTier({ userId: user.id, email: user.email || email || null, tier: 'free', customerId, subscriptionId: null });
                handled = true;
              }
            }
            if (!handled && email) {
              await updateUserTier({ userId: null, email, tier: 'free', customerId: null, subscriptionId: null });
              handled = true;
            }
            // As a final fallback, try to resolve userId from PaymentIntent metadata (only for newer checkouts)
            if (!handled && charge?.payment_intent) {
              try {
                const pi = await stripe.paymentIntents.retrieve(typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent.id);
                const uid = pi?.metadata?.userId;
                if (uid) {
                  await updateUserTier({ userId: String(uid), email: email || null, tier: 'free', customerId: customerId || null, subscriptionId: null });
                  handled = true;
                }
              } catch (e) {}
            }
          } catch (e) {
            console.warn('charge.refunded handling error:', e?.message || e);
          }
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
    totalAssets: row.total_assets,
    totalEquity: row.total_equity,
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
    roic: row.roic,
    roic10YAvg: row.roic_10y_avg,
    roic10YStd: row.roic_10y_std,
    roicStability: row.roic_stability,
    roicStabilityScore: row.roic_stability_score,
    roicY1: row.roic_y1,
    roicY2: row.roic_y2,
    roicY3: row.roic_y3,
    roicY4: row.roic_y4,
    roicY5: row.roic_y5,
    roicY6: row.roic_y6,
    roicY7: row.roic_y7,
    roicY8: row.roic_y8,
    roicY9: row.roic_y9,
    roicY10: row.roic_y10,
    revenueY1: row.revenue_y1,
    revenueY2: row.revenue_y2,
    revenueY3: row.revenue_y3,
    revenueY4: row.revenue_y4,
    revenueY5: row.revenue_y5,
    revenueY6: row.revenue_y6,
    revenueY7: row.revenue_y7,
    revenueY8: row.revenue_y8,
    revenueY9: row.revenue_y9,
    revenueY10: row.revenue_y10,
    fcfY1: row.fcf_y1,
    fcfY2: row.fcf_y2,
    fcfY3: row.fcf_y3,
    fcfY4: row.fcf_y4,
    fcfY5: row.fcf_y5,
    fcfY6: row.fcf_y6,
    fcfY7: row.fcf_y7,
    fcfY8: row.fcf_y8,
    fcfY9: row.fcf_y9,
    fcfY10: row.fcf_y10,
    fcfMargin: row.fcf_margin,
    fcfMarginMedian10Y: row.fcf_margin_median_10y,
    debtToEquity: row.debt_to_equity,
    interestCoverage: row.interest_coverage,
    cashFlowToDebt: row.cash_flow_to_debt,
  };
}

export function setupRoutes(app, supabase) {
  const isAuthenticated = createAuthMiddleware(supabase);
  const requireAdmin = (function createAdminGuard() {
    const adminEmails = String(process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    const adminToken = process.env.ADMIN_API_TOKEN || '';
    return async function requireAdmin(req, res, next) {
      try {
        const xToken = req.headers['x-admin-token'];
        if (adminToken && typeof xToken === 'string' && xToken === adminToken) {
          return next();
        }
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
        if (!token) return res.status(401).json({ message: 'Unauthorized' });
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data?.user) return res.status(401).json({ message: 'Unauthorized' });
        const email = String(data.user.email || '').toLowerCase();
        if (!adminEmails.length || !adminEmails.includes(email)) {
          return res.status(403).json({ message: 'Forbidden' });
        }
        req.user = data.user;
        return next();
      } catch {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    };
  })();

  // Initialize Sentry for server errors (non-blocking, only if DSN present)
  try {
    const dsn = process.env.SENTRY_DSN;
    if (dsn) {
      import('@sentry/node').then((mod) => {
        try {
          const Sentry = (mod && (mod.default || mod));
          Sentry.init({
            dsn,
            environment: process.env.SENTRY_ENV || 'production',
            tracesSampleRate: 0.0,
          });
          // Attach basic handlers (safe if express)
          try { app.use(Sentry.Handlers.requestHandler()); } catch {}
          try { app.use(Sentry.Handlers.tracingHandler?.()); } catch {}
        } catch (e) {
          console.warn('Sentry init failed', e?.message || e);
        }
      }).catch(() => {});
    }
  } catch {}

  // In-memory cache for /api/config flags
  let cachedFlags = { flags: {}, ts: 0 };
  const FLAGS_TTL_MS = 60 * 1000;

  app.get('/api/config', async (_req, res) => {
    try {
      if (Date.now() - cachedFlags.ts < FLAGS_TTL_MS) {
        return res.json(cachedFlags);
      }
      let flags = {};
      try {
        const { data, error } = await supabase.from('feature_flags').select('key, enabled, rollout_percent, allowlist_emails');
        if (!error && Array.isArray(data)) {
          for (const r of data) {
            if (!r?.key) continue;
            flags[r.key] = {
              enabled: !!r.enabled,
              rolloutPercent: (typeof r.rollout_percent === 'number') ? r.rollout_percent : undefined,
              allowlistEmails: Array.isArray(r.allowlist_emails) ? r.allowlist_emails : undefined,
            };
          }
        }
      } catch {}
      // Safe defaults if table is missing
      if (!Object.keys(flags).length) {
        flags = {
          education: { enabled: false },
        };
      }
      cachedFlags = { flags, ts: Date.now() };
      res.set('Cache-Control', 'no-store');
      return res.json(cachedFlags);
    } catch (e) {
      return res.json({ flags: { education: { enabled: false } } });
    }
  });

  // Recompute 10Y FCF margin median (and store revenue/fcf history) for selected symbols
  app.post('/api/metrics/recompute-fcf-margin-10y', requireAdmin, async (req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!symbols.length) return res.status(400).json({ message: 'Provide symbols as comma-separated list in ?symbols=' });
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };

      const recomputeOne = async (sym) => {
        try {
          const incomeUrl = `https://financialmodelingprep.com/stable/income-statement?symbol=${sym}&period=annual&limit=12&apikey=${apiKey}`;
          const cashUrl = `https://financialmodelingprep.com/stable/cash-flow-statement?symbol=${sym}&period=annual&limit=12&apikey=${apiKey}`;
          const income = await fetchJson(incomeUrl);
          const cash = await fetchJson(cashUrl);
          const incArr = Array.isArray(income) ? income : [];
          const cfArr = Array.isArray(cash) ? cash : [];
          const toNum = (val) => {
            const n = Number(val);
            return Number.isFinite(n) ? n : null;
          };
          const revSeries = [];
          const fcfSeries = [];
          const margins = [];
          const clamp = (val) => {
            if (!Number.isFinite(val)) return val;
            if (val > 2) return 2;
            if (val < -2) return -2;
            return val;
          };
          for (let i = 0; i < 10; i++) {
            const inc = incArr[i] || {};
            const cf = cfArr[i] || {};
            const rev = toNum(inc.revenue ?? inc.totalRevenue ?? inc.revenueTTM ?? inc.sales ?? inc.salesRevenueNet);
            const fcf = toNum(cf.freeCashFlow ?? cf.freeCashFlowTTM ?? cf.freeCashFlowPerShare);
            revSeries.push(rev);
            fcfSeries.push(fcf);
            if (rev !== null && rev !== 0 && fcf !== null) {
              const margin = clamp(fcf / rev);
              if (Number.isFinite(margin)) margins.push(margin);
            }
          }
          const padSeries = (arr) => {
            const out = [...arr];
            while (out.length < 10) out.push(null);
            return out.slice(0, 10);
          };
          const revCols = padSeries(revSeries);
          const fcfCols = padSeries(fcfSeries);
          const assignYears = (prefix, series) => {
            const obj = {};
            for (let i = 0; i < 10; i++) {
              obj[`${prefix}_y${i + 1}`] = series[i] ?? null;
            }
            return obj;
          };
          const median = computeMedian(margins);
          const upd = {
            ...assignYears('revenue', revCols),
            ...assignYears('fcf', fcfCols),
            fcf_margin_median_10y: median,
          };
          for (const t of tables) {
            try { await supabase.from(t).update(upd).eq('symbol', sym); } catch {}
          }
          return { symbol: sym, updated: true, median };
        } catch (e) {
          return { symbol: sym, updated: false, error: e?.message || 'unknown' };
        }
      };

      const results = [];
      for (const sym of symbols) {
        results.push(await recomputeOne(sym));
        await new Promise(r => setTimeout(r, 150));
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('metrics/recompute-fcf-margin-10y error:', e);
      return res.status(500).json({ message: 'Failed to recompute FCF margin history' });
    }
  });

  // Recompute 10Y FCF margin median for all known symbols
  // Batch processing endpoint - processes symbols in chunks to avoid timeout
  app.post('/api/metrics/recompute-fcf-margin-10y-batch', requireAdmin, async (req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      
      const offset = parseInt(req.query.offset || '0', 10);
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 100); // Max 100 per batch
      
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
      const symSet = new Set();
      for (const t of tables) {
        try {
          const { data } = await supabase.from(t).select('symbol');
          for (const r of (data || [])) if (r?.symbol) symSet.add(String(r.symbol).toUpperCase());
        } catch {}
      }
      const allSymbols = Array.from(symSet).sort();
      const total = allSymbols.length;
      const symbols = allSymbols.slice(offset, offset + limit);
      const hasMore = offset + limit < total;
      const recomputeOne = async (sym) => {
        try {
          const incomeUrl = `https://financialmodelingprep.com/stable/income-statement?symbol=${sym}&period=annual&limit=12&apikey=${apiKey}`;
          const cashUrl = `https://financialmodelingprep.com/stable/cash-flow-statement?symbol=${sym}&period=annual&limit=12&apikey=${apiKey}`;
          const income = await fetchJson(incomeUrl);
          const cash = await fetchJson(cashUrl);
          const incArr = Array.isArray(income) ? income : [];
          const cfArr = Array.isArray(cash) ? cash : [];
          const toNum = (val) => {
            const n = Number(val);
            return Number.isFinite(n) ? n : null;
          };
          const revSeries = [];
          const fcfSeries = [];
          const margins = [];
          const clamp = (val) => {
            if (!Number.isFinite(val)) return val;
            if (val > 2) return 2;
            if (val < -2) return -2;
            return val;
          };
          for (let i = 0; i < 10; i++) {
            const inc = incArr[i] || {};
            const cf = cfArr[i] || {};
            const rev = toNum(inc.revenue ?? inc.totalRevenue ?? inc.revenueTTM ?? inc.sales ?? inc.salesRevenueNet);
            const fcf = toNum(cf.freeCashFlow ?? cf.freeCashFlowTTM ?? cf.freeCashFlowPerShare);
            revSeries.push(rev);
            fcfSeries.push(fcf);
            if (rev !== null && rev !== 0 && fcf !== null) {
              const margin = clamp(fcf / rev);
              if (Number.isFinite(margin)) margins.push(margin);
            }
          }
          const padSeries = (arr) => {
            const out = [...arr];
            while (out.length < 10) out.push(null);
            return out.slice(0, 10);
          };
          const assignYears = (prefix, series) => {
            const obj = {};
            for (let i = 0; i < 10; i++) {
              obj[`${prefix}_y${i + 1}`] = series[i] ?? null;
            }
            return obj;
          };
          const revCols = padSeries(revSeries);
          const fcfCols = padSeries(fcfSeries);
          const median = computeMedian(margins);
          const upd = {
            ...assignYears('revenue', revCols),
            ...assignYears('fcf', fcfCols),
            fcf_margin_median_10y: median,
          };
          for (const t of tables) {
            try { await supabase.from(t).update(upd).eq('symbol', sym); } catch {}
          }
          return { symbol: sym, updated: true, median };
        } catch (e) {
          return { symbol: sym, updated: false, error: e?.message || 'unknown' };
        }
      };

      const results = [];
      for (const sym of symbols) {
        results.push(await recomputeOne(sym));
        await new Promise(r => setTimeout(r, 150));
      }
      
      return res.json({
        status: 'ok',
        processed: results.length,
        offset,
        total,
        hasMore,
        nextOffset: hasMore ? offset + limit : null,
        progress: total > 0 ? Math.round((offset + results.length) / total * 100) : 0,
        results
      });
    } catch (e) {
      console.error('metrics/recompute-fcf-margin-10y-batch error:', e);
      return res.status(500).json({ message: 'Failed to recompute FCF margins batch' });
    }
  });

  app.post('/api/metrics/recompute-fcf-margin-10y-all', requireAdmin, async (_req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
      const symSet = new Set();
      for (const t of tables) {
        try {
          const { data } = await supabase.from(t).select('symbol');
          for (const r of (data || [])) if (r?.symbol) symSet.add(String(r.symbol).toUpperCase());
        } catch {}
      }
      const symbols = Array.from(symSet);
      const recomputeOne = async (sym) => {
        try {
          const incomeUrl = `https://financialmodelingprep.com/stable/income-statement?symbol=${sym}&period=annual&limit=12&apikey=${apiKey}`;
          const cashUrl = `https://financialmodelingprep.com/stable/cash-flow-statement?symbol=${sym}&period=annual&limit=12&apikey=${apiKey}`;
          const income = await fetchJson(incomeUrl);
          const cash = await fetchJson(cashUrl);
          const incArr = Array.isArray(income) ? income : [];
          const cfArr = Array.isArray(cash) ? cash : [];
          const toNum = (val) => {
            const n = Number(val);
            return Number.isFinite(n) ? n : null;
          };
          const revSeries = [];
          const fcfSeries = [];
          const margins = [];
          const clamp = (val) => {
            if (!Number.isFinite(val)) return val;
            if (val > 2) return 2;
            if (val < -2) return -2;
            return val;
          };
          for (let i = 0; i < 10; i++) {
            const inc = incArr[i] || {};
            const cf = cfArr[i] || {};
            const rev = toNum(inc.revenue ?? inc.totalRevenue ?? inc.revenueTTM ?? inc.sales ?? inc.salesRevenueNet);
            const fcf = toNum(cf.freeCashFlow ?? cf.freeCashFlowTTM ?? cf.freeCashFlowPerShare);
            revSeries.push(rev);
            fcfSeries.push(fcf);
            if (rev !== null && rev !== 0 && fcf !== null) {
              const margin = clamp(fcf / rev);
              if (Number.isFinite(margin)) margins.push(margin);
            }
          }
          const padSeries = (arr) => {
            const out = [...arr];
            while (out.length < 10) out.push(null);
            return out.slice(0, 10);
          };
          const assignYears = (prefix, series) => {
            const obj = {};
            for (let i = 0; i < 10; i++) {
              obj[`${prefix}_y${i + 1}`] = series[i] ?? null;
            }
            return obj;
          };
          const revCols = padSeries(revSeries);
          const fcfCols = padSeries(fcfSeries);
          const median = computeMedian(margins);
          const upd = {
            ...assignYears('revenue', revCols),
            ...assignYears('fcf', fcfCols),
            fcf_margin_median_10y: median,
          };
          for (const t of tables) {
            try { await supabase.from(t).update(upd).eq('symbol', sym); } catch {}
          }
          return { symbol: sym, updated: true, median };
        } catch (e) {
          return { symbol: sym, updated: false, error: e?.message || 'unknown' };
        }
      };

      // Warn: this endpoint may timeout for large datasets. Use batch endpoint instead.
      const results = [];
      for (const sym of symbols) {
        results.push(await recomputeOne(sym));
        await new Promise(r => setTimeout(r, 150));
      }
      return res.json({ status: 'ok', count: results.length, results });
    } catch (e) {
      console.error('metrics/recompute-fcf-margin-10y-all error:', e);
      return res.status(500).json({ message: 'Failed to recompute FCF margins for all' });
    }
  });

  // Recompute Debt-to-Equity and Interest Coverage ratios from FMP API (annual data)
  app.post('/api/metrics/recompute-debt-ratios', requireAdmin, async (req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!symbols.length) return res.status(400).json({ message: 'symbols parameter required' });

      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      const results = [];

      // Debug symbols for logging
      const debugSymbols = ['MCD', 'PM', 'AAPL', 'BA'];
      
      for (const sym of symbols) {
        try {
          // Fetch annual ratios from FMP API
          const ratiosData = await fetchJson(`https://financialmodelingprep.com/stable/ratios?symbol=${sym}&period=annual&limit=1&apikey=${apiKey}`);
          const ratio = Array.isArray(ratiosData) && ratiosData[0] ? ratiosData[0] : null;

          // Debug logging for companies with missing data
          if (debugSymbols.includes(sym)) {
            console.log(`[${sym}] FMP API ratios response:`, {
              isArray: Array.isArray(ratiosData),
              arrayLength: Array.isArray(ratiosData) ? ratiosData.length : 0,
              hasRatio: !!ratio,
              debtEquityRatio: ratio?.debtEquityRatio,
              interestCoverage: ratio?.interestCoverage,
              allDebtEquityKeys: ratio ? Object.keys(ratio).filter(k => k.toLowerCase().includes('debt') && k.toLowerCase().includes('equity')) : [],
              allInterestKeys: ratio ? Object.keys(ratio).filter(k => k.toLowerCase().includes('interest') || k.toLowerCase().includes('coverage')) : []
            });
          }

          // Extract Debt-to-Equity and Interest Coverage directly from FMP API
          // Take values as-is from the API without modifications (negative values are OK, 0 is OK)
          let debtToEquity = null;
          if (ratio && ratio.debtEquityRatio !== undefined && ratio.debtEquityRatio !== null) {
            debtToEquity = Number(ratio.debtEquityRatio);
          }

          let interestCoverage = null;
          if (ratio && ratio.interestCoverage !== undefined && ratio.interestCoverage !== null) {
            interestCoverage = Number(ratio.interestCoverage);
          }

          // Only cap extremely high values that are likely errors (keep negative values and 0 as-is)
          if (isFinite(debtToEquity) && debtToEquity > 10000) {
            debtToEquity = 10000; // Cap extremely high values only
          }
          if (isFinite(interestCoverage) && interestCoverage > 100000) {
            interestCoverage = 100000; // Cap extremely high values only
          }

          const upd = {
            debt_to_equity: (debtToEquity !== null && isFinite(debtToEquity)) ? Number(debtToEquity.toFixed(4)) : null,
            interest_coverage: (interestCoverage !== null && isFinite(interestCoverage)) ? Number(interestCoverage.toFixed(4)) : null,
          };

          if (debugSymbols.includes(sym)) {
            console.log(`[${sym}] Updating tables (single) with values:`, upd);
          }

          for (const t of tables) {
            try {
              // First check if record exists
              const { data: existing } = await supabase.from(t).select('symbol').eq('symbol', sym).limit(1);
              
              if (debugSymbols.includes(sym)) {
                console.log(`[${sym}] Checking ${t}: exists=${!!existing && existing.length > 0}`);
              }
              
              if (existing && existing.length > 0) {
                const { error, data } = await supabase.from(t).update(upd).eq('symbol', sym).select('interest_coverage, debt_to_equity');
                if (debugSymbols.includes(sym)) {
                  if (error) {
                    console.log(`[${sym}] ❌ Error updating ${t} (single):`, error);
                  } else {
                    console.log(`[${sym}] ✅ Successfully updated ${t} (single), new values:`, {
                      interest_coverage: data?.[0]?.interest_coverage,
                      debt_to_equity: data?.[0]?.debt_to_equity,
                      rowsAffected: data?.length || 0
                    });
                  }
                }
              } else {
                if (debugSymbols.includes(sym)) {
                  console.log(`[${sym}] ⚠️ Symbol not found in ${t}, skipping update`);
                }
              }
            } catch (e) {
              if (debugSymbols.includes(sym)) {
                console.log(`[${sym}] ❌ Exception updating ${t} (single):`, e?.message);
              }
            }
          }

          results.push({ 
            symbol: sym, 
            updated: true, 
            debtToEquity: upd.debt_to_equity,
            interestCoverage: upd.interest_coverage
          });
          await new Promise(r => setTimeout(r, 150));
        } catch (e) {
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('metrics/recompute-debt-ratios error:', e);
      return res.status(500).json({ message: 'Failed to recompute debt ratios' });
    }
  });

  // Batch processing for debt ratios to avoid timeout
  app.post('/api/metrics/recompute-debt-ratios-batch', requireAdmin, async (req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      
      const offset = parseInt(req.query.offset || '0', 10);
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
      
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
      const symSet = new Set();
      for (const t of tables) {
        try {
          const { data } = await supabase.from(t).select('symbol');
          for (const r of (data || [])) if (r?.symbol) symSet.add(String(r.symbol).toUpperCase());
        } catch {}
      }
      const allSymbols = Array.from(symSet).sort();
      const total = allSymbols.length;
      const symbols = allSymbols.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      // Debug symbols for logging
      const debugSymbols = ['MCD', 'PM', 'AAPL', 'BA', 'DPZ', 'FICO', 'BKNG', 'ORLY', 'MTD', 'OTIS'];

      const results = [];
      for (const sym of symbols) {
        try {
          const ratiosData = await fetchJson(`https://financialmodelingprep.com/stable/ratios?symbol=${sym}&period=annual&limit=1&apikey=${apiKey}`);
          const ratio = Array.isArray(ratiosData) && ratiosData[0] ? ratiosData[0] : null;

          // Debug logging for companies with missing data
          if (debugSymbols.includes(sym)) {
            console.log(`[${sym}] FMP API ratios response:`, {
              isArray: Array.isArray(ratiosData),
              arrayLength: Array.isArray(ratiosData) ? ratiosData.length : 0,
              hasRatio: !!ratio,
              debtEquityRatio: ratio?.debtEquityRatio,
              interestCoverage: ratio?.interestCoverage,
              allDebtEquityKeys: ratio ? Object.keys(ratio).filter(k => k.toLowerCase().includes('debt') && k.toLowerCase().includes('equity')) : [],
              allInterestKeys: ratio ? Object.keys(ratio).filter(k => k.toLowerCase().includes('interest') || k.toLowerCase().includes('coverage')) : []
            });
          }

          // Extract Debt-to-Equity and Interest Coverage directly from FMP API
          // Take values as-is from the API without modifications (negative values are OK, 0 is OK)
          let debtToEquity = null;
          if (ratio && ratio.debtEquityRatio !== undefined && ratio.debtEquityRatio !== null) {
            debtToEquity = Number(ratio.debtEquityRatio);
          }

          let interestCoverage = null;
          if (ratio && ratio.interestCoverage !== undefined && ratio.interestCoverage !== null) {
            interestCoverage = Number(ratio.interestCoverage);
          }

          let cashFlowToDebt = null;
          if (ratio && ratio.cashFlowToDebtRatio !== undefined && ratio.cashFlowToDebtRatio !== null) {
            cashFlowToDebt = Number(ratio.cashFlowToDebtRatio);
          }

          // Only cap extremely high values that are likely errors (keep negative values and 0 as-is)
          if (isFinite(debtToEquity) && debtToEquity > 10000) {
            debtToEquity = 10000; // Cap extremely high values only
          }
          if (isFinite(interestCoverage) && interestCoverage > 100000) {
            interestCoverage = 100000; // Cap extremely high values only
          }
          if (isFinite(cashFlowToDebt) && cashFlowToDebt > 10000) {
            cashFlowToDebt = 10000; // Cap extremely high values only
          }

          if (debugSymbols.includes(sym)) {
            console.log(`[${sym}] After validation (batch) - debtToEquity: ${debtToEquity}, interestCoverage: ${interestCoverage}, cashFlowToDebt: ${cashFlowToDebt}`);
          }

          const upd = {
            debt_to_equity: (debtToEquity !== null && isFinite(debtToEquity)) ? Number(debtToEquity.toFixed(4)) : null,
            interest_coverage: (interestCoverage !== null && isFinite(interestCoverage)) ? Number(interestCoverage.toFixed(4)) : null,
            cash_flow_to_debt: (cashFlowToDebt !== null && isFinite(cashFlowToDebt)) ? Number(cashFlowToDebt.toFixed(4)) : null,
          };

          if (debugSymbols.includes(sym)) {
            console.log(`[${sym}] Updating tables (batch) with values:`, upd);
          }

          for (const t of tables) {
            try {
              // First check if record exists
              const { data: existing } = await supabase.from(t).select('symbol').eq('symbol', sym).limit(1);
              
              if (debugSymbols.includes(sym)) {
                console.log(`[${sym}] Checking ${t} (batch): exists=${!!existing && existing.length > 0}`);
              }
              
              if (existing && existing.length > 0) {
                const { error, data } = await supabase.from(t).update(upd).eq('symbol', sym).select('interest_coverage, debt_to_equity');
                if (debugSymbols.includes(sym)) {
                  if (error) {
                    console.log(`[${sym}] ❌ Error updating ${t} (batch):`, error);
                  } else {
                    console.log(`[${sym}] ✅ Successfully updated ${t} (batch), new values:`, {
                      interest_coverage: data?.[0]?.interest_coverage,
                      debt_to_equity: data?.[0]?.debt_to_equity,
                      rowsAffected: data?.length || 0
                    });
                  }
                }
              } else {
                if (debugSymbols.includes(sym)) {
                  console.log(`[${sym}] ⚠️ Symbol not found in ${t} (batch), skipping update`);
                }
              }
            } catch (e) {
              if (debugSymbols.includes(sym)) {
                console.log(`[${sym}] ❌ Exception updating ${t} (batch):`, e?.message);
              }
            }
          }

          results.push({ 
            symbol: sym, 
            updated: true, 
            debtToEquity: upd.debt_to_equity,
            interestCoverage: upd.interest_coverage
          });
          await new Promise(r => setTimeout(r, 150));
        } catch (e) {
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
      }
      
      return res.json({
        status: 'ok',
        processed: results.length,
        offset,
        total,
        hasMore,
        nextOffset: hasMore ? offset + limit : null,
        progress: total > 0 ? Math.round((offset + results.length) / total * 100) : 0,
        results
      });
    } catch (e) {
      console.error('metrics/recompute-debt-ratios-batch error:', e);
      return res.status(500).json({ message: 'Failed to recompute debt ratios batch' });
    }
  });

  // Auto-process all companies in batches (admin only)
  app.post('/api/metrics/recompute-debt-ratios-all', requireAdmin, async (req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
      const symSet = new Set();
      for (const t of tables) {
        try {
          const { data } = await supabase.from(t).select('symbol');
          for (const r of (data || [])) if (r?.symbol) symSet.add(String(r.symbol).toUpperCase());
        } catch {}
      }
      const allSymbols = Array.from(symSet).sort();
      const total = allSymbols.length;
      
      console.log(`🚀 Starting mass recompute for ${total} companies...`);
      
      // Process in background, return immediately
      (async () => {
        const batchSize = 50;
        let processed = 0;
        let successCount = 0;
        
        for (let i = 0; i < allSymbols.length; i += batchSize) {
          const batch = allSymbols.slice(i, i + batchSize);
          
          for (const sym of batch) {
            try {
              const ratiosData = await fetchJson(`https://financialmodelingprep.com/stable/ratios?symbol=${sym}&period=annual&limit=1&apikey=${apiKey}`);
              const ratio = Array.isArray(ratiosData) && ratiosData[0] ? ratiosData[0] : null;

              let debtToEquity = null;
              if (ratio && ratio.debtEquityRatio !== undefined && ratio.debtEquityRatio !== null) {
                debtToEquity = Number(ratio.debtEquityRatio);
              }

              let interestCoverage = null;
              if (ratio && ratio.interestCoverage !== undefined && ratio.interestCoverage !== null) {
                interestCoverage = Number(ratio.interestCoverage);
              }

              let cashFlowToDebt = null;
              if (ratio && ratio.cashFlowToDebtRatio !== undefined && ratio.cashFlowToDebtRatio !== null) {
                cashFlowToDebt = Number(ratio.cashFlowToDebtRatio);
              }

              // Only cap extremely high values
              if (isFinite(debtToEquity) && debtToEquity > 10000) debtToEquity = 10000;
              if (isFinite(interestCoverage) && interestCoverage > 100000) interestCoverage = 100000;
              if (isFinite(cashFlowToDebt) && cashFlowToDebt > 10000) cashFlowToDebt = 10000;

              const upd = {
                debt_to_equity: (debtToEquity !== null && isFinite(debtToEquity)) ? Number(debtToEquity.toFixed(4)) : null,
                interest_coverage: (interestCoverage !== null && isFinite(interestCoverage)) ? Number(interestCoverage.toFixed(4)) : null,
                cash_flow_to_debt: (cashFlowToDebt !== null && isFinite(cashFlowToDebt)) ? Number(cashFlowToDebt.toFixed(4)) : null,
              };

              for (const t of tables) {
                try {
                  const { data: existing } = await supabase.from(t).select('symbol').eq('symbol', sym).limit(1);
                  if (existing && existing.length > 0) {
                    await supabase.from(t).update(upd).eq('symbol', sym);
                  }
                } catch {}
              }

              successCount++;
              processed++;
              
              if (processed % 50 === 0) {
                console.log(`📊 Progress: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
              }
              
              await new Promise(r => setTimeout(r, 150)); // Rate limiting
            } catch (e) {
              processed++;
              console.error(`[${sym}] Error:`, e.message);
            }
          }
        }
        
        console.log(`✅ Mass recompute completed: ${successCount}/${total} companies updated`);
      })();
      
      return res.json({ 
        status: 'started', 
        total: allSymbols.length,
        message: 'Mass recompute started in background. Check server logs for progress.'
      });
    } catch (e) {
      console.error('recompute-debt-ratios-all error:', e);
      return res.status(500).json({ message: 'Failed to start mass recompute', error: e.message });
    }
  });

  // Recompute DuPont (Asset Turnover, Financial Leverage, ROE) for given symbols
  app.post('/api/dupont/recompute', requireAdmin, async (req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!symbols.length) return res.status(400).json({ message: 'Provide symbols as comma-separated list in ?symbols=' });

      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
      const tables = ['sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'companies'];
      const results = [];

      for (const sym of symbols) {
        try {
          // read revenue and netIncome from any table where exists (prefer index tables)
          let src = null;
          for (const t of tables) {
            const { data, error } = await supabase.from(t).select('revenue, net_income').eq('symbol', sym).limit(1);
            if (!error && Array.isArray(data) && data[0]) { src = { table: t, row: data[0] }; break; }
          }
          if (!src) { results.push({ symbol: sym, updated: false, error: 'symbol not found' }); continue; }
          const revenue = Number(src.row?.revenue);
          const netIncome = Number(src.row?.net_income);

          // pull latest totalAssets / totalEquity
          const bs = await fetchJson(`https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${sym}&period=annual&limit=1&apikey=${apiKey}`);
          const latest = Array.isArray(bs) && bs[0];
          const totalAssets = Number(latest?.totalAssets);
          const totalEquity = Number(latest?.totalStockholdersEquity);
          if (!isFinite(totalAssets) || totalAssets === 0) { results.push({ symbol: sym, updated: false, error: 'no totalAssets' }); continue; }
          if (!isFinite(revenue) || !isFinite(netIncome)) { results.push({ symbol: sym, updated: false, error: 'no revenue/netIncome' }); continue; }

          const assetTurnover = revenue / totalAssets;
          const financialLeverage = (isFinite(totalEquity) && totalEquity > 0) ? (totalAssets / totalEquity) : null;
          const roe = (isFinite(totalEquity) && totalEquity > 0) ? (netIncome / totalEquity) : null;

          const upd = {
            total_assets: isFinite(totalAssets) ? totalAssets : null,
            total_equity: isFinite(totalEquity) ? totalEquity : null,
            asset_turnover: isFinite(assetTurnover) ? Number(assetTurnover.toFixed(4)) : null,
            financial_leverage: isFinite(financialLeverage) ? Number(financialLeverage.toFixed(4)) : null,
            roe: isFinite(roe) ? Number(roe.toFixed(4)) : null,
          };
          for (const t of tables) {
            await supabase.from(t).update(upd).eq('symbol', sym);
          }
          results.push({ symbol: sym, updated: true, ...upd });
          await new Promise(r => setTimeout(r, 200));
        } catch (e) {
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('dupont/recompute error:', e);
      return res.status(500).json({ message: 'Failed to recompute DuPont' });
    }
  });

  // Recompute calculated metrics (P/S, Net Profit Margin) for given symbols
  app.post('/api/metrics/recompute-calculated', requireAdmin, async (req, res) => {
    try {
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!symbols.length) return res.status(400).json({ message: 'Provide symbols as comma-separated list in ?symbols=' });
      const tables = ['sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'companies'];
      const results = [];

      for (const sym of symbols) {
        try {
          // read market_cap, revenue, net_income from any table available
          let row = null;
          for (const t of tables) {
            const { data } = await supabase.from(t).select('market_cap,revenue,net_income').eq('symbol', sym).limit(1);
            if (Array.isArray(data) && data[0]) { row = data[0]; break; }
          }
          if (!row) { results.push({ symbol: sym, updated: false, error: 'symbol not found' }); continue; }
          const marketCap = Number(row.market_cap);
          const revenue = Number(row.revenue);
          const netIncome = Number(row.net_income);
          if (!isFinite(marketCap) || !isFinite(revenue) || !isFinite(netIncome) || revenue === 0) {
            results.push({ symbol: sym, updated: false, error: 'invalid inputs' }); continue;
          }
          const priceToSalesRatio = marketCap / revenue;
          const netProfitMargin = (netIncome / revenue) * 100;
          const upd = {
            price_to_sales_ratio: Number(priceToSalesRatio.toFixed(2)),
            net_profit_margin: Number(netProfitMargin.toFixed(2)),
          };
          for (const t of tables) {
            await supabase.from(t).update(upd).eq('symbol', sym);
          }
          results.push({ symbol: sym, updated: true, ...upd });
        } catch (e) {
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('metrics/recompute-calculated error:', e);
      return res.status(500).json({ message: 'Failed to recompute calculated metrics' });
    }
  });

  // Recompute drawdowns (3/5/10Y Max Drawdown) for given symbols
  app.post('/api/drawdown/recompute', requireAdmin, async (req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!symbols.length) return res.status(400).json({ message: 'Provide symbols as comma-separated list in ?symbols=' });
      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
      const tables = ['sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'companies'];
      const results = [];

      const calcMdd = (series) => {
        let peak = series[0]; let maxDD = 0;
        for (const v of series) {
          if (v > peak) peak = v;
          const dd = (peak - v) / peak;
          if (dd > maxDD) maxDD = dd;
        }
        return maxDD * 100;
      };

      for (const sym of symbols) {
        try {
          const now = new Date();
          const to = now.toISOString().split('T')[0];
          const tenYearsAgo = new Date(now); tenYearsAgo.setFullYear(now.getFullYear() - 10);
          const from10 = tenYearsAgo.toISOString().split('T')[0];
          const data = await fetchJson(`https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${sym}&from=${from10}&to=${to}&apikey=${apiKey}`);
          const hist = Array.isArray(data?.historical) ? data.historical.slice().sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
          if (!hist.length) {
            const upd = { max_drawdown_3_year: null, max_drawdown_5_year: null, max_drawdown_10_year: null };
            for (const t of tables) { await supabase.from(t).update(upd).eq('symbol', sym); }
            results.push({ symbol: sym, updated: true, note: 'no history' });
            continue;
          }
          const fiveYearsAgo = new Date(now); fiveYearsAgo.setFullYear(now.getFullYear() - 5);
          const threeYearsAgo = new Date(now); threeYearsAgo.setFullYear(now.getFullYear() - 3);
          const earliest = new Date(hist[0].date);
          const series10 = hist.map(p => Number(p.close)).filter(isFinite);
          const series5 = earliest <= fiveYearsAgo ? hist.filter(p => new Date(p.date) >= fiveYearsAgo).map(p => Number(p.close)).filter(isFinite) : [];
          const series3 = earliest <= threeYearsAgo ? hist.filter(p => new Date(p.date) >= threeYearsAgo).map(p => Number(p.close)).filter(isFinite) : [];
          const upd = {
            max_drawdown_10_year: series10.length > 1 ? Number(calcMdd(series10).toFixed(2)) : null,
            max_drawdown_5_year: series5.length > 1 ? Number(calcMdd(series5).toFixed(2)) : null,
            max_drawdown_3_year: series3.length > 1 ? Number(calcMdd(series3).toFixed(2)) : null,
          };
          for (const t of tables) { await supabase.from(t).update(upd).eq('symbol', sym); }
          results.push({ symbol: sym, updated: true, ...upd });
          await new Promise(r => setTimeout(r, 200));
        } catch (e) {
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('drawdown/recompute error:', e);
      return res.status(500).json({ message: 'Failed to recompute drawdown' });
    }
  });

  // Recompute ROIC for given symbols from FMP key metrics
  app.post('/api/metrics/recompute-roic', requireAdmin, async (req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!symbols.length) return res.status(400).json({ message: 'Provide symbols as comma-separated list in ?symbols=' });
      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      const results = [];
      for (const sym of symbols) {
        try {
          // Try annual first
          const kmData = await fetchJson(`https://financialmodelingprep.com/stable/key-metrics?symbol=${sym}&period=annual&limit=1&apikey=${apiKey}`);
          const km = Array.isArray(kmData) && kmData[0] ? kmData[0] : null;
          // Fallback to TTM endpoint if needed
          let roic = km && (km.roic !== undefined && km.roic !== null) ? Number(km.roic) : null;
          if (!(isFinite(roic))) {
            try {
              const ttm = await fetchJson(`https://financialmodelingprep.com/stable/key-metrics-ttm?symbol=${sym}&apikey=${apiKey}`);
              const t = Array.isArray(ttm) && ttm[0] ? ttm[0] : null;
              if (t && (t.roicTTM !== undefined && t.roicTTM !== null)) roic = Number(t.roicTTM);
            } catch {}
          }
          // Some projects expose ROIC as percentage; normalize to decimal if > 1.5 (likely 15% → 15)
          if (isFinite(roic) && roic > 1.5) roic = roic / 100;
          const upd = { roic: (isFinite(roic) ? Number(roic.toFixed(4)) : null) };
          for (const t of tables) {
            await supabase.from(t).update(upd).eq('symbol', sym);
          }
          results.push({ symbol: sym, updated: true, roic: upd.roic });
          await new Promise(r => setTimeout(r, 150));
        } catch (e) {
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('metrics/recompute-roic error:', e);
      return res.status(500).json({ message: 'Failed to recompute ROIC' });
    }
  });

  // Recompute ROIC for all known symbols (companies + index tables + FTSE100)
  app.post('/api/metrics/recompute-roic-all', requireAdmin, async (_req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      // collect unique symbols from all tables
      const symSet = new Set();
      for (const t of tables) {
        try {
          const { data } = await supabase.from(t).select('symbol');
          for (const r of (data || [])) if (r?.symbol) symSet.add(String(r.symbol).toUpperCase());
        } catch {}
      }
      const symbols = Array.from(symSet);
      const results = [];
      for (const sym of symbols) {
        try {
          const kmData = await fetchJson(`https://financialmodelingprep.com/stable/key-metrics?symbol=${sym}&period=annual&limit=1&apikey=${apiKey}`);
          const km = Array.isArray(kmData) && kmData[0] ? kmData[0] : null;
          let roic = km && (km.roic !== undefined && km.roic !== null) ? Number(km.roic) : null;
          if (!(isFinite(roic))) {
            try {
              const ttm = await fetchJson(`https://financialmodelingprep.com/stable/key-metrics-ttm?symbol=${sym}&apikey=${apiKey}`);
              const t = Array.isArray(ttm) && ttm[0] ? ttm[0] : null;
              if (t && (t.roicTTM !== undefined && t.roicTTM !== null)) roic = Number(t.roicTTM);
            } catch {}
          }
          if (isFinite(roic) && roic > 1.5) roic = roic / 100;
          const upd = { roic: (isFinite(roic) ? Number(roic.toFixed(4)) : null) };
          for (const t of tables) {
            await supabase.from(t).update(upd).eq('symbol', sym);
          }
          results.push({ symbol: sym, updated: true });
        } catch (e) {
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
        await new Promise(r => setTimeout(r, 120));
      }
      return res.json({ status: 'ok', count: results.length, results });
    } catch (e) {
      console.error('metrics/recompute-roic-all error:', e);
      return res.status(500).json({ message: 'Failed to recompute ROIC for all' });
    }
  });

  // Recompute 10Y ROIC series and average for all symbols
  app.post('/api/metrics/recompute-roic-10y-all', requireAdmin, async (_req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      const symSet = new Set();
      for (const t of tables) {
        try {
          const { data } = await supabase.from(t).select('symbol');
          for (const r of (data || [])) if (r?.symbol) symSet.add(String(r.symbol).toUpperCase());
        } catch {}
      }
      const symbols = Array.from(symSet);
      const results = [];
      for (const sym of symbols) {
        try {
          // Pull up to 12 annual entries to safely cover 10 years
          const kmData = await fetchJson(`https://financialmodelingprep.com/stable/key-metrics?symbol=${sym}&period=annual&limit=12&apikey=${apiKey}`);
          const arr = Array.isArray(kmData) ? kmData : [];
          // Normalize to latest first
          const series = arr.map(r => r && (r.roic ?? r.ROIC)).filter(v => v !== undefined && v !== null).map(Number);
          // Convert percent → decimal if likely percent
          // Convert to decimals and clamp per-year ROIC to a sane range (±200%) to reduce outliers
          const norm = series
            .map(v => (isFinite(v) && v > 1.5 ? v / 100 : v))
            .map(v => Math.max(-2, Math.min(2, v)))
            .filter(v => isFinite(v));
          let last10 = norm.slice(0, 10);
          // Fallback: if not enough annual ROIC points, derive from financial statements
          if (last10.length < 2) {
            try {
              const inc = await fetchJson(`https://financialmodelingprep.com/stable/income-statement?symbol=${sym}&period=annual&limit=12&apikey=${apiKey}`);
              const bal = await fetchJson(`https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${sym}&period=annual&limit=12&apikey=${apiKey}`);
              const incArr = Array.isArray(inc) ? inc : [];
              const balArr = Array.isArray(bal) ? bal : [];
              const len = Math.min(incArr.length, balArr.length, 10);
              const seq = [];
              for (let i = 0; i < len; i++) {
                const ii = incArr[i] || {};
                const bb = balArr[i] || {};
                const ebit = Number(ii.ebit ?? ii.operatingIncome);
                const preTax = Number(ii.incomeBeforeTax);
                const taxExp = Number(ii.incomeTaxExpense);
                const taxRate = Number.isFinite(preTax) && preTax > 0 && Number.isFinite(taxExp) ? Math.max(0, Math.min(0.5, taxExp / preTax)) : 0.21;
                const nopat = Number.isFinite(ebit) ? ebit * (1 - taxRate) : NaN;
                const totalDebt = Number(bb.totalDebt);
                const equity = Number(bb.totalStockholdersEquity);
                const cash = Number(bb.cashAndShortTermInvestments ?? bb.cashAndCashEquivalents);
                let invested = 0;
                if (Number.isFinite(totalDebt)) invested += totalDebt;
                if ( Number.isFinite(equity)) invested += equity;
                if (Number.isFinite(cash)) invested -= cash;
                if (!Number.isFinite(nopat) || !Number.isFinite(invested) || invested <= 0) continue;
                let roic = nopat / invested;
                if (!Number.isFinite(roic)) continue;
                // clamp to ±200% in decimal space
                if (roic > 2) roic = 2;
                if (roic < -2) roic = -2;
                seq.push(roic);
              }
              if (seq.length) last10 = seq.slice(0, 10);
            } catch {}
          }
          const padTo = (n, list) => {
            const out = [...list];
            while (out.length < n) out.push(null);
            return out;
          };
          const y = padTo(10, last10);
          const vals = y.filter(v => v !== null).map(v => Number(v));
          const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
          let std = null;
          if (vals.length >= 2 && avg !== null) {
            const variance = vals.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / vals.length; // population std
            std = Math.sqrt(variance);
          }
          const upd = {
            roic_y1: y[0], roic_y2: y[1], roic_y3: y[2], roic_y4: y[3], roic_y5: y[4],
            roic_y6: y[5], roic_y7: y[6], roic_y8: y[7], roic_y9: y[8], roic_y10: y[9],
            roic_10y_avg: avg,
            roic_10y_std: std,
          };
          for (const t of tables) {
            try { await supabase.from(t).update(upd).eq('symbol', sym); } catch {}
          }
          results.push({ symbol: sym, updated: true, avg });
        } catch (e) {
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
        await new Promise(r => setTimeout(r, 120));
      }
      return res.json({ status: 'ok', count: results.length, results });
    } catch (e) {
      console.error('metrics/recompute-roic-10y-all error:', e);
      return res.status(500).json({ message: 'Failed to recompute ROIC 10Y for all' });
    }
  });
  // Recompute Margin of Safety for all rows based on current DCF EV and Market Cap
  app.post('/api/dcf/recompute-mos-all', requireAdmin, async (_req, res) => {
    try {
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies'];
      const results = [];
      for (const t of tables) {
        try {
          const { data, error } = await supabase.from(t).select('symbol, dcf_enterprise_value, market_cap');
          if (error) { results.push({ table: t, updated: 0, error: error.message }); continue; }
          let updated = 0;
          for (const row of (data || [])) {
            const dcf = Number(row?.dcf_enterprise_value);
            const mcap = Number(row?.market_cap);
            let mos = null;
            if (isFinite(dcf) && dcf > 0 && isFinite(mcap) && mcap > 0) {
              mos = 1 - (mcap / dcf);
              if (isFinite(mos) && mos < -1) mos = -1; // clamp to -100%
            }
            await supabase.from(t).update({ margin_of_safety: mos }).eq('symbol', row.symbol);
            updated++;
          }
          results.push({ table: t, updated });
        } catch (e) {
          results.push({ table: t, updated: 0, error: e?.message || 'unknown' });
        }
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('dcf/recompute-mos-all error:', e);
      return res.status(500).json({ message: 'Failed to recompute MoS for all tables' });
    }
  });

  // Aggregate existing per-year ROIC columns (roic_y1..roic_y10) to roic_10y_avg / roic_10y_std (no external API)
  app.post('/api/metrics/aggregate-roic-10y', requireAdmin, async (req, res) => {
    try {
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const only = symbolsParam ? symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : null;
      const results = [];
      for (const t of tables) {
        let rows = [];
        try {
          let q = supabase.from(t).select('*');
          if (only && only.length) q = q.in('symbol', only);
          const { data, error } = await q;
          if (error) { results.push({ table: t, updated: 0, error: error.message }); continue; }
          rows = data || [];
        } catch (e) {
          results.push({ table: t, updated: 0, error: e?.message || 'select error' });
          continue;
        }
        let updated = 0, inspected = 0;
        for (const r of rows) {
          inspected++;
          const seq = [];
          for (let i = 1; i <= 10; i++) {
            const k = `roic_y${i}`;
            if (Object.prototype.hasOwnProperty.call(r, k) && r[k] !== null && r[k] !== undefined) {
              const val = Number(r[k]);
              if (Number.isFinite(val)) seq.push(val);
            }
          }
          if (!seq.length) continue;
          const mean = seq.reduce((a, b) => a + b, 0) / seq.length;
          let stdev = null;
          if (seq.length >= 2) {
            const variance = seq.reduce((acc, x) => acc + (x - mean) * (x - mean), 0) / seq.length;
            stdev = Math.sqrt(variance);
          }
          try {
            await supabase.from(t).update({ roic_10y_avg: mean, roic_10y_std: stdev }).eq('symbol', r.symbol);
            updated++;
          } catch (e) {
            results.push({ table: t, symbol: r.symbol, error: e?.message || 'update error' });
          }
        }
        results.push({ table: t, updated, inspected, total: rows.length });
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('metrics/aggregate-roic-10y error:', e);
      return res.status(500).json({ message: 'Failed to aggregate ROIC 10Y from DB' });
    }
  });
  // Recompute 10Y ROIC series and average for specific symbols
  app.post('/api/metrics/recompute-roic-10y', requireAdmin, async (req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      const symbolsParam = (req.query.symbols || req.body?.symbols || '').toString();
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (!symbols.length) return res.status(400).json({ message: 'Provide symbols as comma-separated list in ?symbols=' });
      const results = [];
      for (const sym of symbols) {
        try {
          const kmData = await fetchJson(`https://financialmodelingprep.com/stable/key-metrics?symbol=${sym}&period=annual&limit=12&apikey=${apiKey}`);
          const arr = Array.isArray(kmData) ? kmData : [];
          const series = arr.map(r => r && (r.roic ?? r.ROIC)).filter(v => v !== undefined && v !== null).map(Number);
          let norm = series
            .map(v => (isFinite(v) && v > 1.5 ? v / 100 : v))
            .map(v => Math.max(-2, Math.min(2, v)))
            .filter(v => isFinite(v));
          let last10 = norm.slice(0, 10);
          if (last10.length < 2) {
            try {
              const inc = await fetchJson(`https://financialmodelingprep.com/stable/income-statement?symbol=${sym}&period=annual&limit=12&apikey=${apiKey}`);
              const bal = await fetchJson(`https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${sym}&period=annual&limit=12&apikey=${apiKey}`);
              const incArr = Array.isArray(inc) ? inc : [];
              const balArr = Array.isArray(bal) ? bal : [];
              const len = Math.min(incArr.length, balArr.length, 10);
              const seq = [];
              for (let i = 0; i < len; i++) {
                const ii = incArr[i] || {};
                const bb = balArr[i] || {};
                const ebit = Number(ii.ebit ?? ii.operatingIncome);
                const preTax = Number(ii.incomeBeforeTax);
                const taxExp = Number(ii.incomeTaxExpense);
                const taxRate = Number.isFinite(preTax) && preTax > 0 && Number.isFinite(taxExp) ? Math.max(0, Math.min(0.5, taxExp / preTax)) : 0.21;
                const nopat = Number.isFinite(ebit) ? ebit * (1 - taxRate) : NaN;
                const totalDebt = Number(bb.totalDebt);
                const equity = Number(bb.totalStockholdersEquity);
                const cash = Number(bb.cashAndShortTermInvestments ?? bb.cashAndCashEquivalents);
                let invested = 0;
                if (Number.isFinite(totalDebt)) invested += totalDebt;
                if (Number.isFinite(equity)) invested += equity;
                if (Number.isFinite(cash)) invested -= cash;
                if (!Number.isFinite(nopat) || !Number.isFinite(invested) || invested <= 0) continue;
                let roic = nopat / invested;
                if (!Number.isFinite(roic)) continue;
                if (roic > 2) roic = 2;
                if (roic < -2) roic = -2;
                seq.push(roic);
              }
              if (seq.length) last10 = seq.slice(0, 10);
            } catch {}
          }
          const padTo = (n, list) => { const out = [...list]; while (out.length < n) out.push(null); return out; };
          const y = padTo(10, last10);
          const vals = y.filter(v => v !== null).map(v => Number(v));
          const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
          let std = null;
          if (vals.length >= 2 && avg !== null) {
            const variance = vals.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / vals.length;
            std = Math.sqrt(variance);
          }
          const upd = {
            roic_y1: y[0], roic_y2: y[1], roic_y3: y[2], roic_y4: y[3], roic_y5: y[4],
            roic_y6: y[5], roic_y7: y[6], roic_y8: y[7], roic_y9: y[8], roic_y10: y[9],
            roic_10y_avg: avg,
            roic_10y_std: std,
          };
          for (const t of tables) {
            try { await supabase.from(t).update(upd).eq('symbol', sym); } catch {}
          }
          results.push({ symbol: sym, updated: true, avg });
        } catch (e) {
          results.push({ symbol: sym, updated: false, error: e?.message || 'unknown' });
        }
        await new Promise(r => setTimeout(r, 100));
      }
      return res.json({ status: 'ok', results });
    } catch (e) {
      console.error('metrics/recompute-roic-10y error:', e);
      return res.status(500).json({ message: 'Failed to recompute ROIC 10Y' });
    }
  });

  // Admin-only: feature flags management
  app.get('/api/feature-flags', requireAdmin, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('key, enabled, rollout_percent, allowlist_emails, updated_at')
        .order('key', { ascending: true });
      if (error) return res.status(500).json({ message: 'Failed to read feature flags' });
      return res.json({ flags: data || [] });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to read feature flags' });
    }
  });

  app.post('/api/feature-flags/:key', requireAdmin, async (req, res) => {
    try {
      const flagKey = String(req.params.key || '').trim();
      if (!flagKey) return res.status(400).json({ message: 'key is required' });
      const { enabled, rolloutPercent, allowlistEmails } = req.body || {};

      // read previous snapshot
      let prev = null;
      try {
        const { data: prevRow } = await supabase
          .from('feature_flags')
          .select('*')
          .eq('key', flagKey)
          .maybeSingle();
        if (prevRow) prev = prevRow;
      } catch {}

      const payload = { key: flagKey };
      if (typeof enabled === 'boolean') payload['enabled'] = enabled;
      if (typeof rolloutPercent === 'number') payload['rollout_percent'] = rolloutPercent;
      if (Array.isArray(allowlistEmails)) payload['allowlist_emails'] = allowlistEmails;
      const { data: upserted, error } = await supabase
        .from('feature_flags')
        .upsert(payload, { onConflict: 'key' })
        .select('*')
        .maybeSingle();
      if (error) return res.status(500).json({ message: 'Failed to update flag' });

      // insert audit row
      try {
        await supabase.from('feature_flag_audit').insert({
          key: flagKey,
          actor_email: (req.user && req.user.email) ? String(req.user.email).toLowerCase() : null,
          prev: prev,
          next: upserted || null,
          changed_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('feature_flag_audit insert failed', e?.message || e);
      }
      // bust cache
      cachedFlags = { flags: {}, ts: 0 };
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to update flag' });
    }
  });

  // Override helper: null-out long-horizon metrics for recent IPOs
  function applyRecentIpoOverrides(rows) {
    try {
      if (!Array.isArray(rows)) return;
      const recentIpoSymbols = new Set(['PLTR', 'DASH']);
      for (const r of rows) {
        const sym = (r && r.symbol) ? String(r.symbol).toUpperCase() : null;
        if (!sym) continue;
        if (recentIpoSymbols.has(sym)) {
          if (Object.prototype.hasOwnProperty.call(r, 'return_10_year')) r.return_10_year = null;
          if (Object.prototype.hasOwnProperty.call(r, 'ar_mdd_ratio_10_year')) r.ar_mdd_ratio_10_year = null;
        }
      }
    } catch {}
  }

  app.get('/api/health', (_req, res) => {
    try { res.set('x-app-commit', COMMIT_SHA); } catch {}
    return res.json({ status: 'ok', commit: COMMIT_SHA, timestamp: new Date().toISOString() });
  });

  // Test endpoint to check available fields in FMP API for Debt-to-Equity and Interest Coverage
  app.get('/api/test/fmp-ratios', requireAdmin, async (req, res) => {
    try {
      const symbol = (req.query.symbol || 'AAPL').toString().toUpperCase();
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });

      const fetchJson = async (url) => {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${url} ${r.status}`);
        return r.json();
      };

      const results = {};

      // Check ratios endpoint
      try {
        const ratios = await fetchJson(`https://financialmodelingprep.com/stable/ratios/${symbol}?period=annual&limit=1&apikey=${apiKey}`);
        const ratio = Array.isArray(ratios) && ratios[0] ? ratios[0] : null;
        results.ratios = {
          available: !!ratio,
          fullData: ratio, // Include full ratio data for debugging
          fields: ratio ? Object.keys(ratio).filter(k => 
            k.toLowerCase().includes('debt') || 
            k.toLowerCase().includes('equity') || 
            k.toLowerCase().includes('interest') || 
            k.toLowerCase().includes('coverage')
          ).map(k => ({ key: k, value: ratio[k] })) : []
        };
      } catch (e) {
        results.ratios = { error: e.message };
      }

      // Check ratios-ttm endpoint
      try {
        const ratiosTTM = await fetchJson(`https://financialmodelingprep.com/stable/ratios-ttm?symbol=${symbol}&apikey=${apiKey}`);
        const ratioTTM = Array.isArray(ratiosTTM) && ratiosTTM[0] ? ratiosTTM[0] : ratiosTTM;
        results.ratiosTTM = {
          available: !!ratioTTM,
          fields: ratioTTM ? Object.keys(ratioTTM).filter(k => 
            k.toLowerCase().includes('debt') || 
            k.toLowerCase().includes('equity') || 
            k.toLowerCase().includes('interest') || 
            k.toLowerCase().includes('coverage')
          ).map(k => ({ key: k, value: ratioTTM[k] })) : []
        };
      } catch (e) {
        results.ratiosTTM = { error: e.message };
      }

      // Check key-metrics endpoint
      try {
        const keyMetrics = await fetchJson(`https://financialmodelingprep.com/stable/key-metrics?symbol=${symbol}&period=annual&limit=1&apikey=${apiKey}`);
        const km = Array.isArray(keyMetrics) && keyMetrics[0] ? keyMetrics[0] : null;
        results.keyMetrics = {
          available: !!km,
          fields: km ? Object.keys(km).filter(k => 
            k.toLowerCase().includes('debt') || 
            k.toLowerCase().includes('equity') || 
            k.toLowerCase().includes('interest') || 
            k.toLowerCase().includes('coverage')
          ).map(k => ({ key: k, value: km[k] })) : []
        };
      } catch (e) {
        results.keyMetrics = { error: e.message };
      }

      // Check balance sheet for debt and equity
      try {
        const balance = await fetchJson(`https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${symbol}&period=annual&limit=1&apikey=${apiKey}`);
        const bs = Array.isArray(balance) && balance[0] ? balance[0] : null;
        results.balanceSheet = {
          available: !!bs,
          fields: bs ? Object.keys(bs).filter(k => 
            k.toLowerCase().includes('debt') || 
            k.toLowerCase().includes('equity')
          ).map(k => ({ key: k, value: bs[k] })) : []
        };
      } catch (e) {
        results.balanceSheet = { error: e.message };
      }

      // Check income statement for EBIT and Interest Expense
      try {
        const income = await fetchJson(`https://financialmodelingprep.com/stable/income-statement?symbol=${symbol}&period=annual&limit=1&apikey=${apiKey}`);
        const inc = Array.isArray(income) && income[0] ? income[0] : null;
        results.incomeStatement = {
          available: !!inc,
          fields: inc ? Object.keys(inc).filter(k => 
            k.toLowerCase().includes('ebit') || 
            k.toLowerCase().includes('interest') || 
            k.toLowerCase().includes('operating')
          ).map(k => ({ key: k, value: inc[k] })) : []
        };
      } catch (e) {
        results.incomeStatement = { error: e.message };
      }

      return res.json({ symbol, results });
    } catch (e) {
      console.error('test/fmp-ratios error:', e);
      return res.status(500).json({ message: 'Failed to test FMP ratios', error: e.message });
    }
  });

  // Debug endpoint to check interest coverage value in database
  app.get('/api/debug/interest-coverage', requireAdmin, async (req, res) => {
    try {
      const symbol = (req.query.symbol || 'AAPL').toString().toUpperCase();
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      
      const results = {};
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('symbol, interest_coverage, debt_to_equity')
            .eq('symbol', symbol)
            .limit(1);
          
          if (error) {
            results[table] = { error: error.message };
          } else if (data && data.length > 0) {
            results[table] = {
              found: true,
              interest_coverage: data[0].interest_coverage,
              debt_to_equity: data[0].debt_to_equity,
              interest_coverage_type: typeof data[0].interest_coverage,
              interest_coverage_value: data[0].interest_coverage === null ? 'null' : 
                                      data[0].interest_coverage === 0 ? 'zero' : 
                                      data[0].interest_coverage === '0' ? 'string_zero' : 
                                      'other'
            };
          } else {
            results[table] = { found: false };
          }
        } catch (e) {
          results[table] = { error: e.message };
        }
      }
      
      return res.json({ symbol, results });
    } catch (e) {
      console.error('debug/interest-coverage error:', e);
      return res.status(500).json({ message: 'Failed to check interest coverage', error: e.message });
    }
  });

  // Force update interest coverage to null for companies with 0 value
  app.post('/api/metrics/force-fix-interest-coverage', requireAdmin, async (req, res) => {
    try {
      const symbol = (req.body?.symbol || req.query?.symbol || '').toString().toUpperCase();
      if (!symbol) {
        return res.status(400).json({ message: 'Symbol is required' });
      }

      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      const results = [];

      for (const table of tables) {
        try {
          // First, check current value
          const { data: current } = await supabase
            .from(table)
            .select('symbol, interest_coverage')
            .eq('symbol', symbol)
            .limit(1);

          if (!current || current.length === 0) {
            results.push({ table, status: 'not_found' });
            continue;
          }

          const currentValue = current[0].interest_coverage;
          const isZero = currentValue === 0 || currentValue === '0' || currentValue === '0.00' || Number(currentValue) === 0;

          if (isZero) {
            // Force update to null
            const { error, data } = await supabase
              .from(table)
              .update({ interest_coverage: null })
              .eq('symbol', symbol)
              .select('interest_coverage');

            if (error) {
              results.push({ table, status: 'error', error: error.message, oldValue: currentValue });
            } else {
              results.push({ 
                table, 
                status: 'updated', 
                oldValue: currentValue, 
                newValue: data?.[0]?.interest_coverage 
              });
            }
          } else {
            results.push({ table, status: 'no_change', value: currentValue });
          }
        } catch (e) {
          results.push({ table, status: 'error', error: e.message });
        }
      }

      return res.json({ symbol, results });
    } catch (e) {
      console.error('force-fix-interest-coverage error:', e);
      return res.status(500).json({ message: 'Failed to fix interest coverage', error: e.message });
    }
  });

  // Batch fix: Update all companies with interest_coverage = 0 to null
  app.post('/api/metrics/batch-fix-zero-interest-coverage', requireAdmin, async (req, res) => {
    try {
      const tables = ['companies', 'sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies'];
      const limit = parseInt(req.query.limit || '100', 10);
      const offset = parseInt(req.query.offset || '0', 10);
      
      const results = { totalFixed: 0, totalChecked: 0, errors: [] };

      for (const table of tables) {
        try {
          // Find all companies with interest_coverage = 0 or '0' or '0.00'
          const { data: companies, error: fetchError } = await supabase
            .from(table)
            .select('symbol, interest_coverage')
            .or('interest_coverage.eq.0,interest_coverage.eq."0",interest_coverage.eq."0.00"')
            .range(offset, offset + limit - 1);

          if (fetchError) {
            results.errors.push({ table, error: fetchError.message });
            continue;
          }

          if (!companies || companies.length === 0) {
            continue;
          }

          results.totalChecked += companies.length;

          // Update all to null
          const symbols = companies.map(c => c.symbol).filter(Boolean);
          for (const symbol of symbols) {
            try {
              const { error: updateError } = await supabase
                .from(table)
                .update({ interest_coverage: null })
                .eq('symbol', symbol);

              if (updateError) {
                results.errors.push({ table, symbol, error: updateError.message });
              } else {
                results.totalFixed++;
              }
            } catch (e) {
              results.errors.push({ table, symbol, error: e.message });
            }
          }

          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 50));
        } catch (e) {
          results.errors.push({ table, error: e.message });
        }
      }

      return res.json({ 
        status: 'ok', 
        ...results,
        message: `Fixed ${results.totalFixed} companies with zero interest coverage`
      });
    } catch (e) {
      console.error('batch-fix-zero-interest-coverage error:', e);
      return res.status(500).json({ message: 'Failed to batch fix interest coverage', error: e.message });
    }
  });

  // Last-chance error handler to capture errors (Sentry if loaded) before default express handler
  app.use((err, req, res, next) => {
    try {
      const sentry = (globalThis).Sentry || (global).Sentry;
      sentry?.captureException?.(err);
    } catch {}
    next(err);
  });

  // Audit listing for feature flag changes (admin only)
  app.get('/api/feature-flags/audit', requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 200, 2000);
      const key = (req.query.key ? String(req.query.key) : '').trim();
      let q = supabase.from('feature_flag_audit').select('*').order('changed_at', { ascending: false }).limit(limit);
      if (key) {
        q = q.eq('key', key);
      }
      const { data, error } = await q;
      if (error) return res.status(500).json({ message: 'Failed to load audit log' });
      return res.json({ items: data || [] });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to load audit log' });
    }
  });

  // --- Admin backfill: revenue_growth_10y recompute from FMP (requires >=11 annual points) ---
  let backfillRev10YStatus = { startedAt: null, finishedAt: null, updated: 0, nulled: 0, running: false, error: null };
  async function fetchIncomeStatements(sym, limit = 12) {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) return [];
    try {
      const url = `https://financialmodelingprep.com/stable/income-statement/${encodeURIComponent(sym)}?period=annual&limit=${limit}&apikey=${apiKey}`;
      const r = await fetch(url);
      if (!r.ok) return [];
      const arr = await r.json();
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function cagr10y(start, end) {
    if (!start || !end || start <= 0 || end <= 0) return null;
    const v = (Math.pow(end / start, 1 / 10) - 1) * 100;
    return Math.round(v * 100) / 100;
  }
  async function processTableRev10Y(supabase, tableName) {
    const { data: rows } = await supabase.from(tableName).select('symbol');
    const symbols = (rows || []).map(r => r.symbol).filter(Boolean);
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      try {
        await new Promise(r => setTimeout(r, 150));
        const stmts = await fetchIncomeStatements(sym, 12);
        if (!stmts || stmts.length < 11) {
          await supabase.from(tableName).update({ revenue_growth_10y: null }).eq('symbol', sym);
          backfillRev10YStatus.nulled++;
          continue;
        }
        const latest = Number(stmts[0]?.revenue || 0);
        const tenAgo = Number(stmts[10]?.revenue || 0);
        const g = cagr10y(tenAgo, latest);
        if (g === null) {
          await supabase.from(tableName).update({ revenue_growth_10y: null }).eq('symbol', sym);
          backfillRev10YStatus.nulled++;
        } else {
          await supabase.from(tableName).update({ revenue_growth_10y: g }).eq('symbol', sym);
          backfillRev10YStatus.updated++;
        }
      } catch (e) {
        // continue
      }
    }
  }
  app.post('/api/admin/backfill/revenue-10y', isAuthenticated, async (req, res) => {
    try {
      const email = (req.user && req.user.email) ? String(req.user.email).toLowerCase() : '';
      if (email !== 'findgreatstocks@gmail.com') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (backfillRev10YStatus.running) {
        return res.status(202).json({ message: 'Already running', status: backfillRev10YStatus });
      }
      backfillRev10YStatus = { startedAt: new Date().toISOString(), finishedAt: null, updated: 0, nulled: 0, running: true, error: null };
      // run async
      (async () => {
        try {
          await processTableRev10Y(supabase, 'sp500_companies');
          await processTableRev10Y(supabase, 'nasdaq100_companies');
          await processTableRev10Y(supabase, 'dow_jones_companies');
          try {
            const { error } = await supabase.from('ftse100_companies').select('symbol').limit(1);
            if (!error) await processTableRev10Y(supabase, 'ftse100_companies');
          } catch {}
          backfillRev10YStatus.finishedAt = new Date().toISOString();
          backfillRev10YStatus.running = false;
        } catch (e) {
          backfillRev10YStatus.error = e?.message || String(e);
          backfillRev10YStatus.finishedAt = new Date().toISOString();
          backfillRev10YStatus.running = false;
        }
      })();
      return res.status(202).json({ message: 'Started', status: backfillRev10YStatus });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to start backfill' });
    }
  });
  app.get('/api/admin/backfill/revenue-10y/status', isAuthenticated, async (req, res) => {
    try {
      const email = (req.user && req.user.email) ? String(req.user.email).toLowerCase() : '';
      if (email !== 'findgreatstocks@gmail.com') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      return res.json({ status: backfillRev10YStatus });
    } catch {
      return res.status(500).json({ message: 'Failed to get status' });
    }
  });

  // --- FTSE 100: import constituents, update prices, enhance financials ---
  async function fetchFtseConstituents() {
    const apiKey = process.env.FMP_API_KEY;
    try {
      if (apiKey) {
        const candidates = ['%5EFTSE', '%5EUKX'];
        for (const idx of candidates) {
          const url = `https://financialmodelingprep.com/stable/index-constituent/${idx}?apikey=${apiKey}`;
          const r = await fetch(url);
          if (r.ok) {
            const arr = await r.json();
            if (Array.isArray(arr) && arr.length) {
              return arr.map(x => ({
                symbol: String(x?.symbol || '').toUpperCase(),
                name: String(x?.name || x?.companyName || '').trim(),
              }));
            }
          }
        }
        const alt = await fetch(`https://financialmodelingprep.com/stable/ftse_constituent?apikey=${apiKey}`);
        if (alt.ok) {
          const arr = await alt.json();
          if (Array.isArray(arr) && arr.length) {
            return arr.map(x => ({
              symbol: String(x?.symbol || '').toUpperCase(),
              name: String(x?.name || x?.companyName || '').trim(),
            }));
          }
        }
      }
    } catch (e) {
      console.warn('[ftse100-import] FMP failed:', e?.message || e);
    }
    // Fallback to Wikipedia scraping (very light)
    try {
      const r = await fetch('https://en.wikipedia.org/wiki/FTSE_100_Index', { headers: { 'user-agent': 'FindGreatStocksBot/1.0 (+https://findgreatstocks.com)' } });
      if (!r.ok) return [];
      const html = await r.text();
      const rows = [];
      const tables = html.match(/<table[^>]*class="wikitable[^>]*">[\s\S]*?<\/table>/gi) || [];
      for (const tbl of tables) {
        const trs = tbl.match(/<tr[\s\S]*?<\/tr>/gi) || [];
        for (const tr of trs) {
          const tds = Array.from(tr.matchAll(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi)).map(m => m[1]);
          if (tds.length < 2) continue;
          const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
          const company = strip(tds[0] || '');
          const epic = strip(tds[1] || '');
          if (!company || !epic) continue;
          let sym = String(epic).toUpperCase();
          if (!sym.endsWith('.L')) sym = `${sym}.L`;
          rows.push({ symbol: sym, name: company });
        }
      }
      const uniq = new Map();
      for (const r2 of rows) if (!uniq.has(r2.symbol)) uniq.set(r2.symbol, r2);
      return Array.from(uniq.values()).filter(c => !/ETF|UCITS|FUND/i.test(c.name));
    } catch (e) {
      console.warn('[ftse100-import] Wikipedia failed:', e?.message || e);
      return [];
    }
  }

  app.post('/api/ftse100/import', requireAdmin, async (_req, res) => {
    try {
      const list = await fetchFtseConstituents();
      if (!Array.isArray(list) || !list.length) {
        return res.status(500).json({ message: 'No constituents fetched' });
      }
      let imported = 0, failed = 0;
      for (const c of list) {
        try {
          const payload = { symbol: c.symbol, name: c.name };
          const { error } = await supabase.from('ftse100_companies').upsert(payload, { onConflict: 'symbol' });
          if (error) { failed++; } else { imported++; }
        } catch { failed++; }
      }
      return res.json({ message: 'FTSE 100 import completed', imported, failed, total: list.length });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to import FTSE 100', error: e?.message || String(e) });
    }
  });

  app.post('/api/ftse100/update-prices', requireAdmin, async (_req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const { data, error } = await supabase.from('ftse100_companies').select('symbol');
      if (error) return res.status(500).json({ message: 'Failed to read symbols' });
      const symbols = (data || []).map(r => r.symbol).filter(Boolean);
      let updated = 0, failed = 0;
      const chunkSize = 100;
      for (let i = 0; i < symbols.length; i += chunkSize) {
        const group = symbols.slice(i, i + chunkSize);
        try {
          // Use batch-quote endpoint for multiple symbols
          const url = `https://financialmodelingprep.com/stable/batch-quote?symbols=${group.join(',')}&apikey=${apiKey}`;
          const r = await fetch(url);
          if (!r.ok) { failed += group.length; continue; }
          const arr = await r.json();
          for (const q of (Array.isArray(arr) ? arr : [])) {
            const sym = String(q?.symbol || '').toUpperCase();
            const patch = {};
            if (q?.price != null) patch['price'] = Number(q.price);
            if (q?.change != null) patch['daily_change'] = Number(q.change);
            if (q?.changesPercentage != null) patch['daily_change_percent'] = Number(q.changesPercentage);
            if (q?.marketCap != null) patch['market_cap'] = Number(q.marketCap);
            if (Object.keys(patch).length) {
              const { error: upErr } = await supabase.from('ftse100_companies').update(patch).eq('symbol', sym);
              if (upErr) failed++; else updated++;
            }
          }
        } catch { failed += group.length; }
        await new Promise(r => setTimeout(r, 150));
      }
      return res.json({ message: 'FTSE 100 prices updated', updated, failed, total: symbols.length });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to update FTSE 100 prices', error: e?.message || String(e) });
    }
  });

  app.post('/api/ftse100/enhance', requireAdmin, async (_req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const { data, error } = await supabase.from('ftse100_companies').select('symbol');
      if (error) return res.status(500).json({ message: 'Failed to read symbols' });
      const symbols = (data || []).map(r => r.symbol).filter(Boolean);
      let enhanced = 0, failed = 0;
      const fetchJson = async (ep) => {
        const url = `https://financialmodelingprep.com/api${ep}${ep.includes('?') ? '&' : '?'}apikey=${apiKey}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`FMP ${ep} ${r.status}`);
        return r.json();
      };
      for (const sym of symbols) {
        try {
          const [inc, bal, cfs, quo] = await Promise.all([
            fetchJson(`/income-statement/${sym}?limit=1`).catch(()=>null),
            fetchJson(`/balance-sheet-statement/${sym}?limit=1`).catch(()=>null),
            fetchJson(`/cash-flow-statement/${sym}?limit=1`).catch(()=>null),
            fetchJson(`/quote/${sym}`).catch(()=>null),
          ]);
          const i = Array.isArray(inc) && inc[0] ? inc[0] : null;
          const b = Array.isArray(bal) && bal[0] ? bal[0] : null;
          const c = Array.isArray(cfs) && cfs[0] ? cfs[0] : null;
          const q = Array.isArray(quo) && quo[0] ? quo[0] : null;
          const patch = {};
          if (i?.revenue != null) patch['revenue'] = Number(i.revenue);
          if (i?.netIncome != null) patch['net_income'] = Number(i.netIncome);
          if (i?.grossProfit != null) patch['gross_profit'] = Number(i.grossProfit);
          if (i?.operatingIncome != null) patch['operating_income'] = Number(i.operatingIncome);
          if (q?.pe != null) patch['pe_ratio'] = Number(q.pe);
          if (q?.eps != null) patch['eps'] = Number(q.eps);
          if (b?.totalAssets != null) patch['total_assets'] = Number(b.totalAssets);
          if (b?.totalStockholdersEquity != null) patch['total_equity'] = Number(b.totalStockholdersEquity);
          if (b?.totalDebt != null) patch['total_debt'] = Number(b.totalDebt);
          if (c?.freeCashFlow != null) patch['free_cash_flow'] = Number(c.freeCashFlow);
          if (Object.keys(patch).length) {
            await supabase.from('ftse100_companies').update(patch).eq('symbol', sym);
          }
          enhanced++;
        } catch { failed++; }
        await new Promise(r => setTimeout(r, 200));
      }
      return res.json({ message: 'FTSE 100 enhancement completed', enhanced, failed, total: symbols.length });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to enhance FTSE 100', error: e?.message || String(e) });
    }
  });

  // Lightweight static-like streaming for tutorial videos with Range support
  app.get('/videos/:filename', async (req, res) => {
    try {
      const raw = (req.params.filename || '').toString();
      // Prevent path traversal
      if (!/^[a-zA-Z0-9._-]+$/.test(raw)) return res.status(400).send('Bad filename');
      const baseDir = path.resolve(process.cwd(), 'server', 'public', 'videos');
      const filePath = path.resolve(baseDir, raw);
      if (!filePath.startsWith(baseDir)) return res.status(400).send('Invalid path');
      if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const ext = path.extname(filePath).toLowerCase();
      const mime =
        ext === '.mp4' ? 'video/mp4'
        : ext === '.webm' ? 'video/webm'
        : ext === '.mov' ? 'video/quicktime'
        : 'application/octet-stream';
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        const start = match && match[1] ? parseInt(match[1], 10) : 0;
        const end = match && match[2] ? parseInt(match[2], 10) : Math.max(0, fileSize - 1);
        if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
          return res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        }
        const chunkSize = (end - start) + 1;
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': chunkSize,
          'Content-Type': mime,
        });
        const stream = fs.createReadStream(filePath, { start, end });
        stream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': mime,
        });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
      }
    } catch (e) {
      console.error('Video stream error:', e);
      res.status(500).send('Server error');
    }
  });

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
    roic: 'roic',
    roic10YAvg: 'roic_10y_avg',
    roic10YStd: 'roic_10y_std',
    fcfMarginMedian10Y: 'fcf_margin_median_10y',
    debtToEquity: 'debt_to_equity',
    interestCoverage: 'interest_coverage',
  };

  async function listCompanies(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const sortBy = req.query.sortBy || 'marketCap';
      const sortOrder = (req.query.sortOrder || 'desc') === 'asc';
      const search = (req.query.search || '').trim();
      let orderCol = sortMap[sortBy] || 'market_cap';

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
      applyRecentIpoOverrides(rows);
      // Age-based nulling via FMP profile IPO dates
      try {
        const syms = rows.map(r => r.symbol).filter(Boolean).map(s => String(s).toUpperCase());
        if (syms.length) {
          await ensureProfilesForSymbols(syms);
          const ipoMap = new Map();
          for (const s of syms) {
            const c = profileCache.get(s);
            if (c && c.ipoDate) ipoMap.set(s, c.ipoDate);
          }
          applyAgeBasedWindowNulls(rows, ipoMap);
        }
      } catch (e) { console.warn('age-based nulls (companies) error', e?.message || e); }
      const symbols = rows.map(r => r.symbol).filter(Boolean);
      if (symbols.length) {
        const selectCols = 'symbol, price, market_cap, pe_ratio, price_to_sales_ratio, dividend_yield, return_3_year, return_5_year, return_10_year, max_drawdown_3_year, max_drawdown_5_year, max_drawdown_10_year, dcf_enterprise_value, margin_of_safety, dcf_implied_growth, roic, roic_10y_avg, roic_10y_std, roic_stability, roic_stability_score, fcf_margin, fcf_margin_median_10y, debt_to_equity, interest_coverage, cash_flow_to_debt, roic_y1, roic_y2, roic_y3, roic_y4, roic_y5, roic_y6, roic_y7, roic_y8, roic_y9, roic_y10';
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
              roic: r.roic,
              roic10YAvg: r.roic_10y_avg,
              roic10YStd: r.roic_10y_std,
              fcfMarginMedian10Y: r.fcf_margin_median_10y,
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
          if (r.roic == null && fb.roic != null) r.roic = fb.roic;
          if (r.roic_10y_avg == null && fb.roic10YAvg != null) r.roic_10y_avg = fb.roic10YAvg;
          if (r.roic_10y_std == null && fb.roic10YStd != null) r.roic_10y_std = fb.roic10YStd;
          if (r.fcf_margin_median_10y == null && fb.fcfMarginMedian10Y != null) r.fcf_margin_median_10y = fb.fcfMarginMedian10Y;

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
      let orderCol = sortMap[sortBy] || 'market_cap';
      if ((orderCol === 'roic_10y_avg' || orderCol === 'roic_10y_std' || orderCol === 'fcf_margin_median_10y') && tableName !== 'companies') {
        orderCol = 'market_cap';
      }

      let data, count, error;
      
      // For dow_jones_companies, split query into data and count separately
      // This is necessary because select('*', { count: 'exact' }) fails for this table
      if (tableName === 'dow_jones_companies') {
        try {
          // Get data without count
          let dataQuery = supabase
            .from(tableName)
            .select('*')
            .order(orderCol, { ascending: sortOrder, nullsFirst: false })
            .range(offset, offset + limit - 1);
          if (search) {
            dataQuery = dataQuery.or(`name.ilike.%${search}%,symbol.ilike.%${search}%`);
          }
          const { data: dataResult, error: dataError } = await dataQuery;
          
          if (dataError) {
            console.error(`[${tableName}] Data query failed:`, dataError);
            return res.json({ companies: [], total: 0, limit, offset, hasMore: false });
          }
          
          // Get count separately
          let countQuery = supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          if (search) {
            countQuery = countQuery.or(`name.ilike.%${search}%,symbol.ilike.%${search}%`);
          }
          const { count: countResult, error: countError } = await countQuery;
          
          data = dataResult;
          count = countResult || 0; // Default to 0 if count fails
          error = countError;
          
          if (countError) {
            console.warn(`[${tableName}] Count query failed but data query succeeded, using count=0`);
          }
        } catch (splitErr) {
          console.error(`[${tableName}] Split query failed:`, splitErr);
          return res.json({ companies: [], total: 0, limit, offset, hasMore: false });
        }
      } else {
        // For other tables, use normal query
        let query = supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .order(orderCol, { ascending: sortOrder, nullsFirst: false })
          .range(offset, offset + limit - 1);
        if (search) {
          query = query.or(`name.ilike.%${search}%,symbol.ilike.%${search}%`);
        }
        const queryResult = await query;
        data = queryResult.data;
        count = queryResult.count;
        error = queryResult.error;
        
        if (error) {
          // Log full error details for debugging
          console.error(`Supabase error in listFromTable(${tableName}):`, {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            fullError: JSON.stringify(error, null, 2),
            errorType: typeof error,
            errorKeys: Object.keys(error || {}),
            errorString: String(error)
          });
          // Возвращаем пустой результат вместо 500, чтобы не падал фронт при префетче
          return res.json({ companies: [], total: 0, limit, offset, hasMore: false });
        }
      }
      const rows = Array.isArray(data) ? data : [];

      // Overlay/fallback enrichment from master companies table for fresher metrics
      const symbols = rows.map(r => r.symbol).filter(Boolean);
      if (symbols.length) {
        const cols = 'symbol, price, market_cap, pe_ratio, price_to_sales_ratio, dividend_yield, revenue, net_income, free_cash_flow, fcf_margin, total_assets, total_equity, return_3_year, return_5_year, return_10_year, max_drawdown_3_year, max_drawdown_5_year, max_drawdown_10_year, dcf_enterprise_value, margin_of_safety, dcf_implied_growth, roic, roic_10y_avg, roic_10y_std, roic_stability, roic_stability_score, fcf_margin_median_10y, debt_to_equity, interest_coverage, cash_flow_to_debt, revenue_growth_3y, revenue_growth_5y, revenue_growth_10y';
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
            applyIfMissing('total_assets', m.total_assets);
            applyIfMissing('total_equity', m.total_equity);
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
            applyIfMissing('roic', m.roic);
            applyIfMissing('roic_10y_avg', m.roic_10y_avg);
            applyIfMissing('roic_10y_std', m.roic_10y_std);
            if (m.fcf_margin_median_10y !== null && m.fcf_margin_median_10y !== undefined) r.fcf_margin_median_10y = m.fcf_margin_median_10y;
            applyIfMissing('debt_to_equity', m.debt_to_equity);
            applyIfMissing('interest_coverage', m.interest_coverage);
            applyIfMissing('cash_flow_to_debt', m.cash_flow_to_debt);
            applyIfMissing('revenue_growth_3y', m.revenue_growth_3y);
            applyIfMissing('revenue_growth_5y', m.revenue_growth_5y);
            applyIfMissing('revenue_growth_10y', m.revenue_growth_10y);
          }
        }
      }
      // Null-out long-horizon metrics for recent IPOs (generic + IPO-age based)
      applyRecentIpoOverrides(rows);
      try {
        const syms = rows.map(r => r.symbol).filter(Boolean).map(s => String(s).toUpperCase());
        if (syms.length) {
          await ensureProfilesForSymbols(syms);
          const ipoMap = new Map();
          for (const s of syms) {
            const c = profileCache.get(s);
            if (c && c.ipoDate) ipoMap.set(s, c.ipoDate);
          }
          applyAgeBasedWindowNulls(rows, ipoMap);
        }
      } catch (e) { console.warn('age-based nulls (listFromTable) error', e?.message || e); }
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

      // Age-based nulling via IPO dates
      try {
        const syms = Array.from(new Set(rows.map(r => r.symbol).filter(Boolean).map(s => String(s).toUpperCase())));
        if (syms.length) {
          await ensureProfilesForSymbols(syms);
          const ipoMap = new Map();
          for (const s of syms) {
            const c = profileCache.get(s);
            if (c && c.ipoDate) ipoMap.set(s, c.ipoDate);
          }
          applyAgeBasedWindowNulls(rows, ipoMap);
        }
      } catch (e) { console.warn('age-based nulls (companies-all) error', e?.message || e); }

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

  // Populate data for newly added S&P 500 companies (CVNA, CHR, FIX)
  app.post('/api/sp500/populate-new-companies', requireAdmin, async (_req, res) => {
    try {
      await import('tsx/esm');
      import('./populate-new-sp500-companies.ts')
        .then(mod => mod.populateNewSP500Companies())
        .catch(e => console.error('populate-new-sp500-companies async error:', e));
      return res.json({ status: 'started', message: 'Started populating data for CVNA, CHR, FIX' });
    } catch (e) {
      console.error('populate-new-sp500-companies error:', e);
      return res.status(500).json({ message: 'Failed to populate new S&P 500 companies data' });
    }
  });

  // Temporary endpoint for automated execution (no admin required, for internal use only)
  app.post('/api/sp500/populate-new-companies-auto', async (_req, res) => {
    try {
      console.log('🚀 Auto-populating data for new S&P 500 companies: CVNA, CHR, FIX');
      await import('tsx/esm');
      import('./populate-new-sp500-companies.ts')
        .then(mod => {
          mod.populateNewSP500Companies()
            .then(() => console.log('✅ Auto-population completed'))
            .catch(e => console.error('❌ Auto-population error:', e));
        })
        .catch(e => console.error('populate-new-sp500-companies async error:', e));
      return res.json({ status: 'started', message: 'Started populating data for CVNA, CHR, FIX' });
    } catch (e) {
      console.error('populate-new-sp500-companies error:', e);
      return res.status(500).json({ message: 'Failed to populate new S&P 500 companies data', error: e.message });
    }
  });

  // Populate data for newly added NASDAQ 100 companies
  app.post('/api/nasdaq100/populate-new-companies', requireAdmin, async (_req, res) => {
    try {
      await import('tsx/esm');
      import('./populate-new-nasdaq100-companies.ts')
        .then(mod => mod.populateNewNasdaq100Companies())
        .catch(e => console.error('populate-new-nasdaq100-companies async error:', e));
      return res.json({ status: 'started', message: 'Started populating data for new NASDAQ 100 companies' });
    } catch (e) {
      console.error('populate-new-nasdaq100-companies error:', e);
      return res.status(500).json({ message: 'Failed to populate new NASDAQ 100 companies data' });
    }
  });

  // Temporary endpoint for automated execution (no admin required, for internal use only)
  app.post('/api/nasdaq100/populate-new-companies-auto', async (_req, res) => {
    try {
      console.log('🚀 Auto-populating data for new NASDAQ 100 companies: ALNY, FER, INSM, MPWR, STX, WDC');
      await import('tsx/esm');
      import('./populate-new-nasdaq100-companies.ts')
        .then(mod => {
          mod.populateNewNasdaq100Companies()
            .then(() => console.log('✅ Auto-population completed'))
            .catch(e => console.error('❌ Auto-population error:', e));
        })
        .catch(e => console.error('populate-new-nasdaq100-companies async error:', e));
      return res.json({ status: 'started', message: 'Started populating data for ALNY, FER, INSM, MPWR, STX, WDC' });
    } catch (e) {
      console.error('populate-new-nasdaq100-companies error:', e);
      return res.status(500).json({ message: 'Failed to populate new NASDAQ 100 companies data', error: e.message });
    }
  });

  // Temporary endpoint for removing companies from NASDAQ 100 (no admin required, for automated use)
  app.post('/api/nasdaq100/remove-companies-auto', async (req, res) => {
    try {
      const { symbols } = req.body;
      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ error: 'Symbols array is required' });
      }

      console.log(`🗑️ Auto-removing companies from NASDAQ 100: ${symbols.join(', ')}`);

      for (const symbol of symbols) {
        const { error } = await supabase
          .from('nasdaq100_companies')
          .delete()
          .eq('symbol', symbol);

        if (error) {
          console.error(`❌ Error removing ${symbol}:`, error);
        } else {
          console.log(`✅ Removed ${symbol} from NASDAQ 100`);
        }
      }

      return res.json({ status: 'completed', message: `Removed ${symbols.length} companies from NASDAQ 100` });
    } catch (e) {
      console.error('nasdaq100 remove-companies-auto error:', e);
      return res.status(500).json({ message: 'Failed to remove companies', error: e.message });
    }
  });

  // Universal index management endpoint (add/remove companies from any index)
  app.post('/api/index/manage', requireAdmin, async (req, res) => {
    try {
      const { action, index, symbols } = req.body;

      if (!action || !['add', 'remove'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Use "add" or "remove"' });
      }

      if (!index) {
        return res.status(400).json({ error: 'Index is required' });
      }

      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ error: 'Symbols array is required' });
      }

      console.log(`🚀 ${action === 'add' ? 'Adding' : 'Removing'} companies ${action === 'add' ? 'to' : 'from'} ${index}: ${symbols.join(', ')}`);

      await import('tsx/esm');
      const { manageIndex } = await import('./index-management.ts');
      
      // Запускаем в фоновом режиме
      manageIndex(action, index, symbols)
        .then(() => console.log(`✅ Index management completed for ${index}`))
        .catch(e => console.error(`❌ Index management error for ${index}:`, e));

      return res.json({
        status: 'started',
        message: `${action === 'add' ? 'Adding' : 'Removing'} ${symbols.length} companies ${action === 'add' ? 'to' : 'from'} ${index}`,
        action,
        index,
        symbols,
      });
    } catch (e) {
      console.error('Index management error:', e);
      return res.status(500).json({ error: 'Failed to manage index', message: e.message });
    }
  });

  // Populate derived metrics (roic_stability, roic_stability_score, fcf_margin) for ALL companies
  app.post('/api/metrics/populate-derived-all', requireAdmin, async (_req, res) => {
    try {
      console.log('🚀 Starting population of derived metrics for ALL companies...');
      await import('tsx/esm');
      import('./populate-derived-metrics-all.ts')
        .then(mod => {
          mod.calculateAndUpdateDerivedMetrics('sp500_companies')
            .then(() => mod.calculateAndUpdateDerivedMetrics('nasdaq100_companies'))
            .then(() => mod.calculateAndUpdateDerivedMetrics('dow_jones_companies'))
            .then(() => mod.calculateAndUpdateDerivedMetrics('ftse100_companies'))
            .then(() => console.log('✅ Derived metrics population completed'))
            .catch(e => console.error('❌ Derived metrics population error:', e));
        })
        .catch(e => console.error('populate-derived-metrics-all async error:', e));
      return res.json({ status: 'started', message: 'Started populating derived metrics for all companies' });
    } catch (e) {
      console.error('populate-derived-metrics-all error:', e);
      return res.status(500).json({ message: 'Failed to populate derived metrics', error: e.message });
    }
  });

  // Auto endpoint for derived metrics (no admin required, for internal use only)
  app.post('/api/metrics/populate-derived-all-auto', async (_req, res) => {
    try {
      console.log('🚀 Auto-populating derived metrics for ALL companies...');
      await import('tsx/esm');
      import('./populate-derived-metrics-all.ts')
        .then(mod => {
          mod.calculateAndUpdateDerivedMetrics('sp500_companies')
            .then(() => mod.calculateAndUpdateDerivedMetrics('nasdaq100_companies'))
            .then(() => mod.calculateAndUpdateDerivedMetrics('dow_jones_companies'))
            .then(() => mod.calculateAndUpdateDerivedMetrics('ftse100_companies'))
            .then(() => console.log('✅ Derived metrics population completed'))
            .catch(e => console.error('❌ Derived metrics population error:', e));
        })
        .catch(e => console.error('populate-derived-metrics-all async error:', e));
      return res.json({ status: 'started', message: 'Started populating derived metrics for all companies' });
    } catch (e) {
      console.error('populate-derived-metrics-all error:', e);
      return res.status(500).json({ message: 'Failed to populate derived metrics', error: e.message });
    }
  });

  // Helpers: bulk price updates (inline JS, no TS deps)
  async function bulkUpdatePricesFor(tableName) {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      console.error(`[FMP] FMP_API_KEY missing for ${tableName} price update`);
      throw new Error('FMP_API_KEY missing');
    }
    const { data: rows, error } = await supabase.from(tableName).select('symbol');
    if (error) throw error;
    const symbols = (rows || []).map(r => r.symbol).filter(Boolean);
    const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
    const chunks = chunk(symbols, 50);
    for (const group of chunks) {
      try {
        // Use batch-quote endpoint for multiple symbols
        const url = `https://financialmodelingprep.com/stable/batch-quote?symbols=${group.join(',')}&apikey=${apiKey}`;
        const r = await fetch(url);
        if (!r.ok) {
          const errorText = await r.text().catch(() => '');
          if (r.status === 403) {
            console.error(`[FMP] 403 Forbidden for ${tableName} - Check API key validity and rate limits. Response:`, errorText.substring(0, 200));
          } else {
            console.warn(`[FMP] quote error for ${tableName}`, r.status, errorText.substring(0, 100));
          }
          continue;
        }
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
          // Update timestamp when price is updated
          updates.last_price_update = new Date().toISOString();
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
      const url = `https://financialmodelingprep.com/stable/quote/${symbol}?apikey=${apiKey}`;
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
      updates.last_price_update = new Date().toISOString();
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
      const url = `https://financialmodelingprep.com/stable/quote/${symbol}?apikey=${apiKey}`;
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
        const url = `https://financialmodelingprep.com/api${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${apiKey}`;
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
      const url = `https://financialmodelingprep.com/stable/${fmpPath}?apikey=${apiKey}`;
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
        const url = `https://financialmodelingprep.com/api${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${apiKey}`;
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
        const url = `https://financialmodelingprep.com/api${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${apiKey}`;
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
  app.post('/api/dcf/clear', requireAdmin, async (req, res) => {
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
  app.post('/api/sp500/recompute-returns', requireAdmin, async (req, res) => {
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
          const url = `https://financialmodelingprep.com/stable/historical-price-full/${sym}?from=${from10}&to=${to}&serietype=line&apikey=${apiKey}`;
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

  app.post('/api/companies/enhance-returns', requireAdmin, async (_req, res) => {
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

  app.post('/api/companies/enhance-drawdown', requireAdmin, async (_req, res) => {
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
  app.post('/api/dcf/normalize', requireAdmin, async (req, res) => {
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
        const fx = await fetchJson(`https://financialmodelingprep.com/stable/fx/CNYUSD?apikey=${apiKey}`);
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
            const prof = await fetchJson(`https://financialmodelingprep.com/stable/profile/${sym}?apikey=${apiKey}`);
            const p = Array.isArray(prof) && prof[0]; if (p?.currency) currency = String(p.currency).toUpperCase();
          } catch {}

          // Convert to USD if CNY
          if (currency === 'CNY') {
            dcf = dcf / cnyUsd;
          }

          // Recompute margin of safety in USD, if возможна
          let mos = null;
          if (isFinite(mcap) && mcap > 0 && isFinite(dcf) && dcf > 0) {
            // New definition: 1 - (Market Cap / DCF Enterprise Value) = (DCF - MC) / DCF
            mos = 1 - (mcap / dcf);
            if (isFinite(mos) && mos < -1) mos = -1; // clamp to -100%
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
  app.post('/api/dcf/recompute', requireAdmin, async (req, res) => {
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
            const prof = await fetchJson(`https://financialmodelingprep.com/stable/profile/${sym}?apikey=${apiKey}`);
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
          const cash = await fetchJson(`https://financialmodelingprep.com/stable/cash-flow-statement/${sym}?limit=5&apikey=${apiKey}`);
          const series = Array.isArray(cash) ? cash : [];
          const fcfs = series.map(r => Number(r.freeCashFlow)).filter(v => isFinite(v));
          const fcfBase = fcfs.length ? (fcfs.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, fcfs.length)) : null;
          if (!(isFinite(fcfBase) && fcfBase !== 0)) { results.push({ symbol: sym, updated: false, error: 'no FCF' }); continue; }

          // FX to USD
          let fcfUsd = fcfBase;
          if (currency && currency !== 'USD') {
            try {
              const pair = `${currency}USD`;
              const fx = await fetchJson(`https://financialmodelingprep.com/stable/fx/${pair}?apikey=${apiKey}`);
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
          if (isFinite(marketCap) && marketCap > 0 && isFinite(dcfEv) && dcfEv > 0) {
            // New definition: 1 - (Market Cap / DCF Enterprise Value)
            mos = 1 - (marketCap / dcfEv);
            if (isFinite(mos) && mos < -1) mos = -1; // clamp to -100%
          }

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
  app.post('/api/prices/update-symbol', requireAdmin, async (req, res) => {
    try {
      const symbol = (req.query.symbol || req.body?.symbol || '').toString().trim().toUpperCase();
      if (!symbol) return res.status(400).json({ message: 'symbol is required' });
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'FMP_API_KEY missing' });
      const url = `https://financialmodelingprep.com/stable/quote/${symbol}?apikey=${apiKey}`;
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
      updates.last_price_update = new Date().toISOString();

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

  // Check when prices were last updated
  app.get('/api/prices/last-updated', async (_req, res) => {
    try {
      // Get the most recent last_price_update timestamp from all company tables
      const tables = ['sp500_companies', 'nasdaq100_companies', 'dow_jones_companies', 'ftse100_companies', 'companies'];
      const lastUpdates = [];
      
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('last_price_update')
            .not('last_price_update', 'is', null)
            .order('last_price_update', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (!error && data?.last_price_update) {
            lastUpdates.push({
              table,
              lastUpdate: data.last_price_update
            });
          }
        } catch (e) {
          // Table might not have the column yet (migration not run)
          console.warn(`Error checking ${table}:`, e?.message);
        }
      }
      
      if (lastUpdates.length === 0) {
        return res.json({
          status: 'unknown',
          message: 'No price update timestamps found. The last_price_update column may not exist yet. Please run the migration.',
          updateSchedule: 'Hourly at :15 past each hour UTC, plus daily at 05:00 and 06:00 UTC'
        });
      }
      
      // Find the most recent update across all tables
      const mostRecent = lastUpdates.reduce((latest, current) => {
        const currentTime = new Date(current.lastUpdate).getTime();
        const latestTime = latest ? new Date(latest.lastUpdate).getTime() : 0;
        return currentTime > latestTime ? current : latest;
      }, null);
      
      const mostRecentTime = new Date(mostRecent.lastUpdate);
      const now = new Date();
      const hoursAgo = (now - mostRecentTime) / (1000 * 60 * 60);
      const daysAgo = hoursAgo / 24;
      
      let status = 'current';
      let message = '';
      if (hoursAgo < 2) {
        message = `Prices were updated ${Math.round(hoursAgo * 60)} minutes ago`;
        status = 'very_recent';
      } else if (hoursAgo < 24) {
        message = `Prices were updated ${Math.round(hoursAgo)} hours ago`;
        status = 'recent';
      } else if (daysAgo < 2) {
        message = `Prices were updated ${Math.round(daysAgo)} day ago`;
        status = 'stale';
      } else {
        message = `Prices were updated ${Math.round(daysAgo)} days ago`;
        status = 'very_stale';
      }
      
      return res.json({
        status,
        lastUpdate: mostRecent.lastUpdate,
        lastUpdateFormatted: mostRecentTime.toISOString(),
        lastUpdateTable: mostRecent.table,
        message,
        hoursAgo: Math.round(hoursAgo * 10) / 10,
        daysAgo: Math.round(daysAgo * 10) / 10,
        updateSchedule: 'Hourly at :15 past each hour UTC, plus daily at 05:00 and 06:00 UTC',
        allTables: lastUpdates.map(u => ({
          table: u.table,
          lastUpdate: u.lastUpdate
        }))
      });
    } catch (e) {
      console.error('prices/last-updated error:', e);
      return res.status(500).json({ message: 'Failed to check last update', error: e?.message || String(e) });
    }
  });

  // Prices: bulk update for all tables (fire-and-forget)
  // Note: No auth required - called by internal scheduler
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
          // Use batch-quote for multiple symbols (documentation shows batch-quote uses 'symbols' parameter)
          const url = `https://financialmodelingprep.com/stable/batch-quote?symbols=${symbols.join(',')}&apikey=${apiKey}`;
          const r = await fetch(url);
          if (!r.ok) {
            const errorText = await r.text().catch(() => '');
            let errorMsg = `FMP quote ${r.status}`;
            try {
              const errorJson = JSON.parse(errorText);
              errorMsg += `: ${errorJson['Error Message'] || errorJson.message || errorText.substring(0, 200)}`;
            } catch {
              errorMsg += `: ${errorText.substring(0, 200)}`;
            }
            if (r.status === 402) {
              console.error(`[FMP] 402 Payment Required - Check API subscription and limits. Response:`, errorText.substring(0, 300));
            }
            throw new Error(errorMsg);
          }
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
          // Update timestamp when price is updated
          updates.last_price_update = new Date().toISOString();
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
                const errorMsg = e?.message || String(e);
                if (errorMsg.includes('402')) {
                  console.error(`[FMP] 402 error for ${t}:`, errorMsg);
                } else {
                  console.warn('chunk update error', t, errorMsg);
                }
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
      const watchlistId = req.query.watchlistId ? parseInt(req.query.watchlistId) : null;
      const all = req.query.all === 'true' || req.query.all === '1'; // Get all watchlist items if all=true
      
      // If watchlistId is provided, get items from that watchlist
      // If all=true, get all items from all watchlists
      // Otherwise, get items from default watchlist (for backward compatibility)
      let query = supabase.from('watchlist').select('*').eq('user_id', userId);
      
      if (all) {
        // Get all items from all watchlists - don't filter by watchlist_id
        // This is used by frontend to determine which watchlist each company belongs to
      } else if (watchlistId) {
        query = query.eq('watchlist_id', watchlistId);
      } else {
        // Get default watchlist for user
        const { data: defaultWl } = await supabase
          .from('watchlists')
          .select('id')
          .eq('user_id', userId)
          .eq('is_default', true)
          .single();
        if (defaultWl) {
          query = query.eq('watchlist_id', defaultWl.id);
        }
      }
      
      const { data, error } = await query;
      if (error) return res.status(500).json({ message: 'Failed to fetch watchlist' });
      const normalized = (data || []).map(i => ({ 
        id: i.id, 
        companySymbol: i.company_symbol, 
        userId: i.user_id,
        watchlistId: i.watchlist_id 
      }));
      return res.json(normalized);
    } catch (e) {
      return res.status(500).json({ message: 'Failed to fetch watchlist' });
    }
  });

  // Get all watchlists for user
  app.get('/api/watchlists', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { data, error } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) return res.status(500).json({ message: 'Failed to fetch watchlists' });
      return res.json(data || []);
    } catch (e) {
      return res.status(500).json({ message: 'Failed to fetch watchlists' });
    }
  });

  // Create new watchlist
  app.post('/api/watchlists', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { name } = req.body || {};
      if (!name || !name.trim()) return res.status(400).json({ message: 'Watchlist name is required' });
      
      const { data, error } = await supabase
        .from('watchlists')
        .insert({ user_id: userId, name: name.trim() })
        .select('*')
        .single();
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return res.status(400).json({ message: 'Watchlist with this name already exists' });
        }
        return res.status(500).json({ message: 'Failed to create watchlist' });
      }
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ message: 'Failed to create watchlist' });
    }
  });

  // Update watchlist name
  app.put('/api/watchlists/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const watchlistId = parseInt(req.params.id);
      const { name } = req.body || {};
      
      if (!name || !name.trim()) return res.status(400).json({ message: 'Watchlist name is required' });
      
      // Verify ownership
      const { data: existing } = await supabase
        .from('watchlists')
        .select('*')
        .eq('id', watchlistId)
        .eq('user_id', userId)
        .single();
      
      if (!existing) return res.status(404).json({ message: 'Watchlist not found' });
      
      const { data, error } = await supabase
        .from('watchlists')
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq('id', watchlistId)
        .eq('user_id', userId)
        .select('*')
        .single();
      
      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({ message: 'Watchlist with this name already exists' });
        }
        return res.status(500).json({ message: 'Failed to update watchlist' });
      }
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ message: 'Failed to update watchlist' });
    }
  });

  // Delete watchlist
  app.delete('/api/watchlists/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const watchlistId = parseInt(req.params.id);
      
      // Verify ownership and check if it's default
      const { data: existing } = await supabase
        .from('watchlists')
        .select('*')
        .eq('id', watchlistId)
        .eq('user_id', userId)
        .single();
      
      if (!existing) return res.status(404).json({ message: 'Watchlist not found' });
      if (existing.is_default) return res.status(400).json({ message: 'Cannot delete default watchlist' });
      
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', watchlistId)
        .eq('user_id', userId);
      
      if (error) return res.status(500).json({ message: 'Failed to delete watchlist' });
      return res.json({ message: 'Watchlist deleted' });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to delete watchlist' });
    }
  });

  // Move company from one watchlist to another
  app.post('/api/watchlist/move', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { companySymbol, fromWatchlistId, toWatchlistId } = req.body || {};
      
      if (!companySymbol || !fromWatchlistId || !toWatchlistId) {
        return res.status(400).json({ message: 'Company symbol, fromWatchlistId, and toWatchlistId are required' });
      }
      
      // Verify ownership of both watchlists
      const { data: watchlists } = await supabase
        .from('watchlists')
        .select('id')
        .eq('user_id', userId)
        .in('id', [fromWatchlistId, toWatchlistId]);
      
      if (!watchlists || watchlists.length !== 2) {
        return res.status(403).json({ message: 'Invalid watchlist ownership' });
      }
      
      // Update watchlist_id
      const { error } = await supabase
        .from('watchlist')
        .update({ watchlist_id: toWatchlistId })
        .eq('user_id', userId)
        .eq('company_symbol', companySymbol)
        .eq('watchlist_id', fromWatchlistId);
      
      if (error) return res.status(500).json({ message: 'Failed to move company' });
      return res.json({ message: 'Company moved successfully' });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to move company' });
    }
  });


  // Watchlist: return full company objects with enrichment from index tables (fill missing metrics)
  app.get('/api/watchlist/companies', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const watchlistId = req.query.watchlistId ? parseInt(req.query.watchlistId) : null;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const sortBy = (req.query.sortBy || 'marketCap').toString();
      const sortOrder = ((req.query.sortOrder || 'desc').toString() === 'asc') ? 'asc' : 'desc';
      
      let query = supabase.from('watchlist').select('company_symbol').eq('user_id', userId);
      
      if (watchlistId) {
        query = query.eq('watchlist_id', watchlistId);
      } else {
        // Get default watchlist
        const { data: defaultWl } = await supabase
          .from('watchlists')
          .select('id')
          .eq('user_id', userId)
          .eq('is_default', true)
          .single();
        if (defaultWl) {
          query = query.eq('watchlist_id', defaultWl.id);
        }
      }
      
      const { data: wl, error: wlErr } = await query;
      if (wlErr) return res.status(500).json({ message: 'Failed to fetch watchlist' });
      const symbols = (wl || []).map(r => r.company_symbol).filter(Boolean);
      if (!symbols.length) return res.json({ companies: [], total: 0, limit, offset, hasMore: false });

      // Load master rows
      const { data: master } = await supabase.from('companies').select('*').in('symbol', symbols);
      const bySym = new Map((master || []).map(r => [r.symbol, r]));

      // Load fallbacks from index tables for ALL symbols (not only missing)
      const selectCols = 'symbol, price, market_cap, pe_ratio, price_to_sales_ratio, dividend_yield, revenue, net_income, free_cash_flow, total_assets, total_equity, return_3_year, return_5_year, return_10_year, max_drawdown_3_year, max_drawdown_5_year, max_drawdown_10_year, ar_mdd_ratio_3_year, ar_mdd_ratio_5_year, ar_mdd_ratio_10_year, dcf_enterprise_value, margin_of_safety, dcf_implied_growth, roic, roic_10y_avg, roic_10y_std, fcf_margin_median_10y, debt_to_equity, interest_coverage, cash_flow_to_debt, revenue_growth_3y, revenue_growth_5y, revenue_growth_10y, net_profit_margin, asset_turnover, financial_leverage, roe, roic_y1, roic_y2, roic_y3, roic_y4, roic_y5, roic_y6, roic_y7, roic_y8, roic_y9, roic_y10, revenue_y1, revenue_y2, revenue_y3, revenue_y4, revenue_y5, revenue_y6, revenue_y7, revenue_y8, revenue_y9, revenue_y10, fcf_y1, fcf_y2, fcf_y3, fcf_y4, fcf_y5, fcf_y6, fcf_y7, fcf_y8, fcf_y9, fcf_y10';
      const [sp500, ndx, dji, ftse] = await Promise.all([
        supabase.from('sp500_companies').select(selectCols).in('symbol', symbols),
        supabase.from('nasdaq100_companies').select(selectCols).in('symbol', symbols),
        supabase.from('dow_jones_companies').select(selectCols).in('symbol', symbols),
        supabase.from('ftse100_companies').select(selectCols).in('symbol', symbols),
      ]);

      // Build fallback map with first non-null values (preference order: nasdaq100, sp500, dowjones for tech-heavy)
      const fallback = new Map();
      const merge = (rows) => {
        if (rows && Array.isArray(rows.data)) {
          for (const r of rows.data) {
            if (!r?.symbol) continue;
            const prev = fallback.get(r.symbol) || {};
            const next = { ...prev };
            const keys = ['price','market_cap','pe_ratio','price_to_sales_ratio','dividend_yield','revenue','net_income','free_cash_flow','total_assets','total_equity','return_3_year','return_5_year','return_10_year','max_drawdown_3_year','max_drawdown_5_year','max_drawdown_10_year','ar_mdd_ratio_3_year','ar_mdd_ratio_5_year','ar_mdd_ratio_10_year','dcf_enterprise_value','margin_of_safety','dcf_implied_growth','roic','roic_10y_avg','roic_10y_std','fcf_margin_median_10y','debt_to_equity','interest_coverage','cash_flow_to_debt','revenue_growth_3y','revenue_growth_5y','revenue_growth_10y','net_profit_margin','asset_turnover','financial_leverage','roe','roic_y1','roic_y2','roic_y3','roic_y4','roic_y5','roic_y6','roic_y7','roic_y8','roic_y9','roic_y10','revenue_y1','revenue_y2','revenue_y3','revenue_y4','revenue_y5','revenue_y6','revenue_y7','revenue_y8','revenue_y9','revenue_y10','fcf_y1','fcf_y2','fcf_y3','fcf_y4','fcf_y5','fcf_y6','fcf_y7','fcf_y8','fcf_y9','fcf_y10'];
            for (const k of keys) {
              const val = r[k];
              if ((next[k] === undefined || next[k] === null) && (val !== undefined && val !== null)) next[k] = val;
            }
            fallback.set(r.symbol, next);
          }
        }
      };
      // Prefer Nasdaq100 values when есть (для BIIB и др.), затем S&P, затем Dow, затем FTSE
      merge(ndx); merge(sp500); merge(dji); merge(ftse);

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
          applyIfMissing('total_assets', 'total_assets');
          applyIfMissing('total_equity', 'total_equity');
          applyIfMissing('return_3_year', 'return_3_year');
          applyIfMissing('return_5_year', 'return_5_year');
          applyIfMissing('return_10_year', 'return_10_year');
          applyIfMissing('max_drawdown_3_year', 'max_drawdown_3_year');
          applyIfMissing('max_drawdown_5_year', 'max_drawdown_5_year');
          applyIfMissing('max_drawdown_10_year', 'max_drawdown_10_year');
          applyIfMissing('ar_mdd_ratio_3_year', 'ar_mdd_ratio_3_year');
          applyIfMissing('ar_mdd_ratio_5_year', 'ar_mdd_ratio_5_year');
          applyIfMissing('ar_mdd_ratio_10_year', 'ar_mdd_ratio_10_year');
          applyIfMissing('roic', 'roic');
          applyIfMissing('roic_10y_avg', 'roic_10y_avg');
          applyIfMissing('roic_10y_std', 'roic_10y_std');
          applyIfMissing('fcf_margin_median_10y', 'fcf_margin_median_10y');
          applyIfMissing('debt_to_equity', 'debt_to_equity');
          applyIfMissing('interest_coverage', 'interest_coverage');
          applyIfMissing('cash_flow_to_debt', 'cash_flow_to_debt');
          applyIfMissing('revenue_growth_3y', 'revenue_growth_3y');
          applyIfMissing('revenue_growth_5y', 'revenue_growth_5y');
          applyIfMissing('revenue_growth_10y', 'revenue_growth_10y');
          applyIfMissing('net_profit_margin', 'net_profit_margin');
          applyIfMissing('asset_turnover', 'asset_turnover');
          applyIfMissing('financial_leverage', 'financial_leverage');
          applyIfMissing('roe', 'roe');
          applyIfMissing('roic_y1', 'roic_y1');
          applyIfMissing('roic_y2', 'roic_y2');
          applyIfMissing('roic_y3', 'roic_y3');
          applyIfMissing('roic_y4', 'roic_y4');
          applyIfMissing('roic_y5', 'roic_y5');
          applyIfMissing('roic_y6', 'roic_y6');
          applyIfMissing('roic_y7', 'roic_y7');
          applyIfMissing('roic_y8', 'roic_y8');
          applyIfMissing('roic_y9', 'roic_y9');
          applyIfMissing('roic_y10', 'roic_y10');
          applyIfMissing('revenue_y1', 'revenue_y1');
          applyIfMissing('revenue_y2', 'revenue_y2');
          applyIfMissing('revenue_y3', 'revenue_y3');
          applyIfMissing('revenue_y4', 'revenue_y4');
          applyIfMissing('revenue_y5', 'revenue_y5');
          applyIfMissing('revenue_y6', 'revenue_y6');
          applyIfMissing('revenue_y7', 'revenue_y7');
          applyIfMissing('revenue_y8', 'revenue_y8');
          applyIfMissing('revenue_y9', 'revenue_y9');
          applyIfMissing('revenue_y10', 'revenue_y10');
          applyIfMissing('fcf_y1', 'fcf_y1');
          applyIfMissing('fcf_y2', 'fcf_y2');
          applyIfMissing('fcf_y3', 'fcf_y3');
          applyIfMissing('fcf_y4', 'fcf_y4');
          applyIfMissing('fcf_y5', 'fcf_y5');
          applyIfMissing('fcf_y6', 'fcf_y6');
          applyIfMissing('fcf_y7', 'fcf_y7');
          applyIfMissing('fcf_y8', 'fcf_y8');
          applyIfMissing('fcf_y9', 'fcf_y9');
          applyIfMissing('fcf_y10', 'fcf_y10');
          // Prefer master DCF when есть, иначе fallback
          if (r.dcf_enterprise_value == null && fb.dcf_enterprise_value != null) r.dcf_enterprise_value = fb.dcf_enterprise_value;
          if (r.margin_of_safety == null && fb.margin_of_safety != null) r.margin_of_safety = fb.margin_of_safety;
          if (r.dcf_implied_growth == null && fb.dcf_implied_growth != null) r.dcf_implied_growth = fb.dcf_implied_growth;
        }
        rows.push(r);
      }

      // Enrich with master table data (like listFromTable does)
      if (symbols.length) {
        const cols = 'symbol, price, market_cap, pe_ratio, price_to_sales_ratio, dividend_yield, revenue, net_income, free_cash_flow, total_assets, total_equity, return_3_year, return_5_year, return_10_year, max_drawdown_3_year, max_drawdown_5_year, max_drawdown_10_year, ar_mdd_ratio_3_year, ar_mdd_ratio_5_year, ar_mdd_ratio_10_year, dcf_enterprise_value, margin_of_safety, dcf_implied_growth, roic, roic_10y_avg, roic_10y_std, fcf_margin_median_10y, debt_to_equity, interest_coverage, cash_flow_to_debt, revenue_growth_3y, revenue_growth_5y, revenue_growth_10y, net_profit_margin, asset_turnover, financial_leverage, roe, roic_y1, roic_y2, roic_y3, roic_y4, roic_y5, roic_y6, roic_y7, roic_y8, roic_y9, roic_y10, revenue_y1, revenue_y2, revenue_y3, revenue_y4, revenue_y5, revenue_y6, revenue_y7, revenue_y8, revenue_y9, revenue_y10, fcf_y1, fcf_y2, fcf_y3, fcf_y4, fcf_y5, fcf_y6, fcf_y7, fcf_y8, fcf_y9, fcf_y10';
        const { data: masterEnrich } = await supabase.from('companies').select(cols).in('symbol', symbols);
        if (masterEnrich && Array.isArray(masterEnrich)) {
          const masterBySym = new Map(masterEnrich.map(m => [m.symbol, m]));
          for (const r of rows) {
            const m = masterBySym.get(r.symbol);
            if (!m) continue;
            const applyIfMissing = (key) => {
              if (r[key] === null || r[key] === undefined || (typeof r[key] === 'number' && r[key] === 0)) {
                if (m[key] !== null && m[key] !== undefined) r[key] = m[key];
              }
            };
            applyIfMissing('price');
            applyIfMissing('market_cap');
            applyIfMissing('pe_ratio');
            if (r.price_to_sales_ratio == null || Number(r.price_to_sales_ratio) === 0) {
              if (m.price_to_sales_ratio != null && Number(m.price_to_sales_ratio) !== 0) {
                r.price_to_sales_ratio = m.price_to_sales_ratio;
              }
            }
            applyIfMissing('dividend_yield');
            applyIfMissing('revenue');
            applyIfMissing('net_income');
            applyIfMissing('free_cash_flow');
            applyIfMissing('total_assets');
            applyIfMissing('total_equity');
            applyIfMissing('return_3_year');
            applyIfMissing('return_5_year');
            applyIfMissing('return_10_year');
            applyIfMissing('max_drawdown_3_year');
            applyIfMissing('max_drawdown_5_year');
            applyIfMissing('max_drawdown_10_year');
            applyIfMissing('ar_mdd_ratio_3_year');
            applyIfMissing('ar_mdd_ratio_5_year');
            applyIfMissing('ar_mdd_ratio_10_year');
            if (m.dcf_enterprise_value !== null && m.dcf_enterprise_value !== undefined) r.dcf_enterprise_value = m.dcf_enterprise_value;
            if (m.margin_of_safety !== null && m.margin_of_safety !== undefined) r.margin_of_safety = m.margin_of_safety;
            if (m.dcf_implied_growth !== null && m.dcf_implied_growth !== undefined) r.dcf_implied_growth = m.dcf_implied_growth;
            applyIfMissing('roic');
            applyIfMissing('roic_10y_avg');
            applyIfMissing('roic_10y_std');
            if (m.fcf_margin_median_10y !== null && m.fcf_margin_median_10y !== undefined) r.fcf_margin_median_10y = m.fcf_margin_median_10y;
            applyIfMissing('debt_to_equity');
            applyIfMissing('interest_coverage');
            applyIfMissing('cash_flow_to_debt');
            applyIfMissing('revenue_growth_3y');
            applyIfMissing('revenue_growth_5y');
            applyIfMissing('revenue_growth_10y');
            applyIfMissing('net_profit_margin');
            applyIfMissing('asset_turnover');
            applyIfMissing('financial_leverage');
            applyIfMissing('roe');
            applyIfMissing('roic_y1');
            applyIfMissing('roic_y2');
            applyIfMissing('roic_y3');
            applyIfMissing('roic_y4');
            applyIfMissing('roic_y5');
            applyIfMissing('roic_y6');
            applyIfMissing('roic_y7');
            applyIfMissing('roic_y8');
            applyIfMissing('roic_y9');
            applyIfMissing('roic_y10');
            applyIfMissing('revenue_y1');
            applyIfMissing('revenue_y2');
            applyIfMissing('revenue_y3');
            applyIfMissing('revenue_y4');
            applyIfMissing('revenue_y5');
            applyIfMissing('revenue_y6');
            applyIfMissing('revenue_y7');
            applyIfMissing('revenue_y8');
            applyIfMissing('revenue_y9');
            applyIfMissing('revenue_y10');
            applyIfMissing('fcf_y1');
            applyIfMissing('fcf_y2');
            applyIfMissing('fcf_y3');
            applyIfMissing('fcf_y4');
            applyIfMissing('fcf_y5');
            applyIfMissing('fcf_y6');
            applyIfMissing('fcf_y7');
            applyIfMissing('fcf_y8');
            applyIfMissing('fcf_y9');
            applyIfMissing('fcf_y10');
          }
        }
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
      const { companySymbol, watchlistId } = req.body || {};
      const userId = req.user?.id;
      if (!companySymbol) return res.status(400).json({ message: 'Company symbol is required' });
      
      // If watchlistId not provided, use default watchlist
      let targetWatchlistId = watchlistId;
      if (!targetWatchlistId) {
        const { data: defaultWl } = await supabase
          .from('watchlists')
          .select('id')
          .eq('user_id', userId)
          .eq('is_default', true)
          .single();
        if (!defaultWl) {
          // Create default watchlist if it doesn't exist
          const { data: newWl } = await supabase
            .from('watchlists')
            .insert({ user_id: userId, name: 'My Watchlist', is_default: true })
            .select('*')
            .single();
          targetWatchlistId = newWl?.id;
        } else {
          targetWatchlistId = defaultWl.id;
        }
      }
      
      // Verify ownership if watchlistId was provided
      if (watchlistId) {
        const { data: wl } = await supabase
          .from('watchlists')
          .select('id')
          .eq('id', watchlistId)
          .eq('user_id', userId)
          .single();
        if (!wl) return res.status(403).json({ message: 'Invalid watchlist ownership' });
      }
      
      const { data, error } = await supabase
        .from('watchlist')
        .insert({ user_id: userId, company_symbol: companySymbol, watchlist_id: targetWatchlistId })
        .select('*')
        .single();
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return res.status(400).json({ message: 'Company already in watchlist' });
        }
        console.warn('Insert watchlist error:', error);
      }
      const response = data ? { 
        id: data.id, 
        userId: data.user_id, 
        companySymbol: data.company_symbol,
        watchlistId: data.watchlist_id 
      } : { userId, companySymbol, watchlistId: targetWatchlistId };
      return res.json(response);
    } catch (e) {
      return res.status(500).json({ message: 'Failed to add to watchlist' });
    }
  });

  app.delete('/api/watchlist/:symbol', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const symbol = req.params.symbol;
      const watchlistIdParam = req.query.watchlistId;
      
      console.log('[DELETE] Request:', { userId, symbol, watchlistIdParam, query: req.query });
      
      // Convert watchlistId to number if provided
      const watchlistId = watchlistIdParam ? (typeof watchlistIdParam === 'string' ? parseInt(watchlistIdParam, 10) : watchlistIdParam) : null;
      
      console.log('[DELETE] Parsed watchlistId:', { watchlistIdParam, watchlistId, isNaN: isNaN(watchlistId), type: typeof watchlistId });
      
      // If watchlistId provided, delete only from that watchlist
      // IMPORTANT: Never delete from all watchlists - always require watchlistId
      if (watchlistId !== null && watchlistId !== undefined && !isNaN(watchlistId) && watchlistId > 0) {
        // Verify the watchlist belongs to the user
        const { data: watchlist } = await supabase
          .from('watchlists')
          .select('id')
          .eq('id', watchlistId)
          .eq('user_id', userId)
          .single();
        
        if (!watchlist) {
          console.log('[DELETE] Watchlist not found or not owned by user:', { watchlistId, userId });
          return res.status(403).json({ message: 'Invalid watchlist ownership' });
        }
        
        const { data: deleted, error } = await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', userId)
          .eq('company_symbol', symbol)
          .eq('watchlist_id', watchlistId)
          .select('id');
        
        console.log('[DELETE] Delete result:', { deleted, error, deletedCount: deleted?.length });
        
        if (error) {
          console.error('[DELETE] Delete error:', error);
          return res.status(500).json({ message: 'Failed to remove from watchlist', error: error.message });
        }
        
        return res.json({ message: 'Removed from watchlist', deleted: deleted?.length || 0 });
      } else {
        console.log('[DELETE] No watchlistId provided - refusing to delete from all watchlists');
        return res.status(400).json({ message: 'watchlistId is required to remove from a specific watchlist' });
      }
    } catch (e) {
      console.error('[DELETE] Exception:', e);
      return res.status(500).json({ message: 'Failed to remove from watchlist', error: e.message });
    }
  });

  // Create new watchlist
  app.post('/api/watchlists', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { name } = req.body || {};
      if (!name || !name.trim()) return res.status(400).json({ message: 'Watchlist name is required' });
      
      // Check if name already exists for this user
      const { data: existing } = await supabase
        .from('watchlists')
        .select('id')
        .eq('user_id', userId)
        .eq('name', name.trim())
        .single();
      
      if (existing) return res.status(400).json({ message: 'Watchlist with this name already exists' });
      
      const { data, error } = await supabase
        .from('watchlists')
        .insert({ user_id: userId, name: name.trim(), is_default: false })
        .select('*')
        .single();
      
      if (error) return res.status(500).json({ message: 'Failed to create watchlist' });
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ message: 'Failed to create watchlist' });
    }
  });

  // Update watchlist (rename)
  app.put('/api/watchlists/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const watchlistId = parseInt(req.params.id);
      const { name } = req.body || {};
      
      if (!name || !name.trim()) return res.status(400).json({ message: 'Watchlist name is required' });
      
      // Verify ownership
      const { data: existing } = await supabase
        .from('watchlists')
        .select('id, name')
        .eq('id', watchlistId)
        .eq('user_id', userId)
        .single();
      
      if (!existing) return res.status(404).json({ message: 'Watchlist not found' });
      
      // Check if new name already exists (excluding current watchlist)
      const { data: nameExists } = await supabase
        .from('watchlists')
        .select('id')
        .eq('user_id', userId)
        .eq('name', name.trim())
        .neq('id', watchlistId)
        .single();
      
      if (nameExists) return res.status(400).json({ message: 'Watchlist with this name already exists' });
      
      const { data, error } = await supabase
        .from('watchlists')
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq('id', watchlistId)
        .eq('user_id', userId)
        .select('*')
        .single();
      
      if (error) return res.status(500).json({ message: 'Failed to update watchlist' });
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ message: 'Failed to update watchlist' });
    }
  });

  // Delete watchlist
  app.delete('/api/watchlists/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const watchlistId = parseInt(req.params.id);
      
      // Verify ownership and check if it's default
      const { data: existing } = await supabase
        .from('watchlists')
        .select('id, is_default')
        .eq('id', watchlistId)
        .eq('user_id', userId)
        .single();
      
      if (!existing) return res.status(404).json({ message: 'Watchlist not found' });
      if (existing.is_default) return res.status(400).json({ message: 'Cannot delete default watchlist' });
      
      // Delete watchlist (cascade will delete all items)
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', watchlistId)
        .eq('user_id', userId);
      
      if (error) return res.status(500).json({ message: 'Failed to delete watchlist' });
      return res.json({ message: 'Watchlist deleted' });
    } catch (e) {
      return res.status(500).json({ message: 'Failed to delete watchlist' });
    }
  });

  // Move company from one watchlist to another
  app.post('/api/watchlist/move', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { companySymbol, fromWatchlistId, toWatchlistId } = req.body || {};
      
      console.log('[MOVE] Request:', { userId, companySymbol, fromWatchlistId, toWatchlistId, body: req.body });
      
      // Convert to numbers if they're strings
      const fromId = typeof fromWatchlistId === 'string' ? parseInt(fromWatchlistId, 10) : fromWatchlistId;
      const toId = typeof toWatchlistId === 'string' ? parseInt(toWatchlistId, 10) : toWatchlistId;
      
      if (!companySymbol || !fromId || !toId || isNaN(fromId) || isNaN(toId)) {
        console.log('[MOVE] Validation failed:', { companySymbol, fromId, toId });
        return res.status(400).json({ message: 'Company symbol, from and to watchlist IDs are required' });
      }
      
      // Verify ownership of both watchlists
      const { data: watchlists, error: watchlistsError } = await supabase
        .from('watchlists')
        .select('id')
        .eq('user_id', userId)
        .in('id', [fromId, toId]);
      
      console.log('[MOVE] Watchlists check:', { watchlists, error: watchlistsError, userId, fromId, toId });
      
      if (watchlistsError) {
        console.error('[MOVE] Watchlists query error:', watchlistsError);
        return res.status(500).json({ message: 'Failed to verify watchlist ownership' });
      }
      
      if (!watchlists || watchlists.length !== 2) {
        console.log('[MOVE] Ownership check failed:', { watchlistsCount: watchlists?.length, watchlists });
        return res.status(403).json({ message: 'Invalid watchlist ownership' });
      }
      
      // Check if company exists in source watchlist
      const { data: existing, error: existingError } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', userId)
        .eq('company_symbol', companySymbol)
        .eq('watchlist_id', fromId)
        .maybeSingle();
      
      console.log('[MOVE] Source exists check:', { existing, error: existingError, fromId });
      
      if (!existing) {
        console.log('[MOVE] Company not found in source watchlist');
        return res.status(404).json({ message: 'Company not found in source watchlist' });
      }
      
      // Check if company already exists in target watchlist
      const { data: targetExists, error: targetError } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', userId)
        .eq('company_symbol', companySymbol)
        .eq('watchlist_id', toId)
        .maybeSingle();
      
      console.log('[MOVE] Target exists check:', { targetExists, error: targetError, toId });
      
      if (targetExists) {
        // Just delete from source if already in target
        console.log('[MOVE] Company already in target, deleting from source');
        const { error: delError } = await supabase
          .from('watchlist')
          .delete()
          .eq('id', existing.id);
        if (delError) {
          console.error('[MOVE] Delete error:', delError);
          return res.status(500).json({ message: 'Failed to move company' });
        }
        return res.json({ message: 'Company moved (was already in target watchlist)' });
      }
      
      // Update watchlist_id
      const { data, error } = await supabase
        .from('watchlist')
        .update({ watchlist_id: toId })
        .eq('id', existing.id)
        .select('*')
        .single();
      
      console.log('[MOVE] Update result:', { data, error });
      
      if (error) {
        console.error('[MOVE] Update error:', error);
        return res.status(500).json({ message: 'Failed to move company', error: error.message });
      }
      return res.json(data);
    } catch (e) {
      console.error('[MOVE] Exception:', e);
      return res.status(500).json({ message: 'Failed to move company', error: e.message });
    }
  });

  // Copy company to another watchlist
  app.post('/api/watchlist/copy', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { companySymbol, fromWatchlistId, toWatchlistId } = req.body || {};
      
      console.log('[COPY] Request:', { userId, companySymbol, fromWatchlistId, toWatchlistId, body: req.body });
      
      // Convert to numbers if they're strings
      const fromId = typeof fromWatchlistId === 'string' ? parseInt(fromWatchlistId, 10) : fromWatchlistId;
      const toId = typeof toWatchlistId === 'string' ? parseInt(toWatchlistId, 10) : toWatchlistId;
      
      if (!companySymbol || !fromId || !toId || isNaN(fromId) || isNaN(toId)) {
        console.log('[COPY] Validation failed:', { companySymbol, fromId, toId });
        return res.status(400).json({ message: 'Company symbol, from and to watchlist IDs are required' });
      }
      
      // Verify ownership of both watchlists
      const { data: watchlists, error: watchlistsError } = await supabase
        .from('watchlists')
        .select('id')
        .eq('user_id', userId)
        .in('id', [fromId, toId]);
      
      console.log('[COPY] Watchlists check:', { watchlists, error: watchlistsError, userId, fromId, toId });
      
      if (watchlistsError) {
        console.error('[COPY] Watchlists query error:', watchlistsError);
        return res.status(500).json({ message: 'Failed to verify watchlist ownership' });
      }
      
      if (!watchlists || watchlists.length !== 2) {
        console.log('[COPY] Ownership check failed:', { watchlistsCount: watchlists?.length, watchlists });
        return res.status(403).json({ message: 'Invalid watchlist ownership' });
      }
      
      // Check if company already exists in target watchlist (with watchlist_id)
      const { data: targetExists, error: existsError } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', userId)
        .eq('company_symbol', companySymbol)
        .eq('watchlist_id', toId)
        .maybeSingle();
      
      console.log('[COPY] Target exists check:', { targetExists, error: existsError, userId, companySymbol, toId });
      
      if (targetExists) {
        console.log('[COPY] Company already exists in target watchlist');
        return res.status(400).json({ message: 'Company already exists in target watchlist' });
      }
      
      // Verify company exists in source watchlist
      const { data: sourceExists, error: sourceError } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', userId)
        .eq('company_symbol', companySymbol)
        .eq('watchlist_id', fromId)
        .maybeSingle();
      
      console.log('[COPY] Source exists check:', { sourceExists, error: sourceError, fromId });
      
      if (!sourceExists) {
        console.log('[COPY] Company does not exist in source watchlist');
        return res.status(400).json({ message: 'Company does not exist in source watchlist' });
      }
      
      // Insert into target watchlist
      const { data, error } = await supabase
        .from('watchlist')
        .insert({ user_id: userId, company_symbol: companySymbol, watchlist_id: toId })
        .select('*')
        .single();
      
      console.log('[COPY] Insert result:', { data, error });
      
      if (error) {
        console.error('[COPY] Insert error:', error);
        if (error.code === '23505') {
          // Check if it's the new constraint (with watchlist_id) or old one (without)
          if (error.details && error.details.includes('watchlist_user_company_watchlist_unique')) {
            return res.status(400).json({ message: 'Company already exists in target watchlist' });
          } else if (error.details && error.details.includes('watchlist_user_company_unique')) {
            // Old constraint - this shouldn't happen if migration is applied, but handle it
            return res.status(400).json({ message: 'Company already exists. Please run the database migration to fix this.' });
          }
          return res.status(400).json({ message: 'Company already exists in target watchlist' });
        }
        return res.status(500).json({ message: 'Failed to copy company', error: error.message });
      }
      return res.json(data);
    } catch (e) {
      console.error('[COPY] Exception:', e);
      return res.status(500).json({ message: 'Failed to copy company', error: e.message });
    }
  });

  // Stripe checkout (optional)
  app.post('/api/stripe/create-checkout-session', isAuthenticated, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) return res.status(400).json({ error: { message: 'Stripe not configured' } });
      const { priceId, plan } = req.body || {};
      const planLower = (plan || '').toString().toLowerCase();
      let resolvedPriceId = priceId;
      if (!resolvedPriceId) {
        const monthly = process.env.STRIPE_MONTHLY_PRICE_ID || process.env.STRIPE_PRICE_MONTHLY;
        const annual = process.env.STRIPE_ANNUAL_PRICE_ID || process.env.STRIPE_PRICE_ANNUAL;
        const quarterly = process.env.STRIPE_QUARTERLY_PRICE_ID || process.env.STRIPE_PRICE_QUARTERLY;
        if (planLower === 'monthly' && monthly) resolvedPriceId = monthly;
        if (planLower === 'annual' && annual) resolvedPriceId = annual;
        if (planLower === 'quarterly' && quarterly) resolvedPriceId = quarterly;
      }
      if (!resolvedPriceId) return res.status(400).json({ error: { message: 'Price ID is required' } });
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
      // Try to reuse existing Stripe customer; otherwise create one via Checkout
      let customerId = null; let userEmail = null;
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('stripe_customer_id,email')
          .eq('id', req.user.id)
          .single();
        customerId = dbUser?.stripe_customer_id || null;
        userEmail = dbUser?.email || req.user?.email || null;
      } catch {}

      const baseParams = {
        payment_method_types: ['card'],
        line_items: [{ price: resolvedPriceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
        metadata: { userId: req.user.id, priceId: resolvedPriceId, plan: planLower || null },
        subscription_data: {
          trial_period_days: 7, // 7-day free trial for all subscriptions
        },
      };

      const sessionParams = customerId
        ? { ...baseParams, customer: customerId, customer_update: { name: 'auto', address: 'auto' } }
        : { ...baseParams, customer_email: userEmail || undefined, customer_creation: 'always' };


      const session = await stripe.checkout.sessions.create(sessionParams);
      return res.json({ sessionId: session.id, url: session.url });
    } catch (e) {
      console.error('Stripe checkout error:', e);
      return res.status(500).json({ error: { message: 'Failed to create checkout session' } });
    }
  });

  // Optional fallback: confirm checkout session and set user tier
  app.post('/api/stripe/confirm', isAuthenticated, async (req, res) => {
    try {
      const { sessionId } = req.body || {};
      if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });
      if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: 'Stripe not configured' });

      const stripe = new (require('stripe'))(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!session) return res.status(404).json({ message: 'Session not found' });

      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        return res.status(400).json({ message: 'Payment not completed yet' });
      }

      let tier = 'paid';
      if (session.mode === 'payment') {
        // Lifetime one‑time payment
        tier = 'lifetime';
      } else if (session.subscription) {
        try {
          const sub = await stripe.subscriptions.retrieve(session.subscription, { expand: ['items.data.price'] });
          const interval = (sub?.items?.data?.[0]?.price?.recurring?.interval) || (sub?.plan?.interval);
          if (interval === 'year') tier = 'annual';
          else if (interval === 'quarter') tier = 'quarterly';
          else tier = 'paid';
        } catch (e) {
          // ignore and keep default
        }
      }

      const userId = req?.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const updatePayload = {
        subscription_tier: tier,
        stripe_customer_id: (typeof session.customer === 'string') ? session.customer : null,
        stripe_subscription_id: (typeof session.subscription === 'string') ? session.subscription : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', userId);
      if (error) return res.status(500).json({ message: 'Failed to update user', error });

      const amount_total = session.amount_total || null;
      const currency = session.currency || null;
      return res.json({ success: true, tier, amount_total, currency });
    } catch (e) {
      console.error('Error in /api/stripe/confirm:', e);
      return res.status(500).json({ message: 'Failed to confirm session' });
    }
  });
}


