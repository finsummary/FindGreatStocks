import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchSeoCompany } from '@/lib/api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://findgreatstocks.com';

type Props = { params: Promise<{ ticker: string }> };

export const revalidate = 86400; // 24h ISR

function fmtNum(v: unknown): string {
  if (v == null) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}
function fmtPct(v: unknown): string {
  if (v == null) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `${(n * 100).toFixed(1)}%`;
}

export async function generateMetadata({ params }: Props) {
  const { ticker } = await params;
  const data = await fetchSeoCompany(ticker);
  if (!data?.company) return { title: 'Company | FindGreatStocks.com' };
  const c = data.company as Record<string, unknown>;
  const title = `${c.name as string} (${(c.symbol as string)}) Stock Analysis | FindGreatStocks.com`;
  const desc = (data.cache as { metaDescription?: string } | undefined)?.metaDescription
    ?? `${c.name as string} – valuation, ROIC, growth, and quality metrics. Use the scanner to find similar stocks.`;
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, url: `${SITE_URL}/stocks/${ticker}` },
  };
}

export default async function CompanyPage({ params }: Props) {
  const { ticker } = await params;
  const data = await fetchSeoCompany(ticker);
  if (!data?.company) notFound();
  const c = data.company as Record<string, unknown>;
  const cache = data.cache as { aiSummary?: string; aiJson?: { summary?: string; standout?: string; valuation_context?: string } } | undefined;
  const scannerUrl = (data.scannerUrl as string) || `${SITE_URL}?dataset=sp500&search=${c.symbol}`;

  const summary = cache?.aiSummary ?? cache?.aiJson?.summary ?? null;

  return (
    <article className="max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">
        {c.name as string} ({c.symbol as string})
      </h1>
      <p className="text-slate-600 mb-4">{c.sector as string} · {c.industry as string}</p>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 p-4 bg-white rounded-lg border border-slate-200">
        <div>
          <div className="text-xs text-slate-500 uppercase">Price</div>
          <div className="font-semibold">${Number(c.price).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase">Market Cap</div>
          <div className="font-semibold">{fmtNum(c.marketCap)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase">ROIC</div>
          <div className="font-semibold">{fmtPct(c.roic)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase">Rev Growth 5Y</div>
          <div className="font-semibold">{fmtPct(c.revenueGrowth5Y)}</div>
        </div>
      </section>

      {(summary || cache?.aiJson?.standout) && (
        <section className="mb-8">
          {summary && <p className="text-slate-700 mb-2">{summary}</p>}
          {cache?.aiJson?.standout && <p className="text-slate-600 text-sm">{cache.aiJson.standout}</p>}
          {cache?.aiJson?.valuation_context && <p className="text-slate-600 text-sm mt-1">{cache.aiJson.valuation_context}</p>}
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Key metrics</h2>
        <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
          <tbody>
            <tr className="bg-slate-50"><td className="px-4 py-2">P/E</td><td className="px-4 py-2">{c.peRatio != null ? Number(c.peRatio).toFixed(1) : '—'}</td></tr>
            <tr><td className="px-4 py-2">Revenue</td><td className="px-4 py-2">{fmtNum(c.revenue)}</td></tr>
            <tr className="bg-slate-50"><td className="px-4 py-2">Free Cash Flow</td><td className="px-4 py-2">{fmtNum(c.freeCashFlow)}</td></tr>
            <tr><td className="px-4 py-2">Implied growth (DCF)</td><td className="px-4 py-2">{fmtPct(c.dcfImpliedGrowth)}</td></tr>
          </tbody>
        </table>
      </section>

      <div className="flex flex-wrap gap-3">
        <a
          href={scannerUrl}
          className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Open in Scanner
        </a>
        <Link href="/" className="text-slate-600 underline hover:text-slate-900">All stocks</Link>
      </div>
    </article>
  );
}
