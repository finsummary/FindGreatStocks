import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'FindGreatStocks.com | Stock Research & Scanner', template: '%s | FindGreatStocks.com' },
  description: 'Investment research platform and stock discovery engine. Screen by ROIC, growth, valuation, and quality.',
  openGraph: { siteName: 'FindGreatStocks.com' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="container mx-auto flex h-14 items-center px-4">
            <a href="/" className="font-semibold text-slate-900">
              FindGreatStocks.com
            </a>
            <nav className="ml-6 flex gap-4">
              <a href="/" className="text-sm text-slate-600 hover:text-slate-900">Scanner</a>
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
          <a href="/" className="underline hover:text-slate-700">Open Scanner</a>
          {' · '}
          <a href="/about" className="underline hover:text-slate-700">About</a>
        </footer>
      </body>
    </html>
  );
}
