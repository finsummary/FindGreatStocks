import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://findgreatstocks.com';

/** Phase 1 sample pages for programmatic SEO */
const COMPANY_SLUGS = ['aapl', 'msft', 'nvda', 'v'];
const STRATEGY_SLUGS = ['compounder-stocks', 'high-roic-stocks', 'high-fcf-stocks'];
const SECTOR_SLUGS = ['software', 'semiconductors', 'banking'];
const COMPARE_SLUGS = ['apple-vs-microsoft', 'nvidia-vs-amd'];
const VALUATION_SLUGS = ['stocks-priced-for-low-growth', 'stocks-undervalued-by-reverse-dcf'];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastMod = new Date().toISOString().split('T')[0];
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: lastMod, changeFrequency: 'daily', priority: 1 },
  ];
  COMPANY_SLUGS.forEach((slug) => {
    entries.push({ url: `${SITE_URL}/stocks/${slug}`, lastModified: lastMod, changeFrequency: 'daily', priority: 0.9 });
  });
  STRATEGY_SLUGS.forEach((slug) => {
    entries.push({ url: `${SITE_URL}/strategy/${slug}`, lastModified: lastMod, changeFrequency: 'daily', priority: 0.8 });
  });
  SECTOR_SLUGS.forEach((slug) => {
    entries.push({ url: `${SITE_URL}/sector/${slug}`, lastModified: lastMod, changeFrequency: 'daily', priority: 0.8 });
  });
  COMPARE_SLUGS.forEach((slug) => {
    entries.push({ url: `${SITE_URL}/compare/${slug}`, lastModified: lastMod, changeFrequency: 'daily', priority: 0.8 });
  });
  VALUATION_SLUGS.forEach((slug) => {
    entries.push({ url: `${SITE_URL}/valuation/${slug}`, lastModified: lastMod, changeFrequency: 'daily', priority: 0.8 });
  });
  return entries;
}
