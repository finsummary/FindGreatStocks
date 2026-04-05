/**
 * Base URL for the FindGreatStocks Express API (used in server components).
 * In dev: http://localhost:5002; in prod set SEO_API_BASE to your API origin.
 */
export function getApiBase(): string {
  if (typeof process.env.SEO_API_BASE === 'string' && process.env.SEO_API_BASE) {
    return process.env.SEO_API_BASE.replace(/\/$/, '');
  }
  if (typeof process.env.NEXT_PUBLIC_API_BASE === 'string' && process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE.replace(/\/$/, '');
  }
  return 'http://localhost:5002';
}

export async function fetchSeoCompany(ticker: string) {
  const base = getApiBase();
  const res = await fetch(`${base}/api/seo/company/${ticker.toUpperCase()}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSeoSector(slug: string) {
  const base = getApiBase();
  const res = await fetch(`${base}/api/seo/sector/${slug}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSeoStrategy(slug: string) {
  const base = getApiBase();
  const res = await fetch(`${base}/api/seo/strategy/${slug}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSeoCompare(slug: string) {
  const base = getApiBase();
  const res = await fetch(`${base}/api/seo/compare/${slug}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSeoValuation(slug: string) {
  const base = getApiBase();
  const res = await fetch(`${base}/api/seo/valuation/${slug}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  return res.json();
}
