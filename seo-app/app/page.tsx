import Link from 'next/link';

export const revalidate = 3600;

export default function HomePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">FindGreatStocks.com</h1>
      <p className="text-slate-600 mb-6">
        Investment research platform and stock discovery engine. Use the scanner to screen by ROIC, growth, valuation, and quality.
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href={process.env.NEXT_PUBLIC_CLIENT_URL || 'https://findgreatstocks.com'}
          className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Open Scanner
        </a>
        <Link href="/stocks/aapl" className="text-slate-600 underline hover:text-slate-900">Apple</Link>
        <Link href="/stocks/msft" className="text-slate-600 underline hover:text-slate-900">Microsoft</Link>
        <Link href="/strategy/high-roic-stocks" className="text-slate-600 underline hover:text-slate-900">High ROIC</Link>
        <Link href="/sector/software" className="text-slate-600 underline hover:text-slate-900">Software</Link>
        <Link href="/compare/apple-vs-microsoft" className="text-slate-600 underline hover:text-slate-900">Apple vs Microsoft</Link>
      </div>
    </div>
  );
}
