import React from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

const screenshots = {
  compounders: "/landing-screenshots/compounders-roic.png",
  fcf: "/landing-screenshots/cashflow-leverage.png",
  balanceSheet: "/landing-screenshots/cashflow-leverage.png", // Same as FCF (shows Debt-to-Equity, Interest Coverage, Cash Flow to Debt)
  dupont: "/landing-screenshots/dupont-roe.png",
  risk: "/landing-screenshots/return-on-risk.png",
  growth: "/landing-screenshots/reverse-dcf.png", // Shows Revenue History (10Y)
  dcf: "/landing-screenshots/dcf-valuation.png",
  reverseDcf: "/landing-screenshots/reverse-dcf.png",
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleExploreScanner = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Mark that user has seen the landing page and clicked "Explore the Scanner"
    try {
      localStorage.setItem('fgs:landing:seen', '1');
    } catch {}
    // Force navigation
    navigate('/', { replace: true });
    // Also try window.location as fallback for mobile
    setTimeout(() => {
      if (window.location.pathname === '/start-here' || window.location.pathname === '/') {
        window.location.href = '/';
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Page wrapper */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16 lg:py-20">
        {/* HERO SECTION */}
        <header className="mb-16 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
            Find High-Quality Undervalued Stocks in 60 Seconds.
          </h1>
          <p className="text-lg sm:text-xl text-slate-700 mb-8">
            Screen global stocks using long-term fundamentals and valuation models — not predictions.
          </p>
          <ul className="max-w-xl mx-auto text-slate-600 text-sm space-y-2 mb-10">
            <li>• Identify high-quality businesses using ROIC consistency</li>
            <li>• Verify strength through free cash flow and balance-sheet quality</li>
            <li>• Compare price vs intrinsic value using DCF and Reverse DCF</li>
          </ul>
          <Button 
            asChild
            className="inline-flex items-center justify-center rounded-lg border border-emerald-600 bg-emerald-50 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-medium text-emerald-700 hover:bg-emerald-100 transition-colors min-h-[48px] touch-target"
          >
            <Link 
              to="/" 
              onClick={handleExploreScanner}
              onTouchEnd={handleExploreScanner}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', cursor: 'pointer' }}
            >
              Explore the Scanner
            </Link>
          </Button>
        </header>

        {/* SECTION 1 — FIND GREAT COMPANIES */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6">
            How to Find Great Stocks?
          </h2>

          {/* 1. Compounders */}
          <article className="mb-10 border border-slate-200 rounded-xl p-5 sm:p-6 bg-slate-50">
            <h3 className="text-xl font-semibold mb-3">
              1. Identify Great Compounders (ROIC + Consistency)
            </h3>
            <p className="text-slate-700 mb-3">
              All great companies share one key trait:{" "}
              <span className="font-semibold">they are exceptional compounders</span>.
            </p>
            <p className="text-slate-600 mb-3">
              To find them, choose the <span className="italic">Compounders Layout</span>{" "}
              and sort by:
            </p>
            <ul className="text-slate-600 text-sm space-y-1 mb-3">
              <li>• ROIC (Return on Invested Capital)</li>
              <li>• 10-Year Average ROIC</li>
              <li>• ROIC Stability Score (0–100)</li>
            </ul>
            <p className="text-slate-600 mb-4">
              A higher Stability Score means the company has delivered{" "}
              <span className="font-semibold">consistently high ROIC for a decade</span>,
              indicating a durable business model.
            </p>
            <Screenshot imagePath={screenshots.compounders} alt="Compounders (ROIC) Layout" />
          </article>

          {/* 2. FCF Margins */}
          <article className="mb-10 border border-slate-200 rounded-xl p-5 sm:p-6 bg-slate-50">
            <h3 className="text-xl font-semibold mb-3">
              2. Check Free Cash Flow Quality (FCF Margins)
            </h3>
            <p className="text-slate-700 mb-3">
              Shareholder value is created through{" "}
              <span className="font-semibold">future free cash flows</span>.
            </p>
            <p className="text-slate-600 mb-3">
              Great companies generate <span className="font-semibold">high, stable FCF margins</span> year after year.
            </p>
            <p className="text-slate-600 mb-2">Metrics to examine:</p>
            <ul className="text-slate-600 text-sm space-y-1 mb-4">
              <li>• FCF Margin</li>
              <li>• 10-Year Median FCF Margin</li>
            </ul>
            <p className="text-slate-600 mb-4">
              These reveal whether the business produces reliable long-term cash.
            </p>
            <Screenshot imagePath={screenshots.fcf} alt="Cashflow & Leverage Layout" />
          </article>

          {/* 3. Balance Sheet */}
          <article className="mb-10 border border-slate-200 rounded-xl p-5 sm:p-6 bg-slate-50">
            <h3 className="text-xl font-semibold mb-3">
              3. Assess Balance-Sheet Strength
            </h3>
            <p className="text-slate-700 mb-3">
              High-quality companies don&apos;t rely on fragile leverage. They generate
              enough cash to fund operations and growth.
            </p>
            <p className="text-slate-600 mb-2">Key ratios:</p>
            <ul className="text-slate-600 text-sm space-y-1 mb-4">
              <li>• Debt-to-Equity</li>
              <li>• Interest Coverage</li>
              <li>• Cash-to-Debt</li>
            </ul>
            <p className="text-slate-600 mb-4">
              Stronger balance sheets reduce risk and improve resilience.
            </p>
            <Screenshot imagePath={screenshots.balanceSheet} alt="Balance Sheet Metrics" />
          </article>

          {/* 4. DuPont ROE */}
          <article className="mb-10 border border-slate-200 rounded-xl p-5 sm:p-6 bg-slate-50">
            <h3 className="text-xl font-semibold mb-3">
              4. Understand What Drives Returns (DuPont ROE)
            </h3>
            <p className="text-slate-700 mb-3">
              Strong ROE is good—but you must understand{" "}
              <span className="font-semibold">what drives it</span>.
            </p>
            <p className="text-slate-600 mb-2">
              The DuPont model breaks ROE into components such as:
            </p>
            <ul className="text-slate-600 text-sm space-y-1 mb-3">
              <li>• Profitability</li>
              <li>• Efficiency</li>
              <li>• Leverage</li>
            </ul>
            <p className="text-slate-600 mb-3">
              The formula is:
            </p>
            <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 overflow-x-auto">
              <p className="text-slate-800 font-mono text-xs sm:text-sm md:text-base text-center whitespace-nowrap">
                ROE = Net Profit Margin × Asset Turnover × Financial Leverage
              </p>
            </div>
            <p className="text-slate-600 mb-4">
              This helps distinguish genuine business quality from artificially inflated returns.
            </p>
            <Screenshot imagePath={screenshots.dupont} alt="DuPont ROE Decomposition Layout" />
          </article>

          {/* 5. Risk-Adjusted Returns */}
          <article className="mb-10 border border-slate-200 rounded-xl p-5 sm:p-6 bg-slate-50">
            <h3 className="text-xl font-semibold mb-3">
              5. Evaluate Risk-Adjusted Historical Returns
            </h3>
            <p className="text-slate-700 mb-3">
              Great companies don&apos;t just grow—they grow{" "}
              <span className="font-semibold">without destroying shareholder capital</span>.
            </p>
            <p className="text-slate-600 mb-2">Review:</p>
            <ul className="text-slate-600 text-sm space-y-1 mb-4">
              <li>• Return-to-Risk (Annual Return / Max Drawdown)</li>
              <li>• 3Y, 5Y, 10Y historical stability</li>
            </ul>
            <p className="text-slate-600 mb-4">
              This reveals how well the company compounds relative to risk.
            </p>
            <Screenshot imagePath={screenshots.risk} alt="Return on Risk Layout" />
          </article>

          {/* 6. Growth */}
          <article className="mb-4 border border-slate-200 rounded-xl p-5 sm:p-6 bg-slate-50">
            <h3 className="text-xl font-semibold mb-3">
              6. Confirm Long-Term Business Growth
            </h3>
            <p className="text-slate-700 mb-3">
              The strongest companies grow steadily over long periods.
            </p>
            <p className="text-slate-600 mb-2">
              Check 10-year trends in:
            </p>
            <ul className="text-slate-600 text-sm space-y-1 mb-4">
              <li>• Revenue</li>
              <li>• Earnings</li>
              <li>• Free Cash Flow</li>
            </ul>
            <p className="text-slate-600 mb-4">
              Long-term growth validates the durability of the business model.
            </p>
            <Screenshot imagePath={screenshots.growth} alt="Long-term Growth Metrics" />
          </article>
        </section>

        {/* SECTION 2 — BUY AT A GOOD PRICE */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6">
            How to Buy them at Good Price?
          </h2>
          <p className="text-slate-600 mb-8">
            Once you have found a great company, the next step is to determine whether it
            is trading at an attractive valuation today.
          </p>

          {/* DCF Section */}
          <article className="mb-10 border border-slate-200 rounded-xl p-5 sm:p-6 bg-slate-50">
            <h3 className="text-xl font-semibold mb-3">
              1. DCF Valuation — Estimate Intrinsic Value
            </h3>
            <p className="text-slate-700 mb-3">
              DCF values a company based on{" "}
              <span className="font-semibold">future free cash flows</span>. We use a
              standardized, conservative DCF model.
            </p>

            <p className="text-slate-600 mb-3 font-semibold">
              Default DCF Assumptions:
            </p>

            <div className="overflow-x-auto mb-4">
              <table className="min-w-[320px] text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left border-b border-slate-200">
                      Parameter
                    </th>
                    <th className="px-4 py-2 text-left border-b border-slate-200">
                      Default
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr>
                    <td className="px-4 py-2 border-b border-slate-200">Start FCF</td>
                    <td className="px-4 py-2 border-b border-slate-200">
                      Latest Annual Value
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-slate-200">
                      Forecast Horizon
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200">10 years</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-slate-200">
                      Discount Rate (r)
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200">
                      10% (required minimum rate of return)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-slate-200">
                      FCF Growth Rate
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200">
                      10-Year Revenue Growth Rate
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-slate-200">
                      Terminal Growth (g)
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200">2.5%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-slate-600 mb-3">
              We believe these assumptions create a{" "}
              <span className="font-semibold">
                balanced, realistic long-term framework
              </span>{" "}
              for valuing most established companies in the current economic environment.
            </p>

            <p className="text-slate-600 mb-3">
              One might argue that different companies require different valuation assumptions.
            </p>
            <p className="text-slate-600 mb-3">
              We take a different view.
            </p>
            <p className="text-slate-600 mb-3">
              If a company is truly cheap, it should stand out even under simple, consistent, and conservative assumptions. The goal is not to calculate an exact intrinsic value, but to identify businesses that are clearly undervalued and offer a margin of safety.
            </p>
            <p className="text-slate-600 mb-4">
              As Warren Buffett puts it:
            </p>
            <blockquote className="border-l-4 border-emerald-600 pl-4 text-slate-800 italic mb-4">
              &quot;I don&apos;t need to know a company&apos;s exact value to know it&apos;s cheap.&quot;
              <br />
              <span className="not-italic text-slate-600 text-sm">
                — Warren Buffett
              </span>
            </blockquote>
            <p className="text-slate-600 mb-4">
              The DCF layout shows:
            </p>
            <ul className="text-slate-600 text-sm space-y-1 mb-4">
              <li>• Intrinsic value</li>
              <li>• Margin of safety</li>
              <li>• Whether the stock is undervalued or overvalued</li>
            </ul>

            <Screenshot imagePath={screenshots.dcf} alt="DCF Valuation Layout" />
          </article>

          {/* Reverse DCF */}
          <article className="border border-slate-200 rounded-xl p-5 sm:p-6 bg-slate-50">
            <h3 className="text-xl font-semibold mb-3">
              2. Reverse DCF — Understand What the Market Is Pricing In
            </h3>
            <p className="text-slate-700 mb-3">
              DCF models are often{" "}
              <span className="font-semibold">very sensitive to assumptions</span>,
              especially discount rates and growth rates. To counter this, Reverse DCF{" "}
              <span className="font-semibold">inverts the problem</span>.
            </p>
            <p className="text-slate-600 mb-3">
              Instead of guessing future growth, Reverse DCF calculates:
            </p>
            <ul className="text-slate-600 text-sm space-y-1 mb-4">
              <li>• What growth rate the current stock price implies</li>
              <li>• Whether that implied growth is reasonable</li>
            </ul>
            <p className="text-slate-600 mb-4">
              This reflects Charlie Munger&apos;s principle:
            </p>
            <blockquote className="border-l-4 border-emerald-600 pl-4 text-slate-800 italic mb-4">
              &quot;Invert, always invert.&quot;
              <br />
              <span className="not-italic text-slate-600 text-sm">
                — Charlie Munger
              </span>
            </blockquote>
            <p className="text-slate-600 mb-3">
              Reverse DCF applies this approach to valuation, helping you see what
              expectations are already priced in.
            </p>
            <p className="text-slate-600 mb-4">
              Then the investor can compare it, for example, to historical rates of growth of the business (e.g., 10Y Revenue Growth rate).
            </p>

            <Screenshot imagePath={screenshots.reverseDcf} alt="Reverse DCF Layout" />
          </article>
        </section>

        {/* CTA SECTION */}
        <section className="text-center border border-slate-200 rounded-2xl p-6 sm:p-8 bg-slate-100">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
            Ready to Find Great Stocks?
          </h2>
          <p className="max-w-2xl mx-auto text-slate-700 mb-4">
            Start using the same frameworks professional investors rely on:
          </p>
          <p className="max-w-2xl mx-auto text-slate-600 mb-6">
            <span className="font-semibold">
              Compounders • FCF Quality • Balance Sheet Strength • DuPont ROE •
              Return-to-Risk • Growth • DCF • Reverse DCF
            </span>
          </p>
          <Button 
            asChild
            className="inline-flex items-center justify-center rounded-lg border border-emerald-600 bg-emerald-50 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-medium text-emerald-700 hover:bg-emerald-100 transition-colors min-h-[48px] touch-target"
          >
            <Link 
              to="/" 
              onClick={handleExploreScanner}
              onTouchEnd={handleExploreScanner}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', cursor: 'pointer' }}
            >
              Explore the Scanner
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
};

interface ScreenshotProps {
  imagePath: string;
  alt: string;
}

const Screenshot: React.FC<ScreenshotProps> = ({ imagePath, alt }) => {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white overflow-hidden">
      <img
        src={imagePath}
        alt={alt}
        className="w-full h-auto max-w-full"
        style={{ maxWidth: '100%', height: 'auto' }}
        loading="lazy"
        className="w-full h-auto max-w-full object-contain"
        loading="lazy"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
};

export default LandingPage;
