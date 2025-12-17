import React, { useEffect, useRef } from 'react';
import introJs from 'intro.js';
import 'intro.js/introjs.css';

interface GuidedTourProps {
  run: boolean;
  onComplete?: () => void;
  onStop?: () => void;
}

const TOUR_STORAGE_KEY = 'fgs:guided_tour:completed';

export function GuidedTour({ run, onComplete, onStop }: GuidedTourProps) {
  // Use any type to avoid TypeScript issues with LegacyIntroJs vs IntroJs
  const introInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (run) {
      // Initialize Intro.js
      // Use 'as any' to avoid TypeScript issues with LegacyIntroJs vs IntroJs
      const intro = introJs() as any;
      introInstanceRef.current = intro;

      // Configure Intro.js
      intro.setOptions({
        steps: [
          {
            intro: `
              <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">Choose a Market</h3>
              <p style="font-size: 0.875rem; margin-bottom: 0.5rem;">
                Start by selecting a market to analyze. <strong>Dow Jones</strong> is available for free to all users.
                <strong>S&P 500</strong> and <strong>Nasdaq 100</strong> require a Premium subscription.
              </p>
            `,
            element: '[data-tour="market-selector"]',
            position: 'bottom',
          },
          {
            intro: `
              <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">Choose a Layout</h3>
              <p style="font-size: 0.875rem; margin-bottom: 0.5rem;">
                Layouts help you analyze companies from different angles:
              </p>
              <ul style="font-size: 0.875rem; margin-top: 0.5rem; padding-left: 1.5rem; list-style: disc;">
                <li style="margin-bottom: 0.25rem;"><strong>Compounders (ROIC)</strong> - identify great compounders</li>
                <li style="margin-bottom: 0.25rem;"><strong>Cashflow & Leverage</strong> - assess cash generation and debt</li>
                <li style="margin-bottom: 0.25rem;"><strong>DuPont ROE Decomposition</strong> - understand what drives returns</li>
                <li style="margin-bottom: 0.25rem;"><strong>Return on Risk</strong> - analyze risk-adjusted returns</li>
                <li style="margin-bottom: 0.25rem;"><strong>DCF Valuation</strong> - estimate intrinsic value</li>
                <li style="margin-bottom: 0.25rem;"><strong>Reverse DCF</strong> - understand growth expectations priced in</li>
              </ul>
            `,
            element: '[data-tour="layout-selector"]',
            position: 'bottom',
          },
          {
            intro: `
              <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">Search Companies</h3>
              <p style="font-size: 0.875rem;">
                Use the search to quickly find companies by name or ticker.
                For example, try searching for "Apple" or "AAPL".
              </p>
            `,
            element: '[data-tour="search"]',
            position: 'bottom',
          },
          {
            intro: `
              <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">Add to Watchlist</h3>
              <p style="font-size: 0.875rem; margin-bottom: 0.5rem;">
                Click the star icon next to a company to add it to your personal watchlist.
                This helps you track companies you're interested in.
              </p>
              <p style="font-size: 0.875rem; color: #6b7280;">
                You need to sign in to use the watchlist feature.
              </p>
            `,
            element: '[data-tour="watchlist"]',
            position: 'right',
          },
          {
            intro: `
              <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">Explore Metrics</h3>
              <p style="font-size: 0.875rem;">
                Hover over column headers to see detailed explanations of metrics.
                Each metric has a tooltip with a description.
              </p>
            `,
            element: '[data-tour="columns"]',
            position: 'bottom',
          },
          {
            intro: `
              <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">Unlock Premium</h3>
              <p style="font-size: 0.875rem;">
                Get access to all markets (S&P 500, Nasdaq 100) and all layouts with our Lifetime Deal for just $49.
                This is a one-time payment for lifetime access!
              </p>
            `,
            element: '[data-tour="upgrade"]',
            position: 'left',
          },
        ],
        showProgress: true,
        showBullets: true,
        showStepNumbers: false,
        exitOnOverlayClick: false,
        exitOnEsc: true,
        nextLabel: 'Next',
        prevLabel: 'Back',
        skipLabel: 'Skip',
        doneLabel: 'Finish',
        tooltipClass: 'customIntroJS',
        highlightClass: 'customIntroJSHighlight',
        buttonClass: 'customIntroJSButton',
      });

      // Event handlers
      intro.oncomplete(() => {
        console.log('Tour completed');
        try {
          localStorage.setItem(TOUR_STORAGE_KEY, '1');
          window.dispatchEvent(new CustomEvent('fgs:first-tour-completed'));
        } catch {}
        if (onComplete) onComplete();
        if (onStop) onStop();
      });

      intro.onexit(() => {
        console.log('Tour exited');
        try {
          localStorage.setItem(TOUR_STORAGE_KEY, '1');
        } catch {}
        if (onStop) onStop();
      });

      intro.onchange((targetElement) => {
        console.log('Tour step changed', targetElement);
        // Scroll element into view
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      // Start the tour
      intro.start();

      return () => {
        // Cleanup on unmount
        if (introInstanceRef.current) {
          introInstanceRef.current.exit();
        }
      };
    }
  }, [run, onComplete, onStop]);

  return null; // Intro.js renders its own UI
}

export function useGuidedTour() {
  const [shouldRun, setShouldRun] = React.useState(false);

  React.useEffect(() => {
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
