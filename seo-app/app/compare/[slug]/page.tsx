import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchSeoCompare } from '@/lib/api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://findgreatstocks.com';

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 86400;

function fmtNum(v: unknown): string {
  if (v == null) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  return n.toLocaleString();
}
function fmtPct(v: unknown): string {
  if (v == null) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `${(n * 100).toFixed(1)}%`;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await fetchSeoCompare(slug);
  if (!data?.companyA || !data?.companyB) return { title: 'Compare | FindGreatStocks.com' };
  const a = data.companyA as Record<string, unknown>;
  const b = data.companyB as Record<string, unknown>;
  const title = `${a.name} vs ${b.name} | FindGreatStocks.com`;
  const desc = `Compare ${a.name} and ${b.name} – valuation, ROIC, growth. Use the scanner for more.`;
  return { title, description: desc };
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params;
  const data = await fetchSeoCompare(slug);
  if (!data?.companyA || !data?.companyB) notFound();
  const a = data.companyA as Record<string, unknown>;
  const b = data.companyB as Record<string, unknown>;
  const cache = data.cache as { aiSummary?: string; aiJson?: { strength_a?: string; strength_b?: string } } | undefined;

  return (
    <article className="max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">
        {a.name as string} vs {b.name as string}
      </h1>
      {cache?.aiSummary && <p className="text-slate-700 mb-6">{cache.aiSummary}</p>}

      <section className="grid grid-cols-2 gap-6 mb-8">
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <h2 className="font-semibold text-lg text-slate-900 mb-2">{a.name as string} ({a.symbol as string})</h2>
          <dl className="space-y-1 text-sm">
            <dt className="text-slate-500">Market Cap</dt><dd>{fmtNum(a.marketCap)}</dd>
            <dt className="text-slate-500">ROIC</dt><dd>{fmtPct(a.roic)}</dd>
            <dt className="text-slate-500">Rev Growth 5Y</dt><dd>{fmtPct(a.revenueGrowth5Y)}</dd>
            <dt className="text-slate-500">P/E</dt><dd>{a.peRatio != null ? Number(a.peRatio).toFixed(1) : '—'}</dd>
          </dl>
          {cache?.aiJson?.strength_a && <p className="mt-2 text-slate-600 text-sm">{cache.aiJson.strength_a}</p>}
          <Link href={`/stocks/${(a.symbol as string).toLowerCase()}`} className="text-emerald-600 text-sm hover:underline mt-2 inline-block">View company →</Link>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <h2 className="font-semibold text-lg text-slate-900 mb-2">{b.name as string} ({b.symbol as string})</h2>
          <dl className="space-y-1 text-sm">
            <dt className="text-slate-500">Market Cap</dt><dd>{fmtNum(b.marketCap)}</dd>
            <dt className="text-slate-500">ROIC</dt><dd>{fmtPct(b.roic)}</dd>
            <dt className="text-slate-500">Rev Growth 5Y</dt><dd>{fmtPct(b.revenueGrowth5Y)}</dd>
            <dt className="text-slate-500">P/E</dt><dd>{b.peRatio != null ? Number(b.peRatio).toFixed(1) : '—'}</dd>
          </dl>
          {cache?.aiJson?.strength_b && <p className="mt-2 text-slate-600 text-sm">{cache.aiJson.strength_b}</p>}
          <Link href={`/stocks/${(b.symbol as string).toLowerCase()}`} className="text-emerald-600 text-sm hover:underline mt-2 inline-block">View company →</Link>
        </div>
      </section>

      <a
        href={data.scannerUrl as string}
        className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Compare more in Scanner
      </a>
    </article>
  );
}
