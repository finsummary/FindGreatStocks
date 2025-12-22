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
      // Prevent page refresh during tour
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // Check if tour is active
        const savedStep = localStorage.getItem('fgs:guided-tour:current-step');
        const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
        
        if (savedStep !== null && !tourCompleted) {
          // Tour is in progress - warn user
          e.preventDefault();
          e.returnValue = 'Вы находитесь в процессе онбординга. Вы уверены, что хотите покинуть страницу?';
          return e.returnValue;
        }
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Check if tour was interrupted by page refresh
      const savedStep = localStorage.getItem('fgs:guided-tour:current-step');
      const wasInterrupted = savedStep !== null;
      
      // Initialize Intro.js
      // @ts-ignore - introJs() returns LegacyIntroJs but we need IntroJs type
      const intro = introJs();
      // @ts-ignore - Type mismatch between LegacyIntroJs and IntroJs
      introInstanceRef.current = intro;

      // Check if mobile device
      const isMobile = window.innerWidth <= 640;

      // Configure Intro.js
      intro.setOptions({
        steps: [
          {
            intro: `
              <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">Learn How to Find Great Undervalued Stocks</h3>
              <p style="font-size: 0.875rem; margin-bottom: 0.5rem;">
                Click the <strong>"Start Here"</strong> button to access our comprehensive guide on how to quickly find great undervalued stocks.
                This guide will walk you through the entire investment analysis process step by step.
              </p>
            `,
            element: '[data-tour="start-here"]',
            position: isMobile ? 'bottom' : 'bottom',
          },
          {
            intro: `
              <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">Choose a Market</h3>
              <p style="font-size: 0.875rem; margin-bottom: 0.5rem;">
                Start by selecting a market to analyze. <strong>Dow Jones</strong> is available for free to all users.
                <strong>S&P 500</strong> and <strong>Nasdaq 100</strong> require a Premium subscription.
              </p>
            `,
            element: '[data-tour="market-selector"]',
            position: isMobile ? 'bottom' : 'bottom',
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
            position: isMobile ? 'bottom' : 'bottom',
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
            position: isMobile ? 'bottom' : 'bottom',
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
            position: isMobile ? 'bottom' : 'right',
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
            position: isMobile ? 'bottom' : 'bottom',
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
            position: isMobile ? 'bottom' : 'left',
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
          localStorage.removeItem('fgs:guided-tour:current-step');
          localStorage.removeItem('fgs:guided-tour:active');
          window.dispatchEvent(new CustomEvent('fgs:first-tour-completed'));
        } catch {}
        // Remove beforeunload listener when tour completes
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (onComplete) onComplete();
        if (onStop) onStop();
      });

      intro.onexit(() => {
        console.log('Tour exited');
        try {
          localStorage.setItem(TOUR_STORAGE_KEY, '1');
          localStorage.removeItem('fgs:guided-tour:current-step');
          localStorage.removeItem('fgs:guided-tour:active');
        } catch {}
        // Remove beforeunload listener when tour exits
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (onStop) onStop();
      });

      intro.onchange((targetElement) => {
        console.log('Tour step changed', targetElement);
        // Save current step to localStorage to survive page refresh
        try {
          // @ts-ignore - currentStep exists but may not be in types
          const currentStep = intro.currentStep || 0;
          localStorage.setItem('fgs:guided-tour:current-step', currentStep.toString());
          // Set explicit flag that tour is active
          localStorage.setItem('fgs:guided-tour:active', '1');
        } catch {}
        
        // Scroll element into view and ensure tooltip is visible
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // On mobile, ensure tooltip is visible after scroll
          const isMobile = window.innerWidth <= 640;
          if (isMobile) {
            setTimeout(() => {
              const tooltip = document.querySelector('.introjs-tooltip') as HTMLElement;
              if (tooltip) {
                // Force fixed positioning at bottom on mobile
                tooltip.style.position = 'fixed';
                tooltip.style.bottom = '20px';
                tooltip.style.top = 'auto';
                tooltip.style.left = '10px';
                tooltip.style.right = '10px';
                tooltip.style.width = 'auto';
                tooltip.style.maxWidth = 'calc(100vw - 20px)';
                tooltip.style.margin = '0';
                tooltip.style.transform = 'none';
                tooltip.style.zIndex = '999999';
                
                // Ensure tooltip content is scrollable if too tall
                const tooltipText = tooltip.querySelector('.introjs-tooltiptext') as HTMLElement;
                if (tooltipText) {
                  const viewportHeight = window.innerHeight;
                  const maxHeight = viewportHeight - 150; // Leave space for buttons and padding
                  tooltipText.style.maxHeight = `${maxHeight}px`;
                  tooltipText.style.overflowY = 'auto';
                }
                
                // Scroll tooltip into view
                tooltip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
              }
            }, 100);
            
            // Also check after a longer delay to catch any late rendering
            setTimeout(() => {
              const tooltip = document.querySelector('.introjs-tooltip') as HTMLElement;
              if (tooltip) {
                tooltip.style.position = 'fixed';
                tooltip.style.bottom = '20px';
                tooltip.style.top = 'auto';
                tooltip.style.left = '10px';
                tooltip.style.right = '10px';
                tooltip.style.width = 'auto';
                tooltip.style.maxWidth = 'calc(100vw - 20px)';
                tooltip.style.margin = '0';
                tooltip.style.transform = 'none';
                tooltip.style.zIndex = '999999';
              }
            }, 500);
          }
        }
      });

      // Mark tour as active before starting
      try {
        localStorage.setItem('fgs:guided-tour:active', '1');
      } catch {}

      // Start the tour
      // If tour was interrupted, start from saved step
      if (wasInterrupted) {
        try {
          const stepIndex = parseInt(savedStep || '0', 10);
          if (!isNaN(stepIndex) && stepIndex > 0) {
            // @ts-ignore - startStep parameter exists but not in types
            intro.start(stepIndex);
          } else {
            intro.start();
          }
        } catch {
          intro.start();
        }
      } else {
        intro.start();
      }

      return () => {
        // Remove beforeunload listener
        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        // Cleanup on unmount
        if (introInstanceRef.current) {
          introInstanceRef.current.exit();
        }
      };
    }
  }, [run, onComplete, onStop]);

  return null; // Intro.js renders its own UI
}

export function useGuidedTour(user?: { id?: string } | null) {
  const [shouldRun, setShouldRun] = React.useState(false);

  React.useEffect(() => {
    // Check if user has completed the tour
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      const savedStep = localStorage.getItem('fgs:guided-tour:current-step');
      
      // If tour was interrupted (saved step exists), restore it
      if (!completed && savedStep !== null) {
        const stepIndex = parseInt(savedStep, 10);
        if (!isNaN(stepIndex) && stepIndex >= 0) {
          // Tour was interrupted - restore it
          setShouldRun(true);
          return;
        }
      }
      
      // Check if mobile warning is open - don't start tour if it is
      const checkMobileWarning = () => {
        try {
          const mobileWarningDismissed = localStorage.getItem('fgs:mobile-warning-dismissed')
          const isMobile = window.innerWidth <= 640
          const isPortrait = window.innerHeight > window.innerWidth
          
          // If mobile warning should be shown and hasn't been dismissed, wait for it to close
          if (isMobile && isPortrait && !mobileWarningDismissed) {
            return false
          }
          return true
        } catch {
          return true
        }
      }

      const startTourIfReady = () => {
        if (!checkMobileWarning()) {
          return false
        }
        
        // Check if required elements exist before starting tour
        const marketSelector = document.querySelector('[data-tour="market-selector"]')
        const layoutSelector = document.querySelector('[data-tour="layout-selector"]')
        if (marketSelector && layoutSelector) {
          setShouldRun(true)
          return true
        }
        return false
      }

      // For new users (logged in but tour not completed), auto-start tour
      if (!completed && user?.id) {
        // Check if tour was already started for this user session
        const tourStartedForUser = localStorage.getItem(`fgs:user:${user.id}:tour-started`)
        if (!tourStartedForUser) {
          // Mark that tour was started for this user
          localStorage.setItem(`fgs:user:${user.id}:tour-started`, '1')
          
          // Listen for mobile warning close event
          const handleMobileWarningClosed = () => {
            setTimeout(() => {
              if (startTourIfReady()) {
                window.removeEventListener('fgs:mobile-warning-closed', handleMobileWarningClosed)
              }
            }, 500)
          }
          window.addEventListener('fgs:mobile-warning-closed', handleMobileWarningClosed)
          
          // Show tour after a delay to let the page and table load
          const timer = setTimeout(() => {
            if (startTourIfReady()) {
              window.removeEventListener('fgs:mobile-warning-closed', handleMobileWarningClosed)
            }
          }, 2000)
          
          return () => {
            clearTimeout(timer)
            window.removeEventListener('fgs:mobile-warning-closed', handleMobileWarningClosed)
          }
        }
      }
      
      // For non-logged-in users or users who have seen home page before
      if (!completed && !user?.id) {
        // Listen for mobile warning close event
        const handleMobileWarningClosed = () => {
          setTimeout(() => {
            if (startTourIfReady()) {
              window.removeEventListener('fgs:mobile-warning-closed', handleMobileWarningClosed)
            }
          }, 500)
        }
        window.addEventListener('fgs:mobile-warning-closed', handleMobileWarningClosed)
        
        // Show tour after a delay to let the page and table load
        const timer = setTimeout(() => {
          if (startTourIfReady()) {
            window.removeEventListener('fgs:mobile-warning-closed', handleMobileWarningClosed)
          }
        }, 2000)
        
        return () => {
          clearTimeout(timer)
          window.removeEventListener('fgs:mobile-warning-closed', handleMobileWarningClosed)
        }
      }
    } catch {
      // If localStorage is not available, don't show tour
    }
  }, [user?.id]);

  const startTour = () => {
    setShouldRun(true);
  };

  const stopTour = () => {
    setShouldRun(false);
  };

  return { shouldRun, startTour, stopTour };
}
