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
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Step 1: Find Great Companies</h3>
            <p className="text-sm mb-2">
              Click on <strong>"Choose Layout"</strong> and select <strong>Compounders (ROIC)</strong> to identify exceptional businesses.
            </p>
            <p className="text-sm mb-2">
              Look for companies with:
            </p>
            <ul className="text-sm space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}>High ROIC (Return on Invested Capital)</li>
              <li style={{ paddingLeft: '0.5rem' }}>High ROIC Stability Score (consistency over 10 years)</li>
            </ul>
            <p className="text-sm mt-2 font-semibold text-emerald-600">
              Please click "Choose Layout" to see the options.
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: false, // Enable beacon to show green dot
        spotlightClicks: true,
      },
      {
        target: '[data-tour="compounders-layout"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Step 1: Find Great Companies</h3>
            <p className="text-sm mb-2">
              Select <strong>Compounders (ROIC)</strong> to identify exceptional businesses.
            </p>
            <p className="text-sm mb-2">
              Look for companies with:
            </p>
            <ul className="text-sm space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}>High ROIC (Return on Invested Capital)</li>
              <li style={{ paddingLeft: '0.5rem' }}>High ROIC Stability Score (consistency over 10 years)</li>
            </ul>
            <p className="text-sm mt-2 font-semibold text-emerald-600">
              Click on Compounders (ROIC) to continue.
            </p>
          </div>
        ),
        placement: 'top',
        disableBeacon: false, // Enable beacon to show green dot
        spotlightClicks: true,
      },
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
            <p className="text-sm mb-2">
              For example, a company with consistently low ROIC around 5% can have a Stability Score of 100 if those values don't fluctuate much year to year.
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
            <p className="text-sm">
              Your watchlist helps you track companies you're interested in analyzing further.
            </p>
          </div>
        ),
        placement: 'right',
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

  // Auto-advance when dropdown opens on step 1
  useEffect(() => {
    if (run && stepIndex === 1 && isDropdownOpen) {
      setTimeout(() => {
        setStepIndex(2);
      }, 100); // Small delay to ensure dropdown is rendered
    }
  }, [run, stepIndex, isDropdownOpen]);

  // Auto-advance when user selects compounders layout on step 2 (dropdown item)
  useEffect(() => {
    if (stepIndex === 2 && selectedLayout === 'compounders' && run) {
      // User selected compounders, advance to step 3 (ROIC % Latest) after a short delay
      setTimeout(() => {
        setStepIndex(3);
      }, 500);
    }
  }, [stepIndex, selectedLayout, run]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, action, type } = data;
    
    // Get current steps for this callback
    const currentSteps = steps;
    
    // Log callback for debugging - log all callbacks to understand what's happening
    console.log('Tour callback:', { type, index, action, status, stepIndex, target: currentSteps[index]?.target, stepsLength: currentSteps.length, run });
    
    // Handle close button click
    if (action === 'close' || status === STATUS.SKIPPED) {
      // Mark tour as completed
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
      } catch {}
      
      // Dispatch event that tour is no longer active
      window.dispatchEvent(new CustomEvent('fgs:investment-tour-step1-inactive'));
      
      // Stop the tour
      if (onStop) {
        onStop();
      }
      
      if (onComplete) {
        onComplete();
      }
      return;
    }
    
    // Handle tour finished - only if we're actually on the last step
    if (status === STATUS.FINISHED) {
      // Only mark as completed if we're on the last step
      if (index === currentSteps.length - 1) {
        try {
          localStorage.setItem(TOUR_STORAGE_KEY, '1');
        } catch {}
        
        // Dispatch event that tour is no longer active
        window.dispatchEvent(new CustomEvent('fgs:investment-tour-step1-inactive'));
        
        // Stop the tour
        if (onStop) {
          onStop();
        }
        
        if (onComplete) {
          onComplete();
        }
        return;
      } else {
        // If FINISHED but not on last step, it's likely an error - continue to next step
        const lastStepIndex = currentSteps.length - 1;
        console.warn('Tour marked as FINISHED but not on last step. Continuing...', { 
          index, 
          lastStepIndex, 
          totalSteps: currentSteps.length,
          target: currentSteps[index]?.target 
        });
        // Don't stop the tour, just continue to next step
        if (index < lastStepIndex) {
          // Wait a bit and then try to continue
          setTimeout(() => {
            setStepIndex(index + 1);
          }, 300);
        }
        return;
      }
    }

    // Update step index when user navigates
    if (type === 'step:after') {
      if (action === 'next') {
        // Block advancement on step 1 if dropdown is not open
        if (index === 1 && !isDropdownOpen) {
          // Reset stepIndex back to 1 to prevent advancement
          requestAnimationFrame(() => {
            setStepIndex(1);
          });
          return;
        }
        // Block advancement on step 2 if layout not selected
        if (index === 2 && selectedLayout !== 'compounders') {
          // Reset stepIndex back to 2 to prevent advancement
          requestAnimationFrame(() => {
            setStepIndex(2);
          });
          return;
        }
        // Allow normal navigation for all other steps
        // Add a delay and check if element exists before advancing
        const nextIndex = index + 1;
        if (nextIndex < currentSteps.length) {
          const nextTarget = currentSteps[nextIndex]?.target;
          if (nextTarget && typeof nextTarget === 'string') {
            // Try to find the element, with retries
            let attempts = 0;
            const maxAttempts = 10;
            const tryAdvance = () => {
              const element = document.querySelector(nextTarget);
              if (element) {
                // Element found, advance to next step
                setStepIndex(nextIndex);
              } else if (attempts < maxAttempts) {
                // Element not found yet, try again
                attempts++;
                setTimeout(tryAdvance, 200);
              } else {
                // Element not found after attempts, but still advance
                console.warn('Element not found after attempts, advancing anyway:', nextTarget);
                setStepIndex(nextIndex);
              }
            };
            // Start trying after a short delay
            setTimeout(tryAdvance, 100);
          } else {
            // No target or invalid target, just advance
            setStepIndex(nextIndex);
          }
        } else {
          // Last step, don't advance
          console.log('Reached last step');
        }
      } else if (action === 'prev') {
        setStepIndex(index - 1);
      }
    } else if (type === 'step:before') {
      // Sync stepIndex with joyride's internal index only if not blocking
      if (index === 1 && !isDropdownOpen) {
        // Keep at step 1 if trying to advance without opening dropdown
        setStepIndex(1);
      } else if (index === 2 && selectedLayout !== 'compounders') {
        // Keep at step 2 if trying to advance without layout selection
        setStepIndex(2);
      } else {
        setStepIndex(index);
      }
    } else if (type === 'error:target_not_found') {
      // If target not found, try to continue anyway (element might be in scrollable area)
      console.warn('Tour target not found for step:', index, 'Target:', currentSteps[index]?.target);
      
      // IMPORTANT: Don't stop the tour - just try to find the element or continue to next step
      // Do NOT call onStop or onComplete here - that would end the tour prematurely
      const targetSelector = currentSteps[index]?.target;
      if (targetSelector && typeof targetSelector === 'string') {
        // Try multiple times to find the element (it might be loading or in a scrollable area)
        let attempts = 0;
        const maxAttempts = 10;
        const findElement = () => {
          const element = document.querySelector(targetSelector);
          if (element) {
            // Element found! Scroll to it and continue to next step
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              if (index < currentSteps.length - 1) {
                console.log('Element found, advancing to next step:', index + 1);
                setStepIndex(index + 1);
              }
            }, 500);
          } else if (attempts < maxAttempts) {
            // Element not found yet, try again after a short delay
            attempts++;
            setTimeout(findElement, 200);
          } else {
            // Element not found after multiple attempts, but continue to next step anyway
            console.warn('Element not found after', maxAttempts, 'attempts, continuing to next step:', index + 1);
            if (index < currentSteps.length - 1) {
              setStepIndex(index + 1);
            }
          }
        };
        findElement();
      } else {
        // No valid target, just continue to next step
        console.warn('No valid target selector, continuing to next step:', index + 1);
        if (index < currentSteps.length - 1) {
          setStepIndex(index + 1);
        }
      }
    }
  };

  // Hide popup when dropdown is open on step 1 or 2 to allow user to see the dropdown menu
  const shouldHidePopup = (stepIndex === 1 || stepIndex === 2) && isDropdownOpen;

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
      spotlightClicks={stepIndex === 1 || stepIndex === 2}
      disableOverlayClose={(stepIndex === 1 || stepIndex === 2) && !isDropdownOpen}
      disableScrolling={false}
      disableOverlay={shouldHidePopup}
      scrollToFirstStep={true}
      scrollOffset={20}
      hideCloseButton={false}
      styles={{
        options: {
          primaryColor: '#10b981', // emerald-500
          zIndex: shouldHidePopup ? 1 : 10000, // Lower z-index when dropdown is open
        },
        tooltip: {
          borderRadius: '8px',
          display: shouldHidePopup ? 'none' : 'block',
          visibility: shouldHidePopup ? 'hidden' : 'visible',
        },
        tooltipContainer: {
          textAlign: 'left',
          display: shouldHidePopup ? 'none' : 'block',
          visibility: shouldHidePopup ? 'hidden' : 'visible',
        },
        overlay: {
          display: shouldHidePopup ? 'none' : 'block',
          visibility: shouldHidePopup ? 'hidden' : 'visible',
        },
        spotlight: {
          // Keep spotlight visible to highlight the Compounders option, but hide when dropdown is open
          display: shouldHidePopup ? 'none' : 'block',
          visibility: shouldHidePopup ? 'hidden' : 'visible',
        },
        buttonNext: {
          backgroundColor: (stepIndex === 1 && !isDropdownOpen) || (stepIndex === 2 && selectedLayout !== 'compounders') ? '#9ca3af' : '#10b981',
          cursor: (stepIndex === 1 && !isDropdownOpen) || (stepIndex === 2 && selectedLayout !== 'compounders') ? 'not-allowed' : 'pointer',
          opacity: (stepIndex === 1 && !isDropdownOpen) || (stepIndex === 2 && selectedLayout !== 'compounders') ? 0.6 : 1,
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
  };

  const stopTour = () => {
    setShouldRun(false);
  };

  return { shouldRun, startTour, stopTour };
}
