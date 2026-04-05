# Programmatic SEO Engine – Phase 1

This document describes the Phase 1 implementation of the programmatic SEO growth engine for FindGreatStocks.com.

## What Was Built

### 1. Database

- **Tables** (in `shared/schema.ts` and `migrations/add-seo-page-cache-and-internal-links.sql`):
  - `page_cache` – stores AI-generated summaries and metadata per page (type + slug).
  - `internal_links` – for future automated internal linking.

Run the migration on your PostgreSQL/Supabase database:

```bash
# Apply migration (e.g. via Supabase SQL editor or psql)
psql $DATABASE_URL -f migrations/add-seo-page-cache-and-internal-links.sql
```

### 2. Scanner Deep-Links

- **URL params** – The main app (client-app) reads query params on load and applies them to the scanner:
  - `dataset` – e.g. `sp500`, `nasdaq100`, `dowjones`
  - `sortBy` – e.g. `roic`, `revenueGrowth5Y`, `dcfImpliedGrowth`
  - `sortOrder` – `asc` | `desc`
  - `search` or `q` – ticker or company name
- **Files**: `client-app/src/pages/home.tsx`, `client-app/src/components/company-table.tsx`
- **Helper**: `shared/scanner-deeplink.ts` – `buildScannerUrl()`, strategy/sector/valuation helpers.

### 3. Express SEO API

- **Base path**: `/api/seo/`
- **Endpoints**:
  - `GET /api/seo/company/:ticker` – company payload + optional cached AI
  - `GET /api/seo/sector/:slug` – sector companies (from S&P 500)
  - `GET /api/seo/strategy/:slug` – strategy definition + ranked companies
  - `GET /api/seo/compare/:slug` – e.g. `apple-vs-microsoft`
  - `GET /api/seo/valuation/:slug` – `stocks-priced-for-low-growth` | `stocks-undervalued-by-reverse-dcf`
  - `GET /api/seo/page-cache?pageType=&pageSlug=` – read cache
  - `POST /api/seo/generate-summary` – body: `{ pageType, pageSlug, entityKey, payload }` – calls Groq, saves to `page_cache`, returns AI JSON.

- **Storage**: `server/seo.ts` – data fetchers and page cache (Supabase).  
- **Company by ticker**: `storage.getCompanyByTickerFromAnyIndex(symbol)` – resolves from sp500, nasdaq100, dow_jones, ftse100.

### 4. Groq AI

- **Config**: `GROQ_API_KEY`, `GROQ_MODEL` (default `llama-3.1-8b-instant`), `GROQ_API_URL` (default `https://api.groq.com/openai/v1`).
- **Files**: `server/groq.ts`, `server/prompts.ts` – company, strategy, sector, comparison, valuation prompts. All output is cached in `page_cache`; regeneration is event-driven (e.g. when you call `POST /api/seo/generate-summary`).

### 5. Next.js SEO App (`seo-app/`)

- **Framework**: Next.js 14 App Router, React, Tailwind.
- **Routes**: `/stocks/[ticker]`, `/strategy/[slug]`, `/sector/[slug]`, `/compare/[slug]`, `/valuation/[slug]`.
- **Data**: Fetches from Express API (`SEO_API_BASE` or `NEXT_PUBLIC_API_BASE`).
- **Rendering**: Server-rendered; content is in the initial HTML for crawlers.
- **ISR**: `revalidate = 86400` (24h) on all SEO pages.
- **Sitemap**: `app/sitemap.ts` – Phase 1 sample URLs.
- **Revalidate**: `POST /api/revalidate?path=/stocks/aapl` (optional `secret` or `x-revalidate-secret`).

### 6. Phase 1 Sample Pages

- **Companies**: Apple, Microsoft, Nvidia, Visa (`/stocks/aapl`, etc.).
- **Strategies**: compounder-stocks, high-roic-stocks, high-fcf-stocks.
- **Sectors**: software, semiconductors, banking.
- **Compare**: apple-vs-microsoft, nvidia-vs-amd.
- **Valuation**: stocks-priced-for-low-growth, stocks-undervalued-by-reverse-dcf.

## Environment Variables

### Main app (server)

- Existing: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLIENT_URL`, etc.
- **SEO/Groq**:
  - `GROQ_API_KEY` – required for AI summaries.
  - `GROQ_MODEL` – (optional) e.g. `llama-3.1-8b-instant`.
  - `GROQ_API_URL` – (optional) default `https://api.groq.com/openai/v1`.

### SEO Next.js app (`seo-app/.env.local`)

- `SEO_API_BASE` or `NEXT_PUBLIC_API_BASE` – Express API base URL (e.g. `http://localhost:5002`).
- `NEXT_PUBLIC_SITE_URL` – Canonical URL of the SEO app (e.g. `https://findgreatstocks.com`).
- `NEXT_PUBLIC_CLIENT_URL` – Main scanner app URL for “Open Scanner” links.
- `REVALIDATE_SECRET` – (optional) secret for on-demand revalidation.

## How to Run Locally

1. **Database**: Apply `migrations/add-seo-page-cache-and-internal-links.sql`.
2. **Env**: Set `GROQ_API_KEY` (and optional Groq vars) in the server `.env`.
3. **Server**: From repo root, `npm run start` (or `cd server && npm run dev`).
4. **SEO app**: `cd seo-app && npm install && npm run dev` (port 3001).

Then open e.g.:

- http://localhost:3001/stocks/aapl  
- http://localhost:3001/strategy/high-roic-stocks  
- http://localhost:3001/compare/apple-vs-microsoft  

Scanner deep-link (main app):  
http://localhost:5173/?dataset=sp500&sortBy=roic&sortOrder=desc  

## Generating AI Summaries

AI text is not generated on every page view. To populate or refresh:

1. Call `POST /api/seo/generate-summary` with body e.g.:
   - Company: `{ "pageType": "company", "pageSlug": "aapl", "entityKey": "aapl", "payload": { "name": "Apple Inc.", "sector": "Technology", ... } }`
   - Use the same payload shape as in `server/prompts.ts` (companySummaryPrompt, etc.).

2. Or build a small script that fetches each page’s data from the SEO API, then calls `generate-summary` with the returned payload.

After that, the Next.js app will use the cached `ai_summary` / `ai_json` from the API.

## Next Steps (Phase 2+)

- Expand company/sector/strategy lists; add more comparison and valuation pages.
- Implement internal linking engine (use `internal_links` table and scores).
- Add daily/quarterly jobs to refresh data and trigger revalidation for changed pages.
- Optional: store `rendered_payload_json` and use it for faster response or static export.
