import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchSeoSector } from '@/lib/api';

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
  const data = await fetchSeoSector(slug);
  if (!data?.sectorName) return { title: 'Sector | FindGreatStocks.com' };
  const title = `${data.sectorName} Stocks | FindGreatStocks.com`;
  const desc = `Top ${data.sectorName} companies by market cap. Screen and compare in the scanner.`;
  return { title, description: desc };
}

export default async function SectorPage({ params }: Props) {
  const { slug } = await params;
  const data = await fetchSeoSector(slug);
  if (!data?.companies?.length) notFound();
  const { sectorName, companies, scannerUrl } = data;
  const cache = data.cache as { aiSummary?: string } | undefined;

  return (
    <article className="max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{sectorName} Stocks</h1>
      {cache?.aiSummary && <p className="text-slate-700 mb-6">{cache.aiSummary}</p>}

      <section className="mb-6 overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 rounded-lg">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-4 py-2 text-left">Company</th>
              <th className="px-4 py-2 text-right">Symbol</th>
              <th className="px-4 py-2 text-right">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {(companies as Record<string, unknown>[]).slice(0, 30).map((c, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <Link href={`/stocks/${(c.symbol as string).toLowerCase()}`} className="text-emerald-600 hover:underline">
                    {c.name as string}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right font-mono">{c.symbol as string}</td>
                <td className="px-4 py-2 text-right">{fmtNum(c.marketCap)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <a
        href={scannerUrl as string}
        className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Open sector in Scanner
      </a>
    </article>
  );
}
