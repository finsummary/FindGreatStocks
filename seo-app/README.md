# FindGreatStocks SEO App (Phase 1)

Next.js App Router app for programmatic SEO pages. Fetches data from the main FindGreatStocks Express API and renders company, strategy, sector, comparison, and valuation pages with ISR.

## Routes

| Route | Example | Description |
|-------|---------|-------------|
| `/stocks/[ticker]` | `/stocks/aapl` | Company page |
| `/strategy/[slug]` | `/strategy/high-roic-stocks` | Strategy screen page |
| `/sector/[slug]` | `/sector/software` | Sector page |
| `/compare/[slug]` | `/compare/apple-vs-microsoft` | Comparison page |
| `/valuation/[slug]` | `/valuation/stocks-priced-for-low-growth` | Valuation/ranking page |

## Setup

1. Install: `npm install`
2. Create `.env.local`:
   - `SEO_API_BASE` or `NEXT_PUBLIC_API_BASE` – Express API URL (e.g. `http://localhost:5002` in dev)
   - `NEXT_PUBLIC_SITE_URL` – Canonical site URL (e.g. `https://findgreatstocks.com`)
   - `NEXT_PUBLIC_CLIENT_URL` – Main scanner app URL (for "Open Scanner" links)
   - `REVALIDATE_SECRET` – (optional) Secret for `POST /api/revalidate?path=...&secret=...`

3. Run the main API first (from repo root): `npm run start` (or `cd server && npm run dev`)
4. Run SEO app: `npm run dev` (port 3001)

## Build

```bash
npm run build
npm run start
```

## Revalidation

- Pages use `revalidate = 86400` (24h) by default.
- On-demand: `POST /api/revalidate?path=/stocks/aapl` (optional query `secret=...` or header `x-revalidate-secret`).

## Sitemap

`/sitemap.xml` is generated from the Phase 1 sample list (companies, strategies, sectors, compare, valuation).
