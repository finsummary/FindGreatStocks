import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface InvestmentGuideTourProps {
  run: boolean;
  onComplete?: () => void;
}

const TOUR_STORAGE_KEY = 'fgs:investment_guide_tour:completed';

export function InvestmentGuideTour({ run, onComplete }: InvestmentGuideTourProps) {
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    // Define tour steps based on Landing Page content
    const tourSteps: Step[] = [
      {
        target: 'body',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">How to Find Great Stocks at a Good Price</h3>
            <p className="text-sm">
              This guide will walk you through the two-step process professional investors use:
            </p>
            <ul className="text-sm mt-2 space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}><strong>Find Great Companies</strong> - identify exceptional businesses</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>Buy at a Good Price</strong> - determine if the stock is undervalued</li>
            </ul>
          </div>
        ),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Step 1: Find Great Companies</h3>
            <p className="text-sm mb-2">
              Start by using the <strong>Compounders (ROIC)</strong> layout to identify exceptional businesses.
            </p>
            <p className="text-sm mb-2">
              Look for companies with:
            </p>
            <ul className="text-sm space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}>High ROIC (Return on Invested Capital)</li>
              <li style={{ paddingLeft: '0.5rem' }}>High ROIC Stability Score (consistency over 10 years)</li>
            </ul>
            <p className="text-sm mt-2">
              These metrics indicate a durable business model.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Check Cash Flow Quality</h3>
            <p className="text-sm mb-2">
              Switch to the <strong>Cashflow & Leverage</strong> layout to verify:
            </p>
            <ul className="text-sm space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}>High FCF Margin (Free Cash Flow / Revenue)</li>
              <li style={{ paddingLeft: '0.5rem' }}>Stable 10-Year Median FCF Margin</li>
              <li style={{ paddingLeft: '0.5rem' }}>Strong balance sheet (low Debt-to-Equity, high Interest Coverage)</li>
            </ul>
            <p className="text-sm mt-2">
              Great companies generate reliable cash year after year.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Understand What Drives Returns</h3>
            <p className="text-sm mb-2">
              Use the <strong>DuPont ROE Decomposition</strong> layout to see what drives a company's ROE:
            </p>
            <ul className="text-sm space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}>Profitability (Net Profit Margin)</li>
              <li style={{ paddingLeft: '0.5rem' }}>Efficiency (Asset Turnover)</li>
              <li style={{ paddingLeft: '0.5rem' }}>Leverage (Financial Leverage)</li>
            </ul>
            <p className="text-sm mt-2">
              This helps distinguish genuine quality from artificially inflated returns.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Evaluate Risk-Adjusted Returns</h3>
            <p className="text-sm mb-2">
              Check the <strong>Return on Risk</strong> layout to see how well companies perform relative to risk:
            </p>
            <ul className="text-sm space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}>Return-to-Risk Ratio (Annual Return / Max Drawdown)</li>
              <li style={{ paddingLeft: '0.5rem' }}>3Y, 5Y, 10Y historical stability</li>
            </ul>
            <p className="text-sm mt-2">
              Great companies grow without destroying shareholder capital.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Step 2: Buy at a Good Price</h3>
            <p className="text-sm mb-2">
              Once you've found a great company, use the <strong>DCF Valuation</strong> layout to estimate its intrinsic value:
            </p>
            <ul className="text-sm space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}>Check the Margin of Safety</li>
              <li style={{ paddingLeft: '0.5rem' }}>Positive margin = potentially undervalued</li>
            </ul>
            <p className="text-sm mt-2">
              DCF values a company based on future free cash flows.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Understand Market Expectations</h3>
            <p className="text-sm mb-2">
              Use the <strong>Reverse DCF</strong> layout to see what growth rate the current stock price implies:
            </p>
            <ul className="text-sm space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}>Compare DCF Implied Growth to historical growth</li>
              <li style={{ paddingLeft: '0.5rem' }}>If implied growth is unrealistic, the stock may be overvalued</li>
            </ul>
            <p className="text-sm mt-2">
              This helps you see what expectations are already priced in.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
    ];

    setSteps(tourSteps);
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      // Mark tour as completed
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
      } catch {}
      
      if (onComplete) {
        onComplete();
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#10b981', // emerald-500
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '8px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#10b981',
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
    />
  );
}

export function useInvestmentGuideTour() {
  const [shouldRun, setShouldRun] = useState(false);

  const startTour = () => {
    setShouldRun(true);
  };

  const stopTour = () => {
    setShouldRun(false);
  };

  return { shouldRun, startTour, stopTour };
}

