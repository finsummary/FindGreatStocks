import React, { useState, useEffect, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface InvestmentGuideTourProps {
  run: boolean;
  onComplete?: () => void;
  selectedLayout?: string | null;
}

const TOUR_STORAGE_KEY = 'fgs:investment_guide_tour:completed';

export function InvestmentGuideTour({ run, onComplete, selectedLayout: selectedLayoutProp }: InvestmentGuideTourProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const joyrideRef = useRef<Joyride>(null);

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

    window.addEventListener('fgs:layout-selected', handleLayoutSelected as EventListener);
    window.addEventListener('fgs:layout-dropdown-opened', handleDropdownOpened as EventListener);
    window.addEventListener('fgs:layout-dropdown-closed', handleDropdownClosed as EventListener);
    
    return () => {
      window.removeEventListener('fgs:layout-selected', handleLayoutSelected as EventListener);
      window.removeEventListener('fgs:layout-dropdown-opened', handleDropdownOpened as EventListener);
      window.removeEventListener('fgs:layout-dropdown-closed', handleDropdownClosed as EventListener);
    };
  }, []);

  // Also use prop if provided
  useEffect(() => {
    if (selectedLayoutProp) {
      setSelectedLayout(selectedLayoutProp);
    }
  }, [selectedLayoutProp]);

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
        target: isDropdownOpen ? '[data-tour="compounders-layout"]' : '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Step 1: Find Great Companies</h3>
            <p className="text-sm mb-2">
              {isDropdownOpen 
                ? <>Select <strong>Compounders (ROIC)</strong> to identify exceptional businesses.</>
                : <>Click on <strong>"Choose Layout"</strong> and select <strong>Compounders (ROIC)</strong> to identify exceptional businesses.</>
              }
            </p>
            <p className="text-sm mb-2">
              Look for companies with:
            </p>
            <ul className="text-sm space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}>High ROIC (Return on Invested Capital)</li>
              <li style={{ paddingLeft: '0.5rem' }}>High ROIC Stability Score (consistency over 10 years)</li>
            </ul>
            <p className="text-sm mt-2 font-semibold text-emerald-600">
              {isDropdownOpen 
                ? 'Click on Compounders (ROIC) to continue.'
                : 'Please select the Compounders (ROIC) layout to continue.'
              }
            </p>
          </div>
        ),
        placement: isDropdownOpen ? 'top' : 'bottom',
        disableBeacon: true,
        spotlightClicks: true,
      },
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Great! You selected Compounders layout</h3>
            <p className="text-sm mb-2">
              Now you can see companies sorted by ROIC and ROIC Stability Score. This helps identify exceptional compounders.
            </p>
            <p className="text-sm">
              Next, let's check cash flow quality.
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
  }, [isDropdownOpen]);

  // Auto-advance when user selects compounders layout on step 1
  useEffect(() => {
    if (stepIndex === 1 && selectedLayout === 'compounders' && run) {
      // User selected compounders, advance to next step after a short delay
      setTimeout(() => {
        setStepIndex(2);
      }, 500);
    }
  }, [stepIndex, selectedLayout, run]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, action, type } = data;
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      // Mark tour as completed
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
      } catch {}
      
      if (onComplete) {
        onComplete();
      }
      return;
    }

    // Update step index when user navigates
    if (type === 'step:after') {
      if (action === 'next') {
        // Block advancement on step 1 if layout not selected
        if (index === 1 && selectedLayout !== 'compounders') {
          // Reset stepIndex back to 1 to prevent advancement
          requestAnimationFrame(() => {
            setStepIndex(1);
          });
          return;
        }
        setStepIndex(index + 1);
      } else if (action === 'prev') {
        setStepIndex(index - 1);
      }
    } else if (type === 'step:before') {
      // Sync stepIndex with joyride's internal index only if not blocking
      if (!(index === 1 && selectedLayout !== 'compounders')) {
        setStepIndex(index);
      } else {
        // Keep at step 1 if trying to advance without layout selection
        setStepIndex(1);
      }
    }
  };

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
      spotlightClicks={stepIndex === 1}
      disableOverlayClose={stepIndex === 1 && !isDropdownOpen}
      disableScrolling={stepIndex === 1 && !isDropdownOpen}
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
          backgroundColor: stepIndex === 1 && selectedLayout !== 'compounders' ? '#9ca3af' : '#10b981',
          fontSize: '14px',
          padding: '8px 16px',
          cursor: stepIndex === 1 && selectedLayout !== 'compounders' ? 'not-allowed' : 'pointer',
          opacity: stepIndex === 1 && selectedLayout !== 'compounders' ? 0.6 : 1,
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
