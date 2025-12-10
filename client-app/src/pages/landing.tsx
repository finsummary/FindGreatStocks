import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const sections = {
  gifs: {
    compounders: "[COMPANION_GIF_COMPOUNDERS]",
    fcf: "[COMPANION_GIF_FCF]",
    balanceSheet: "[COMPANION_GIF_BALANCE_SHEET]",
    dupont: "[COMPANION_GIF_DUPONT]",
    risk: "[COMPANION_GIF_RISK]",
    growth: "[COMPANION_GIF_GROWTH]",
    dcf: "[COMPANION_GIF_DCF]",
    reverseDcf: "[COMPANION_GIF_REVERSE_DCF]",
  },
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleExploreScanner = () => {
    // Mark that user has seen the landing page
    try {
      localStorage.setItem('fgs:landing:seen', '1');
    } catch {}
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Page wrapper */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16 lg:py-20">
        {/* HERO SECTION */}
        <header className="mb-16 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
            Investing Isn&apos;t Complicated.
          </h1>
          <p className="text-lg sm:text-xl text-slate-200 mb-6">
            You just need to <span className="font-semibold">Find Great Stocks</span>{" "}
            and <span className="font-semibold">buy them at a Good Price</span>.
          </p>
          <p className="max-w-2xl mx-auto text-slate-300 mb-8">
            At <span className="font-semibold">FindGreatStocks.com</span>, we built tools
            that help you do exactly that:
          </p>
          <ul className="max-w-xl mx-auto text-slate-300 space-y-2 mb-10">
            <li>• Identify great businesses</li>
            <li>• Verify their quality using proven fundamentals</li>
            <li>• Check whether the stock is undervalued today</li>
          </ul>
          <Button 
            onClick={handleExploreScanner}
            className="inline-flex items-center justify-center rounded-lg border border-emerald-400 bg-emerald-400/10 px-6 py-3 text-sm sm:text-base font-medium text-emerald-300 hover:bg-emerald-400/20 transition-colors"
          >
            Explore the Scanner
          </Button>
        </header>

        {/* SECTION 1 — FIND GREAT COMPANIES */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6">
            Find Great Companies
          </h2>

          {/* 1. Compounders */}
          <article className="mb-10 border border-slate-800 rounded-xl p-5 sm:p-6 bg-slate-900/40">
            <h3 className="text-xl font-semibold mb-3">
              1. Identify Great Compounders (ROIC + Consistency)
            </h3>
            <p className="text-slate-200 mb-3">
              All great companies share one key trait:{" "}
              <span className="font-semibold">they are exceptional compounders</span>.
            </p>
            <p className="text-slate-300 mb-3">
              To find them, choose the <span className="italic">Compounders Layout</span>{" "}
              and sort by:
            </p>
            <ul className="text-slate-300 space-y-1 mb-3">
              <li>• ROIC (Return on Invested Capital)</li>
              <li>• 10-Year Average ROIC</li>
              <li>• ROIC Stability Score (0–100)</li>
            </ul>
            <p className="text-slate-300 mb-4">
              A higher Stability Score means the company has delivered{" "}
              <span className="font-semibold">consistently high ROIC for a decade</span>,
              indicating a durable business model.
            </p>
            <GifPlaceholder label="Compounders Layout demo" token={sections.gifs.compounders} />
          </article>

          {/* 2. FCF Margins */}
          <article className="mb-10 border border-slate-800 rounded-xl p-5 sm:p-6 bg-slate-900/40">
            <h3 className="text-xl font-semibold mb-3">
              2. Check Free Cash Flow Quality (FCF Margins)
            </h3>
            <p className="text-slate-200 mb-3">
              Shareholder value is created through{" "}
              <span className="font-semibold">future free cash flows</span>.
            </p>
            <p className="text-slate-300 mb-3">
              Great companies generate <span className="font-semibold">high, stable FCF margins</span> year after year.
            </p>
            <p className="text-slate-300 mb-2">Metrics to examine:</p>
            <ul className="text-slate-300 space-y-1 mb-4">
              <li>• FCF Margin</li>
              <li>• 10-Year Median FCF Margin</li>
            </ul>
            <p className="text-slate-300 mb-4">
              These reveal whether the business produces reliable long-term cash.
            </p>
            <GifPlaceholder label="FCF layout demo" token={sections.gifs.fcf} />
          </article>

          {/* 3. Balance Sheet */}
          <article className="mb-10 border border-slate-800 rounded-xl p-5 sm:p-6 bg-slate-900/40">
            <h3 className="text-xl font-semibold mb-3">
              3. Assess Balance-Sheet Strength
            </h3>
            <p className="text-slate-200 mb-3">
              High-quality companies don&apos;t rely on fragile leverage. They generate
              enough cash to fund operations and growth.
            </p>
            <p className="text-slate-300 mb-2">Key ratios:</p>
            <ul className="text-slate-300 space-y-1 mb-4">
              <li>• Debt-to-Equity</li>
              <li>• Interest Coverage</li>
              <li>• Cash-to-Debt</li>
            </ul>
            <p className="text-slate-300 mb-4">
              Stronger balance sheets reduce risk and improve resilience.
            </p>
            <GifPlaceholder label="Balance sheet metrics demo" token={sections.gifs.balanceSheet} />
          </article>

          {/* 4. DuPont ROE */}
          <article className="mb-10 border border-slate-800 rounded-xl p-5 sm:p-6 bg-slate-900/40">
            <h3 className="text-xl font-semibold mb-3">
              4. Understand What Drives Returns (DuPont ROE)
            </h3>
            <p className="text-slate-200 mb-3">
              Strong ROE is good—but you must understand{" "}
              <span className="font-semibold">what drives it</span>.
            </p>
            <p className="text-slate-300 mb-2">
              The DuPont model breaks ROE into components such as:
            </p>
            <ul className="text-slate-300 space-y-1 mb-4">
              <li>• Profitability</li>
              <li>• Efficiency</li>
              <li>• Leverage</li>
            </ul>
            <p className="text-slate-300 mb-4">
              This helps distinguish genuine business quality from artificially inflated returns.
            </p>
            <GifPlaceholder label="DuPont layout demo" token={sections.gifs.dupont} />
          </article>

          {/* 5. Risk-Adjusted Returns */}
          <article className="mb-10 border border-slate-800 rounded-xl p-5 sm:p-6 bg-slate-900/40">
            <h3 className="text-xl font-semibold mb-3">
              5. Evaluate Risk-Adjusted Historical Returns
            </h3>
            <p className="text-slate-200 mb-3">
              Great companies don&apos;t just grow—they grow{" "}
              <span className="font-semibold">without destroying shareholder capital</span>.
            </p>
            <p className="text-slate-300 mb-2">Review:</p>
            <ul className="text-slate-300 space-y-1 mb-4">
              <li>• Return-to-Risk (Annual Return / Max Drawdown)</li>
              <li>• 3Y, 5Y, 10Y historical stability</li>
            </ul>
            <p className="text-slate-300 mb-4">
              This reveals how well the company compounds relative to risk.
            </p>
            <GifPlaceholder label="AR/MDD layout demo" token={sections.gifs.risk} />
          </article>

          {/* 6. Growth */}
          <article className="mb-4 border border-slate-800 rounded-xl p-5 sm:p-6 bg-slate-900/40">
            <h3 className="text-xl font-semibold mb-3">
              6. Confirm Long-Term Business Growth
            </h3>
            <p className="text-slate-200 mb-3">
              The strongest companies grow steadily over long periods.
            </p>
            <p className="text-slate-300 mb-2">
              Check 10-year trends in:
            </p>
            <ul className="text-slate-300 space-y-1 mb-4">
              <li>• Revenue</li>
              <li>• Earnings</li>
              <li>• Free Cash Flow</li>
            </ul>
            <p className="text-slate-300 mb-4">
              Long-term growth validates the durability of the business model.
            </p>
            <GifPlaceholder label="Long-term growth demo" token={sections.gifs.growth} />
          </article>
        </section>

        {/* SECTION 2 — BUY AT A GOOD PRICE */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6">
            Buy at a Good Price
          </h2>
          <p className="text-slate-300 mb-8">
            Once you have found a great company, the next step is to determine whether it
            is trading at an attractive valuation today.
          </p>

          {/* DCF Section */}
          <article className="mb-10 border border-slate-800 rounded-xl p-5 sm:p-6 bg-slate-900/40">
            <h3 className="text-xl font-semibold mb-3">
              1. DCF Valuation — Estimate Intrinsic Value
            </h3>
            <p className="text-slate-200 mb-3">
              DCF values a company based on{" "}
              <span className="font-semibold">future free cash flows</span>. We use a
              standardized, conservative DCF model.
            </p>

            <p className="text-slate-300 mb-3 font-semibold">
              Default DCF Assumptions:
            </p>

            <div className="overflow-x-auto mb-4">
              <table className="min-w-[320px] text-sm border border-slate-800 rounded-lg overflow-hidden">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-4 py-2 text-left border-b border-slate-800">
                      Parameter
                    </th>
                    <th className="px-4 py-2 text-left border-b border-slate-800">
                      Default
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-950/40">
                  <tr>
                    <td className="px-4 py-2 border-b border-slate-800">Start FCF</td>
                    <td className="px-4 py-2 border-b border-slate-800">
                      Last Twelve Months (TTM)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-slate-800">
                      Forecast Horizon
                    </td>
                    <td className="px-4 py-2 border-b border-slate-800">10 years</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-slate-800">
                      Discount Rate (r)
                    </td>
                    <td className="px-4 py-2 border-b border-slate-800">
                      10% (required minimum rate of return)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-slate-800">
                      Terminal Growth (g)
                    </td>
                    <td className="px-4 py-2 border-b border-slate-800">2.5%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-slate-300 mb-3">
              We believe these assumptions create a{" "}
              <span className="font-semibold">
                balanced, realistic long-term framework
              </span>{" "}
              for valuing most established companies in the current economic environment.
            </p>
            <p className="text-slate-300 mb-4">
              The DCF layout shows:
            </p>
            <ul className="text-slate-300 space-y-1 mb-4">
              <li>• Intrinsic value</li>
              <li>• Margin of safety</li>
              <li>• Whether the stock is undervalued or overvalued</li>
            </ul>

            <GifPlaceholder label="DCF layout demo" token={sections.gifs.dcf} />
          </article>

          {/* Reverse DCF */}
          <article className="border border-slate-800 rounded-xl p-5 sm:p-6 bg-slate-900/40">
            <h3 className="text-xl font-semibold mb-3">
              2. Reverse DCF — Understand What the Market Is Pricing In
            </h3>
            <p className="text-slate-200 mb-3">
              DCF models are often{" "}
              <span className="font-semibold">very sensitive to assumptions</span>,
              especially discount rates and growth rates. To counter this, Reverse DCF{" "}
              <span className="font-semibold">inverts the problem</span>.
            </p>
            <p className="text-slate-300 mb-3">
              Instead of guessing future growth, Reverse DCF calculates:
            </p>
            <ul className="text-slate-300 space-y-1 mb-4">
              <li>• What growth rate the current stock price implies</li>
              <li>• Whether that implied growth is reasonable</li>
            </ul>
            <p className="text-slate-300 mb-4">
              This reflects Charlie Munger&apos;s principle:
            </p>
            <blockquote className="border-l-4 border-emerald-400 pl-4 text-slate-100 italic mb-4">
              &quot;All I want to know is where I&apos;m going to die, so I&apos;ll never go
              there.&quot; <br />
              <span className="not-italic text-slate-300 text-sm">
                Invert, always invert.
              </span>
            </blockquote>
            <p className="text-slate-300 mb-4">
              Reverse DCF applies this approach to valuation, helping you see what
              expectations are already priced in.
            </p>

            <GifPlaceholder label="Reverse DCF layout demo" token={sections.gifs.reverseDcf} />
          </article>
        </section>

        {/* CTA SECTION */}
        <section className="text-center border border-slate-800 rounded-2xl p-6 sm:p-8 bg-slate-900/60">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
            Ready to Find Great Stocks?
          </h2>
          <p className="max-w-2xl mx-auto text-slate-200 mb-4">
            Start using the same frameworks professional investors rely on:
          </p>
          <p className="max-w-2xl mx-auto text-slate-300 mb-6">
            <span className="font-semibold">
              Compounders • FCF Quality • Balance Sheet Strength • DuPont ROE •
              Return-to-Risk • Growth • DCF • Reverse DCF
            </span>
          </p>
          <Button 
            onClick={handleExploreScanner}
            className="inline-flex items-center justify-center rounded-lg border border-emerald-400 bg-emerald-400/10 px-6 py-3 text-sm sm:text-base font-medium text-emerald-300 hover:bg-emerald-400/20 transition-colors"
          >
            Explore the Scanner
          </Button>
        </section>
      </div>
    </div>
  );
};

interface GifPlaceholderProps {
  label: string;
  token: string;
}

const GifPlaceholder: React.FC<GifPlaceholderProps> = ({ label, token }) => {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/60 px-4 py-6 text-center">
      <span className="text-xs uppercase tracking-wide text-slate-400 mb-1">
        GIF Placeholder
      </span>
      <p className="text-sm text-slate-200 mb-1">{label}</p>
      <p className="text-xs text-slate-500">
        Replace this block with actual media for {token}.
      </p>
    </div>
  );
};

export default LandingPage;
