import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchSeoStrategy } from '@/lib/api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://findgreatstocks.com';

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 86400;

function fmtNum(v: unknown): string {
  if (v == null) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await fetchSeoStrategy(slug);
  if (!data?.strategy) return { title: 'Strategy | FindGreatStocks.com' };
  const title = `${data.strategy.name} | FindGreatStocks.com`;
  const desc = data.strategy.description + ' Screen and compare in the scanner.';
  return { title, description: desc };
}

export default async function StrategyPage({ params }: Props) {
  const { slug } = await params;
  const data = await fetchSeoStrategy(slug);
  if (!data?.strategy) notFound();
  const { strategy, companies, cache, scannerUrl } = data;
  const summary = (cache as { aiSummary?: string })?.aiSummary ?? (cache as { aiJson?: { summary?: string } })?.aiJson?.summary;

  return (
    <article className="max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{strategy.name}</h1>
      <p className="text-slate-600 mb-4">{strategy.description}</p>
      {summary && <p className="text-slate-700 mb-6">{summary}</p>}

      <section className="mb-6 overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 rounded-lg">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-4 py-2 text-left">Company</th>
              <th className="px-4 py-2 text-right">Symbol</th>
              <th className="px-4 py-2 text-right">Market Cap</th>
              <th className="px-4 py-2 text-right">ROIC</th>
            </tr>
          </thead>
          <tbody>
            {(companies as Record<string, unknown>[]).slice(0, 25).map((c, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2">{c.name as string}</td>
                <td className="px-4 py-2 text-right font-mono">{c.symbol as string}</td>
                <td className="px-4 py-2 text-right">{fmtNum(c.marketCap)}</td>
                <td className="px-4 py-2 text-right">{c.roic != null ? `${(Number(c.roic) * 100).toFixed(1)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <a
        href={scannerUrl as string}
        className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Open this screen in Scanner
      </a>
    </article>
  );
}
