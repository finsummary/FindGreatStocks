import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchSeoValuation } from '@/lib/api';

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 86400;

const VALID_SLUGS = ['stocks-priced-for-low-growth', 'stocks-undervalued-by-reverse-dcf'];

function fmtNum(v: unknown): string {
  if (v == null) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  return n.toLocaleString();
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  if (!VALID_SLUGS.includes(slug)) return { title: 'Valuation | FindGreatStocks.com' };
  const data = await fetchSeoValuation(slug);
  const title = (data?.title as string) || slug.replace(/-/g, ' ');
  const desc = `Stocks ranked by valuation and implied growth. Screen in FindGreatStocks scanner.`;
  return { title: `${title} | FindGreatStocks.com`, description: desc };
}

export default async function ValuationPage({ params }: Props) {
  const { slug } = await params;
  if (!VALID_SLUGS.includes(slug)) notFound();
  const data = await fetchSeoValuation(slug);
  if (!data?.title) notFound();
  const { title, companies, cache, scannerUrl } = data;
  const summary = (cache as { aiSummary?: string })?.aiSummary;

  return (
    <article className="max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
      {summary && <p className="text-slate-700 mb-6">{summary}</p>}

      <section className="mb-6 overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 rounded-lg">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-4 py-2 text-left">Company</th>
              <th className="px-4 py-2 text-right">Symbol</th>
              <th className="px-4 py-2 text-right">Market Cap</th>
              <th className="px-4 py-2 text-right">Implied Growth</th>
              <th className="px-4 py-2 text-right">Margin of Safety</th>
            </tr>
          </thead>
          <tbody>
            {(companies as Record<string, unknown>[]).slice(0, 25).map((c, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <Link href={`/stocks/${(c.symbol as string).toLowerCase()}`} className="text-emerald-600 hover:underline">
                    {c.name as string}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right font-mono">{c.symbol as string}</td>
                <td className="px-4 py-2 text-right">{fmtNum(c.marketCap)}</td>
                <td className="px-4 py-2 text-right">{c.dcfImpliedGrowth != null ? `${(Number(c.dcfImpliedGrowth) * 100).toFixed(1)}%` : '—'}</td>
                <td className="px-4 py-2 text-right">{c.marginOfSafety != null ? `${(Number(c.marginOfSafety) * 100).toFixed(1)}%` : '—'}</td>
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
