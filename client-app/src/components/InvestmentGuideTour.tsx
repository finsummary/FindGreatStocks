import React, { useState, useEffect, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface InvestmentGuideTourProps {
  run: boolean;
  onComplete?: () => void;
  selectedLayout?: string | null;
  onStop?: () => void;
}

const TOUR_STORAGE_KEY = 'fgs:investment_guide_tour:completed';

export function InvestmentGuideTour({ run, onComplete, selectedLayout: selectedLayoutProp, onStop }: InvestmentGuideTourProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  // Restore stepIndex from localStorage ONLY if tour is running (to persist across page navigations)
  const [stepIndex, setStepIndex] = useState(() => {
    if (!run) return 0; // Don't restore if tour is not running
    try {
      const saved = localStorage.getItem('fgs:investment-tour:stepIndex');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [watchlistAdded, setWatchlistAdded] = useState(false);
  const [watchlistCreated, setWatchlistCreated] = useState(false);
  const [companyCopied, setCompanyCopied] = useState(false);
  const joyrideRef = useRef<Joyride>(null);

  // Save stepIndex to localStorage whenever it changes (only if tour is running)
  useEffect(() => {
    if (run) {
      try {
        localStorage.setItem('fgs:investment-tour:stepIndex', stepIndex.toString());
      } catch {}
    }
  }, [stepIndex, run]);

  // Listen for layout selection events
  useEffect(() => {
    const handleLayoutSelected = (event: CustomEvent) => {
      setSelectedLayout(event.detail?.layout || null);
    };

    const handleDropdownOpened = () => {
      setIsDropdownOpen(true);
    };

    const handleDropdownClosed = () => {
      setIsDropdownOpen(false);
    };

    // Listen for watchlist add event
    const handleWatchlistAdded = () => {
      setWatchlistAdded(true);
    };

    // Listen for watchlist creation event
    const handleWatchlistCreated = () => {
      setWatchlistCreated(true);
    };

    // Listen for company copy event
    const handleCompanyCopied = () => {
      setCompanyCopied(true);
    };

    window.addEventListener('fgs:layout-selected', handleLayoutSelected as EventListener);
    window.addEventListener('fgs:layout-dropdown-opened', handleDropdownOpened as EventListener);
    window.addEventListener('fgs:layout-dropdown-closed', handleDropdownClosed as EventListener);
    window.addEventListener('fgs:watchlist-added', handleWatchlistAdded as EventListener);
    window.addEventListener('fgs:watchlist-created', handleWatchlistCreated as EventListener);
    window.addEventListener('fgs:company-copied', handleCompanyCopied as EventListener);
    
    return () => {
      window.removeEventListener('fgs:layout-selected', handleLayoutSelected as EventListener);
      window.removeEventListener('fgs:layout-dropdown-opened', handleDropdownOpened as EventListener);
      window.removeEventListener('fgs:layout-dropdown-closed', handleDropdownClosed as EventListener);
      window.removeEventListener('fgs:watchlist-added', handleWatchlistAdded as EventListener);
      window.removeEventListener('fgs:watchlist-created', handleWatchlistCreated as EventListener);
      window.removeEventListener('fgs:company-copied', handleCompanyCopied as EventListener);
    };
  }, []);

  // Also use prop if provided
  useEffect(() => {
    if (selectedLayoutProp) {
      setSelectedLayout(selectedLayoutProp);
    }
  }, [selectedLayoutProp]);

  useEffect(() => {
    // Define all 28 tour steps
    const tourSteps: Step[] = [
      // Step 1: Intro
      {
        target: 'body',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">How to Find Great Stocks at a Good Price</h3>
            <p className="text-sm mb-2">
              This comprehensive guide will walk you through the complete investment analysis process used by professional investors.
            </p>
            <p className="text-sm">
              We'll cover everything from identifying great companies to determining if they're trading at a good price.
            </p>
          </div>
        ),
        placement: 'center',
        disableBeacon: true,
      },
      // Step 2: Choose Layout -> Compounders (ROIC)
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Step 1: Find Great Companies</h3>
            <p className="text-sm mb-2">
              Click on <strong>"Choose Layout"</strong> and select <strong>Compounders (ROIC)</strong> to identify exceptional businesses.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Please click "Choose Layout" to see the options.
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: false,
      },
      {
        target: '[data-tour="compounders-layout"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Step 1: Find Great Companies</h3>
            <p className="text-sm mb-2">
              Select <strong>Compounders (ROIC)</strong> to analyze companies based on their Return on Invested Capital.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Click on Compounders (ROIC) to continue.
            </p>
          </div>
        ),
        placement: 'top',
        disableBeacon: false,
      },
      // Step 3: ROIC % (Latest)
      {
        target: '[data-tour="tour-roic-latest"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">ROIC % (Latest)</h3>
            <p className="text-sm mb-2">
              This shows the Return on Invested Capital using the most recent fiscal year.
            </p>
            <p className="text-sm mb-2">
              <strong>ROIC</strong> measures how efficiently a company generates returns on its invested capital (debt + equity).
            </p>
            <p className="text-sm">
              Look for companies with <strong>ROIC ≥ 15%</strong> (green) - these are excellent compounders.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 4: ROIC 10Y Avg %
      {
        target: '[data-tour="tour-roic-10y-avg"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">ROIC 10Y Avg %</h3>
            <p className="text-sm mb-2">
              This is the average ROIC over the last 10 fiscal years (or available history).
            </p>
            <p className="text-sm mb-2">
              A <strong>higher average</strong> means the company has consistently strong capital efficiency over time.
            </p>
            <p className="text-sm">
              Great companies maintain high ROIC year after year, not just in one good year.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 5: ROIC Volatility %
      {
        target: '[data-tour="tour-roic-volatility"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">ROIC Volatility %</h3>
            <p className="text-sm mb-2">
              This is the standard deviation of annual ROIC over the last 10 years.
            </p>
            <p className="text-sm mb-2">
              <strong>Lower values</strong> mean more stable, predictable returns. High volatility suggests inconsistent performance.
            </p>
            <p className="text-sm">
              Look for companies with <strong>low volatility</strong> - they're more reliable investments.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 6: ROIC Stability Score
      {
        target: '[data-tour="tour-roic-stability-score"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">ROIC Stability Score</h3>
            <p className="text-sm mb-2">
              This score measures how <strong>stable</strong> ROIC values are year over year, regardless of whether they're high or low.
            </p>
            <p className="text-sm mb-2">
              It's calculated as <strong>ROIC Stability Ratio × 30</strong> (capped at 100). A score of 100 means very stable, predictable ROIC values.
            </p>
            <p className="text-sm">
              <strong>Green (≥70):</strong> Very stable ROIC<br/>
              <strong>Yellow (30-69):</strong> Moderately stable<br/>
              <strong>Red (&lt;30):</strong> High volatility in ROIC values
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 7: ROIC History (10Y)
      {
        target: '[data-tour="tour-roic-history"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">ROIC History (10Y)</h3>
            <p className="text-sm mb-2">
              This bar chart shows annual ROIC values for the last 10 fiscal years. Each bar represents one year.
            </p>
            <p className="text-sm mb-2">
              <strong>Green bars (≥15%):</strong> Excellent ROIC<br/>
              <strong>Yellow bars (5-15%):</strong> Good ROIC<br/>
              <strong>Red bars (&lt;5%):</strong> Weak ROIC
            </p>
            <p className="text-sm">
              Look for companies with mostly green bars - they consistently generate high returns on capital.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 8: Add to Watchlist
      {
        target: '[data-tour="tour-watchlist-msft"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Add to Watchlist</h3>
            <p className="text-sm mb-2">
              Found a great company? Click the <strong>star icon</strong> to add it to your personal watchlist.
            </p>
            <p className="text-sm mb-2">
              For example, <strong>Microsoft (MSFT)</strong> has excellent ROIC metrics - try adding it to your watchlist!
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Please click the star icon to add a company to your watchlist.
            </p>
          </div>
        ),
        placement: 'right',
      },
      // Step 9: Click Watchlist button
      {
        target: '[data-tour="watchlist-nav-button"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">View Your Watchlist</h3>
            <p className="text-sm mb-2">
              Now let's check the cash flow quality of companies in your watchlist. Click on <strong>"Watchlist"</strong> in the top navigation.
            </p>
            <p className="text-sm">
              Once you're on the watchlist page, we'll analyze their financial health.
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: false,
      },
      // Step 10: Choose Layout -> Cashflow & Leverage
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Step 2: Buy at a Good Price</h3>
            <p className="text-sm mb-2">
              Now that you're on your watchlist, click on <strong>"Choose Layout"</strong> and select <strong>Cashflow & Leverage</strong> to verify financial health.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Please click "Choose Layout" to see the options.
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: false,
      },
      {
        target: '[data-tour="cashflow-leverage-layout"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Step 2: Buy at a Good Price</h3>
            <p className="text-sm mb-2">
              Select <strong>Cashflow & Leverage</strong> to verify the financial health of companies in your watchlist.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Click on Cashflow & Leverage to continue.
            </p>
          </div>
        ),
        placement: 'top',
        disableBeacon: false,
      },
      // Step 11: FCF Margin %
      {
        target: '[data-tour="tour-fcf-margin"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">FCF Margin %</h3>
            <p className="text-sm mb-2">
              <strong>Free Cash Flow Margin</strong> = Free Cash Flow ÷ Revenue. Shows how much cash is generated from each dollar of sales.
            </p>
            <p className="text-sm mb-2">
              <strong>Green (≥15%):</strong> Excellent cash generation<br/>
              <strong>Yellow (5-15%):</strong> Good cash generation<br/>
              <strong>Red (&lt;5%):</strong> Weak cash generation
            </p>
            <p className="text-sm">
              Great companies convert a high percentage of revenue into free cash flow.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 12: FCF Margin 10Y Median %
      {
        target: '[data-tour="tour-fcf-margin-10y-median"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">FCF Margin 10Y Median %</h3>
            <p className="text-sm mb-2">
              This is the median FCF margin over the last 10 fiscal years (FCF ÷ Revenue each year).
            </p>
            <p className="text-sm mb-2">
              A <strong>higher median</strong> indicates consistently strong cash conversion over time.
            </p>
            <p className="text-sm">
              Look for companies with stable, high median FCF margins - they're reliable cash generators.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 13: FCF Margin History (10Y)
      {
        target: '[data-tour="tour-fcf-margin-history"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">FCF Margin History (10Y)</h3>
            <p className="text-sm mb-2">
              This bar chart shows annual FCF margin values for the last 10 fiscal years. Each bar represents one year.
            </p>
            <p className="text-sm mb-2">
              <strong>Green bars (≥15%):</strong> Excellent FCF margin<br/>
              <strong>Yellow bars (5-15%):</strong> Good FCF margin<br/>
              <strong>Red bars (&lt;5%):</strong> Weak FCF margin
            </p>
            <p className="text-sm">
              Look for companies with mostly green bars - they consistently generate strong cash flow.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 14: Debt-to-Equity
      {
        target: '[data-tour="tour-debt-to-equity"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Debt-to-Equity</h3>
            <p className="text-sm mb-2">
              <strong>Debt-to-Equity Ratio</strong> = Total Debt ÷ Total Equity. Measures a company's financial leverage.
            </p>
            <p className="text-sm mb-2">
              <strong>Green (&lt;0.5):</strong> Low leverage, conservative<br/>
              <strong>Yellow (0.5-1.0):</strong> Moderate leverage<br/>
              <strong>Red (&gt;1.0):</strong> High leverage, risky
            </p>
            <p className="text-sm">
              Lower is generally better - companies with less debt are more resilient during downturns.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 15: Interest Coverage
      {
        target: '[data-tour="tour-interest-coverage"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Interest Coverage</h3>
            <p className="text-sm mb-2">
              <strong>Interest Coverage Ratio</strong> = EBIT ÷ Interest Expense. Measures a company's ability to pay interest on its debt.
            </p>
            <p className="text-sm mb-2">
              <strong>Green (≥5):</strong> Strong ability to cover interest<br/>
              <strong>Yellow (2-5):</strong> Adequate coverage<br/>
              <strong>Red (&lt;2):</strong> Weak coverage, risky
            </p>
            <p className="text-sm">
              Higher is better - companies with high interest coverage can easily service their debt.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 16: Cash Flow to Debt
      {
        target: '[data-tour="tour-cash-flow-to-debt"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Cash Flow to Debt</h3>
            <p className="text-sm mb-2">
              <strong>Cash Flow to Debt Ratio</strong> = Operating Cash Flow ÷ Total Debt. Measures a company's ability to pay off its debt with operating cash flow.
            </p>
            <p className="text-sm mb-2">
              <strong>Green (≥0.5):</strong> Strong ability to pay off debt<br/>
              <strong>Yellow (0.2-0.5):</strong> Moderate ability<br/>
              <strong>Red (&lt;0.2):</strong> Weak ability
            </p>
            <p className="text-sm">
              Higher is better - companies with high ratios can pay off debt quickly if needed.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 17: Choose Layout -> DuPont ROE Decomposition
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Understand What Drives Returns</h3>
            <p className="text-sm mb-2">
              Click on <strong>"Choose Layout"</strong> and select <strong>DuPont ROE Decomposition</strong> to see what drives a company's ROE.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Please click "Choose Layout" to see the options.
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: false,
      },
      {
        target: '[data-tour="dupont-roe-layout"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">DuPont ROE Decomposition</h3>
            <p className="text-sm mb-2">
              Select <strong>DuPont ROE Decomposition</strong> to understand what drives a company's Return on Equity.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Click on DuPont ROE Decomposition to continue.
            </p>
          </div>
        ),
        placement: 'top',
        disableBeacon: false,
      },
      // Step 18: ROE % explanation
      {
        target: '[data-tour="tour-roe"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">ROE % (Return on Equity)</h3>
            <p className="text-sm mb-2">
              <strong>ROE</strong> measures a company's profitability in relation to stockholders' equity.
            </p>
            <p className="text-sm mb-2">
              <strong>ROE = Net Profit Margin × Asset Turnover × Financial Leverage</strong>
            </p>
            <p className="text-sm mb-2">
              This DuPont formula breaks down ROE into three components:
            </p>
            <ul className="text-sm space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}><strong>Net Profit Margin:</strong> How profitable (Net Income ÷ Revenue)</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>Asset Turnover:</strong> How efficient (Revenue ÷ Total Assets)</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>Financial Leverage:</strong> How much debt (Total Assets ÷ Total Equity)</li>
            </ul>
            <p className="text-sm mt-2">
              This helps distinguish genuine quality from artificially inflated returns through high leverage.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 19: Choose Layout -> Return on Risk
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Evaluate Risk-Adjusted Returns</h3>
            <p className="text-sm mb-2">
              Click on <strong>"Choose Layout"</strong> and select <strong>Return on Risk</strong> to see how well companies perform relative to risk.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Please click "Choose Layout" to see the options.
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: false,
      },
      {
        target: '[data-tour="return-on-risk-layout"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Return on Risk</h3>
            <p className="text-sm mb-2">
              Select <strong>Return on Risk</strong> to evaluate investment efficiency.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Click on Return on Risk to continue.
            </p>
          </div>
        ),
        placement: 'top',
        disableBeacon: false,
      },
      // Step 20: Return/Risk ratios explanation
      {
        target: '[data-tour="tour-10y-return-risk"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Return/Risk Ratios</h3>
            <p className="text-sm mb-2">
              These ratios compare annualized returns against maximum drawdowns (the largest drop from a peak).
            </p>
            <p className="text-sm mb-2">
              <strong>Return/Risk = Annualized Return ÷ Max Drawdown</strong>
            </p>
            <p className="text-sm mb-2">
              The layout shows three timeframes:
            </p>
            <ul className="text-sm space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}><strong>10Y Return/Risk:</strong> Long-term risk-adjusted performance</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>5Y Return/Risk:</strong> Medium-term performance</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>3Y Return/Risk:</strong> Recent performance</li>
            </ul>
            <p className="text-sm mt-2">
              <strong>Higher ratios</strong> mean better returns for the amount of risk taken. Great companies grow without destroying shareholder capital.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 21: Choose Layout -> DCF Valuation
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Is the Company Traded at a Good Price?</h3>
            <p className="text-sm mb-2">
              Click on <strong>"Choose Layout"</strong> and select <strong>DCF Valuation</strong> to estimate the company's intrinsic value.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Please click "Choose Layout" to see the options.
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: false,
      },
      {
        target: '[data-tour="dcf-valuation-layout"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">DCF Valuation</h3>
            <p className="text-sm mb-2">
              Select <strong>DCF Valuation</strong> to see if the company is trading at a good price.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Click on DCF Valuation to continue.
            </p>
          </div>
        ),
        placement: 'top',
        disableBeacon: false,
      },
      // Step 22: Margin of Safety
      {
        target: '[data-tour="tour-margin-of-safety"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Margin of Safety</h3>
            <p className="text-sm mb-2">
              The <strong>Margin of Safety</strong> shows the percentage difference between the DCF Enterprise Value and the current Market Cap.
            </p>
            <p className="text-sm mb-2">
              <strong>Positive margin</strong> = potentially undervalued (DCF value is higher than market price)<br/>
              <strong>Negative margin</strong> = potentially overvalued (DCF value is lower than market price)
            </p>
            <p className="text-sm mb-2">
              DCF values a company based on future free cash flows, discounted to their present value.
            </p>
            <p className="text-sm">
              Look for companies with <strong>positive margins of safety</strong> - they may be trading below their intrinsic value.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 23: Choose Layout -> Reverse DCF
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Understand Market Expectations</h3>
            <p className="text-sm mb-2">
              Click on <strong>"Choose Layout"</strong> and select <strong>Reverse DCF</strong> to see what growth rate the current stock price implies.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Please click "Choose Layout" to see the options.
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: false,
      },
      {
        target: '[data-tour="reverse-dcf-layout"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Reverse DCF</h3>
            <p className="text-sm mb-2">
              Select <strong>Reverse DCF</strong> to understand what expectations are already priced in.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Click on Reverse DCF to continue.
            </p>
          </div>
        ),
        placement: 'top',
        disableBeacon: false,
      },
      // Step 24: DCF Implied Growth
      {
        target: '[data-tour="tour-dcf-implied-growth"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">DCF Implied Growth</h3>
            <p className="text-sm mb-2">
              <strong>DCF Implied Growth</strong> shows the Free Cash Flow growth rate required to justify the current stock price.
            </p>
            <p className="text-sm mb-2">
              Compare this to the <strong>10Y Revenue Growth</strong> shown in the same layout:
            </p>
            <ul className="text-sm space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}>If implied growth is <strong>much higher</strong> than historical growth, the stock may be <strong>overvalued</strong></li>
              <li style={{ paddingLeft: '0.5rem' }}>If implied growth is <strong>similar or lower</strong> than historical growth, the stock may be <strong>reasonably valued</strong></li>
            </ul>
            <p className="text-sm mt-2">
              This helps you see what expectations are already priced into the stock.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 25: Manage Watchlists -> Create New Watchlist
      {
        target: '[data-tour="manage-watchlists-button"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Organize Your Research</h3>
            <p className="text-sm mb-2">
              Click on <strong>"Manage"</strong> to create a new watchlist for companies that are both great and undervalued.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Please click "Manage" to open the watchlist manager.
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: false,
      },
      {
        target: '[data-tour="create-new-watchlist-button"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Create New Watchlist</h3>
            <p className="text-sm mb-2">
              Click on <strong>"Create New Watchlist"</strong> and name it <strong>"Good + Undervalued"</strong>.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Please click "Create New Watchlist" and name it "Good + Undervalued".
            </p>
          </div>
        ),
        placement: 'top',
        disableBeacon: false,
      },
      // Step 26: Copy to another Watchlist
      {
        target: '[data-tour="three-dots-menu"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Copy Company to Watchlist</h3>
            <p className="text-sm mb-2">
              Click on the <strong>three dots (⋮)</strong> next to a company and select <strong>"Copy to another watchlist"</strong>.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Please click the three dots menu to see the options.
            </p>
          </div>
        ),
        placement: 'left',
        disableBeacon: false,
      },
      {
        target: '[data-tour="copy-to-watchlist-menu-item"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Copy to Watchlist</h3>
            <p className="text-sm mb-2">
              Select <strong>"Copy to another watchlist"</strong> and choose <strong>"Good + Undervalued"</strong>.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Please click "Copy to another watchlist" and select "Good + Undervalued".
            </p>
          </div>
        ),
        placement: 'left',
        disableBeacon: false,
      },
      // Step 27: Go to 'Good + Undervalued' watchlist
      {
        target: '[data-tour="watchlist-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">View Your Curated Watchlist</h3>
            <p className="text-sm mb-2">
              Use the watchlist selector dropdown to navigate to your <strong>"Good + Undervalued"</strong> watchlist.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Please select "Good + Undervalued" from the dropdown.
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: false,
      },
      // Step 28: Final message
      {
        target: 'body',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Congratulations!</h3>
            <p className="text-sm mb-2">
              You've completed the full investment analysis process! You now have a curated watchlist of companies that are both great businesses and potentially undervalued.
            </p>
            <p className="text-sm mb-2">
              At this stage, you can further study each company by:
            </p>
            <ul className="text-sm space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}>Reading their Annual and Quarterly reports</li>
              <li style={{ paddingLeft: '0.5rem' }}>Following company news and updates</li>
              <li style={{ paddingLeft: '0.5rem' }}>Analyzing industry trends and competitive position</li>
              <li style={{ paddingLeft: '0.5rem' }}>Monitoring key metrics over time</li>
            </ul>
            <p className="text-sm mt-2">
              Happy investing! 🎉
            </p>
          </div>
        ),
        placement: 'center',
        disableBeacon: true,
      },
    ];

    setSteps(tourSteps);
  }, []);

  // Auto-advance when dropdown opens on layout selection steps
  useEffect(() => {
    if (run && isDropdownOpen && [2, 10, 17, 19, 21, 23].includes(stepIndex)) {
      setTimeout(() => {
        setStepIndex(stepIndex + 1);
      }, 100);
    }
  }, [run, stepIndex, isDropdownOpen]);

  // Auto-advance when user selects layouts
  useEffect(() => {
    if (run && stepIndex === 3 && selectedLayout === 'compounders') {
      setTimeout(() => setStepIndex(4), 500);
    } else if (run && stepIndex === 11 && selectedLayout === 'cashflowLeverage') {
      setTimeout(() => setStepIndex(12), 500);
    } else if (run && stepIndex === 18 && selectedLayout === 'dupontRoe') {
      setTimeout(() => setStepIndex(19), 500);
    } else if (run && stepIndex === 20 && selectedLayout === 'returnOnRisk') {
      setTimeout(() => setStepIndex(21), 500);
    } else if (run && stepIndex === 22 && selectedLayout === 'dcfValuation') {
      setTimeout(() => setStepIndex(23), 500);
    } else if (run && stepIndex === 24 && selectedLayout === 'reverseDcf') {
      setTimeout(() => setStepIndex(25), 500);
    }
  }, [run, stepIndex, selectedLayout]);

  // Auto-advance when watchlist is added (step 8 -> 9)
  useEffect(() => {
    if (run && stepIndex === 8 && watchlistAdded) {
      setTimeout(() => setStepIndex(9), 500);
    }
  }, [run, stepIndex, watchlistAdded]);

  // Auto-advance when watchlist is created (step 25 -> 26)
  useEffect(() => {
    if (run && stepIndex === 25 && watchlistCreated) {
      setTimeout(() => setStepIndex(26), 500);
    }
  }, [run, stepIndex, watchlistCreated]);

  // Auto-advance when company is copied (step 27 -> 28)
  useEffect(() => {
    if (run && stepIndex === 27 && companyCopied) {
      setTimeout(() => setStepIndex(28), 500);
    }
  }, [run, stepIndex, companyCopied]);

  // Auto-advance when user navigates to watchlist (step 9)
  useEffect(() => {
    if (run && stepIndex === 9) {
      const checkWatchlistPage = () => {
        const isOnWatchlistPage = window.location.pathname === '/watchlist';
        if (isOnWatchlistPage) {
          setTimeout(() => setStepIndex(10), 1500);
        } else {
          setTimeout(checkWatchlistPage, 200);
        }
      };
      checkWatchlistPage();
    }
  }, [run, stepIndex]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, action, type } = data;
    const currentSteps = steps;
    
    console.log('Tour callback:', { type, index, action, status, stepIndex, target: currentSteps[index]?.target, stepsLength: currentSteps.length, run });
    
    // Handle close button click - user clicked X button
    if (action === 'close') {
      console.log('Tour closed by user on step', index);
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
      } catch {}
      window.dispatchEvent(new CustomEvent('fgs:investment-tour-step1-inactive'));
      if (onStop) onStop();
      if (onComplete) onComplete();
      return;
    }
    
    // Handle skipped
    if (status === STATUS.SKIPPED) {
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
      } catch {}
      window.dispatchEvent(new CustomEvent('fgs:investment-tour-step1-inactive'));
      if (onStop) onStop();
      if (onComplete) onComplete();
      return;
    }
    
    // Handle tour finished
    if (status === STATUS.FINISHED) {
      if (index === currentSteps.length - 1) {
        try {
          localStorage.setItem(TOUR_STORAGE_KEY, '1');
        } catch {}
        window.dispatchEvent(new CustomEvent('fgs:investment-tour-step1-inactive'));
        if (onStop) onStop();
        if (onComplete) onComplete();
        return;
      } else {
        const lastStepIndex = currentSteps.length - 1;
        console.warn('Tour marked as FINISHED but not on last step. Continuing...', { index, lastStepIndex });
        if (index < lastStepIndex) {
          setTimeout(() => setStepIndex(index + 1), 300);
        }
        return;
      }
    }

    // Update step index when user navigates
    if (type === 'step:after') {
      if (action === 'next') {
        // Block advancement on interactive steps
        if (stepIndex === 2 && !isDropdownOpen) {
          requestAnimationFrame(() => setStepIndex(2));
          return;
        }
        if (stepIndex === 3 && selectedLayout !== 'compounders') {
          requestAnimationFrame(() => setStepIndex(3));
          return;
        }
        if (stepIndex === 8 && !watchlistAdded) {
          requestAnimationFrame(() => setStepIndex(8));
          return;
        }
        if (stepIndex === 10 && !isDropdownOpen) {
          requestAnimationFrame(() => setStepIndex(10));
          return;
        }
        if (stepIndex === 11 && selectedLayout !== 'cashflowLeverage') {
          requestAnimationFrame(() => setStepIndex(11));
          return;
        }
        if (stepIndex === 17 && !isDropdownOpen) {
          requestAnimationFrame(() => setStepIndex(17));
          return;
        }
        if (stepIndex === 18 && selectedLayout !== 'dupontRoe') {
          requestAnimationFrame(() => setStepIndex(18));
          return;
        }
        if (stepIndex === 19 && !isDropdownOpen) {
          requestAnimationFrame(() => setStepIndex(19));
          return;
        }
        if (stepIndex === 20 && selectedLayout !== 'returnOnRisk') {
          requestAnimationFrame(() => setStepIndex(20));
          return;
        }
        if (stepIndex === 21 && !isDropdownOpen) {
          requestAnimationFrame(() => setStepIndex(21));
          return;
        }
        if (stepIndex === 22 && selectedLayout !== 'dcfValuation') {
          requestAnimationFrame(() => setStepIndex(22));
          return;
        }
        if (stepIndex === 23 && !isDropdownOpen) {
          requestAnimationFrame(() => setStepIndex(23));
          return;
        }
        if (stepIndex === 24 && selectedLayout !== 'reverseDcf') {
          requestAnimationFrame(() => setStepIndex(24));
          return;
        }
        
        // Allow normal navigation for other steps
        const nextIndex = index + 1;
        if (nextIndex < currentSteps.length) {
          const nextTarget = currentSteps[nextIndex]?.target;
          if (nextTarget && typeof nextTarget === 'string') {
            const maxAttempts = 20;
            const delay = 100;
            let attempts = 0;
            const checkAndAdvance = () => {
              const element = document.querySelector(nextTarget);
              if (element) {
                console.log('Element found, advancing to step:', nextIndex, 'Target:', nextTarget, 'Attempts:', attempts);
                requestAnimationFrame(() => setStepIndex(nextIndex));
              } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkAndAdvance, delay);
              } else {
                console.warn('Element not found after', maxAttempts, 'attempts, advancing anyway. Target:', nextTarget);
                requestAnimationFrame(() => setStepIndex(nextIndex));
              }
            };
            setTimeout(checkAndAdvance, 50);
          } else {
            requestAnimationFrame(() => setStepIndex(nextIndex));
          }
        }
      } else if (action === 'prev') {
        setStepIndex(index - 1);
      }
    } else if (type === 'error:target_not_found') {
      console.warn('Tour target not found for step:', index, 'Target:', currentSteps[index]?.target);
      const targetSelector = currentSteps[index]?.target;
      if (targetSelector && typeof targetSelector === 'string') {
        const maxAttempts = 15;
        const delay = 150;
        let attempts = 0;
        const findElement = () => {
          const element = document.querySelector(targetSelector);
          if (element) {
            console.log('Element found after', attempts, 'attempts, scrolling to it');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (stepIndex !== index) {
              setStepIndex(index);
            }
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(findElement, delay);
          } else {
            console.warn('Element not found after', maxAttempts, 'attempts, skipping to next step:', index + 1);
            if (index < currentSteps.length - 1) {
              setStepIndex(index + 1);
            }
          }
        };
        setTimeout(findElement, 0);
      } else {
        console.warn('No valid target selector, continuing to next step:', index + 1);
        if (index < currentSteps.length - 1) {
          setStepIndex(index + 1);
        }
      }
    }
  };

  // Hide popup when dropdown is open on layout selection steps
  const shouldHidePopup = [2, 3, 10, 11, 17, 18, 21, 22, 23, 24, 26, 27].includes(stepIndex) && isDropdownOpen;

  if (!run || steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      ref={joyrideRef}
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          zIndex: shouldHidePopup ? 1 : 10000,
        },
        tooltip: {
          display: shouldHidePopup ? 'none' : 'block',
          visibility: shouldHidePopup ? 'hidden' : 'visible',
        },
        tooltipContainer: {
          display: shouldHidePopup ? 'none' : 'block',
          visibility: shouldHidePopup ? 'hidden' : 'visible',
        },
        overlay: {
          display: shouldHidePopup ? 'none' : 'block',
          visibility: shouldHidePopup ? 'hidden' : 'visible',
        },
        spotlight: {
          display: shouldHidePopup ? 'none' : 'block',
        },
        buttonNext: {
          backgroundColor: 
            (stepIndex === 2 && !isDropdownOpen) || 
            (stepIndex === 3 && selectedLayout !== 'compounders') ||
            (stepIndex === 8 && !watchlistAdded) ||
            (stepIndex === 10 && !isDropdownOpen) ||
            (stepIndex === 12 && selectedLayout !== 'cashflowLeverage') ||
            (stepIndex === 17 && !isDropdownOpen) ||
            (stepIndex === 19 && selectedLayout !== 'dupontRoe') ||
            (stepIndex === 21 && !isDropdownOpen) ||
            (stepIndex === 24 && selectedLayout !== 'dcfValuation') ||
            (stepIndex === 23 && !isDropdownOpen) ||
            (stepIndex === 26 && selectedLayout !== 'reverseDcf')
              ? '#9ca3af' : '#10b981',
          cursor: 
            (stepIndex === 2 && !isDropdownOpen) || 
            (stepIndex === 3 && selectedLayout !== 'compounders') ||
            (stepIndex === 8 && !watchlistAdded) ||
            (stepIndex === 10 && !isDropdownOpen) ||
            (stepIndex === 12 && selectedLayout !== 'cashflowLeverage') ||
            (stepIndex === 17 && !isDropdownOpen) ||
            (stepIndex === 19 && selectedLayout !== 'dupontRoe') ||
            (stepIndex === 21 && !isDropdownOpen) ||
            (stepIndex === 24 && selectedLayout !== 'dcfValuation') ||
            (stepIndex === 23 && !isDropdownOpen) ||
            (stepIndex === 26 && selectedLayout !== 'reverseDcf')
              ? 'not-allowed' : 'pointer',
          opacity: 
            (stepIndex === 2 && !isDropdownOpen) || 
            (stepIndex === 3 && selectedLayout !== 'compounders') ||
            (stepIndex === 8 && !watchlistAdded) ||
            (stepIndex === 10 && !isDropdownOpen) ||
            (stepIndex === 12 && selectedLayout !== 'cashflowLeverage') ||
            (stepIndex === 17 && !isDropdownOpen) ||
            (stepIndex === 19 && selectedLayout !== 'dupontRoe') ||
            (stepIndex === 21 && !isDropdownOpen) ||
            (stepIndex === 24 && selectedLayout !== 'dcfValuation') ||
            (stepIndex === 23 && !isDropdownOpen) ||
            (stepIndex === 26 && selectedLayout !== 'reverseDcf')
              ? 0.6 : 1,
          fontSize: '14px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#6b7280',
          fontSize: '14px',
        },
        buttonSkip: {
          color: '#6b7280',
          fontSize: '14px',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}

export function useInvestmentGuideTour() {
  const [shouldRun, setShouldRun] = useState(false);

  const startTour = () => {
    setShouldRun(true);
    try {
      localStorage.setItem('fgs:investment-tour:shouldRun', 'true');
    } catch {}
  };

  const stopTour = () => {
    setShouldRun(false);
    try {
      localStorage.removeItem('fgs:investment-tour:shouldRun');
      localStorage.removeItem('fgs:investment-tour:stepIndex');
    } catch {}
  };

  return { shouldRun, startTour, stopTour };
}
