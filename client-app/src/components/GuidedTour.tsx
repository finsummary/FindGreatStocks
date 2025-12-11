import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface GuidedTourProps {
  run: boolean;
  onComplete?: () => void;
}

const TOUR_STORAGE_KEY = 'fgs:guided_tour:completed';

export function GuidedTour({ run, onComplete }: GuidedTourProps) {
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    // Define tour steps
    const tourSteps: Step[] = [
      {
        target: '[data-tour="market-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Choose a Market</h3>
            <p className="text-sm">
              Start by selecting a market to analyze. <strong>Dow Jones</strong> is available for free to all users.
              <strong>S&P 500</strong> and <strong>Nasdaq 100</strong> require a Premium subscription.
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Choose a Layout</h3>
            <p className="text-sm">
              Layouts help you analyze companies from different angles:
            </p>
            <ul className="text-sm mt-2 space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}><strong>Compounders (ROIC)</strong> - identify great compounders</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>Cashflow & Leverage</strong> - assess cash generation and debt</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>DuPont ROE Decomposition</strong> - understand what drives returns</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>Return on Risk</strong> - analyze risk-adjusted returns</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>DCF Valuation</strong> - estimate intrinsic value</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>Reverse DCF</strong> - understand growth expectations priced in</li>
            </ul>
            <p className="text-sm mt-2">
              All layouts are free for Dow Jones!
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="search"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Search Companies</h3>
            <p className="text-sm">
              Use the search to quickly find companies by name or ticker.
              For example, try searching for "Apple" or "AAPL".
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="watchlist"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Add to Watchlist</h3>
            <p className="text-sm">
              Click the star icon next to a company to add it to your personal watchlist.
              This helps you track companies you're interested in.
            </p>
            <p className="text-sm mt-2 text-muted-foreground">
              You need to sign in to use the watchlist feature.
            </p>
          </div>
        ),
        placement: 'right',
      },
      {
        target: '[data-tour="columns"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Explore Metrics</h3>
            <p className="text-sm">
              Hover over column headers to see detailed explanations of metrics.
              Each metric has a tooltip with a description.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="upgrade"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Unlock Premium</h3>
            <p className="text-sm">
              Get access to all markets (S&P 500, Nasdaq 100) and all layouts with our Lifetime Deal for just $49.
              This is a one-time payment for lifetime access!
            </p>
          </div>
        ),
        placement: 'left',
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

export function useGuidedTour() {
  const [shouldRun, setShouldRun] = useState(false);

  useEffect(() => {
    // Check if user has completed the tour
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!completed) {
        // Show tour after a delay to let the page and table load
        const timer = setTimeout(() => {
          // Check if required elements exist before starting tour
          const marketSelector = document.querySelector('[data-tour="market-selector"]');
          const layoutSelector = document.querySelector('[data-tour="layout-selector"]');
          if (marketSelector && layoutSelector) {
            setShouldRun(true);
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    } catch {
      // If localStorage is not available, don't show tour
    }
  }, []);

  const startTour = () => {
    setShouldRun(true);
  };

  const stopTour = () => {
    setShouldRun(false);
  };

  return { shouldRun, startTour, stopTour };
}

